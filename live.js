const childProcess = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");
const { pipeline } = require("@huggingface/transformers");
const { io } = require("socket.io-client");
const { splitIntoCaptions } = require("./services/captionEngine");
const input = process.env.LIVE_INPUT || "./test/audio.wav";
const captionServerUrl = process.env.CAPTION_SERVER_URL || "http://localhost:3000";
const inputFormat = (process.env.LIVE_INPUT_FORMAT || "auto").toLowerCase();
const whisperModel = process.env.WHISPER_MODEL || "Xenova/whisper-base.en";
const minChunkRms = Number(process.env.MIN_CHUNK_RMS || 0.0075);

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const CHUNK_SECONDS = 5;

const CHUNK_SIZE = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * CHUNK_SECONDS;

function buildFfmpegArgs() {
    if (inputFormat === "dshow") {
        return [
            "-f", "dshow",
            "-i", input,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-f", "s16le",
            "pipe:1"
        ];
    }

    return [
        "-fflags", "nobuffer",
        "-flags", "low_delay",
        "-i", input,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        "-f", "s16le",
        "pipe:1"
    ];
}

function getRms(floatArray) {
    let sum = 0;
    for (let i = 0; i < floatArray.length; i++) sum += floatArray[i] * floatArray[i];
    return Math.sqrt(sum / floatArray.length);
}

async function main() {
    console.log("Loading Whisper model...");

    const transcriber = await pipeline("automatic-speech-recognition", whisperModel);

    console.log("Whisper ready.");
    console.log("Connecting to caption server...");

    const socket = io(captionServerUrl);

    await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
    });

    console.log("Connected to caption server.");
    console.log("Starting live audio stream...");

    const ffmpeg = childProcess.spawn(ffmpegPath, buildFfmpegArgs());

    let audioBuffer = Buffer.alloc(0);
    let chunkNumber = 0;
    let transcriptionQueue = Promise.resolve();

    function enqueueTranscription(chunk, number) {
        transcriptionQueue = transcriptionQueue
            .then(() => transcribeChunk(
                chunk,
                number,
                transcriber,
                socket
            ))
            .catch(error => {
                console.error(`Chunk ${number} failed:`, error);
            });
    }

    ffmpeg.stdout.on("data", (data) => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.subarray(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.subarray(CHUNK_SIZE);

            chunkNumber++;

            enqueueTranscription(chunk, chunkNumber);
        }
    });

    ffmpeg.stderr.on("data", (data) => {
        process.stderr.write(data);
    });

    ffmpeg.on("close", async (code) => {
        console.log(`FFmpeg finished with code ${code}.`);

        if (audioBuffer.length > 0) {
            const finalChunk = audioBuffer;
            audioBuffer = Buffer.alloc(0);
            
            chunkNumber++;

            enqueueTranscription(finalChunk, chunkNumber);
        }
        await transcriptionQueue;
        socket.disconnect();
        
        console.log("Live transcription finished.");
    });
}


async function transcribeChunk(buffer, chunkNumber, transcriber, socket) {
    console.log(`\n--- Chunk ${chunkNumber} ---`);
    console.log("Transcribing...");

    const sampleCount = Math.floor(buffer.length / 2);

    const int16Samples = new Int16Array(buffer.buffer, buffer.byteOffset, sampleCount);

    const audioData = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
        audioData[i] = int16Samples[i] / 32768;
    }

    const rms = getRms(audioData);

    if (rms < minChunkRms) {
        console.log(`Skipped chunk ${chunkNumber} (RMS${rms.toFixed(5)} < ${minChunkRms})`);
        return;
    } 
    const result = await transcriber(audioData);

    const text = result.text.trim();

    console.log(`Transcript: ${text || "(nothing detected)"}`);

    if (!text) {
        return;
    }

    const captions = splitIntoCaptions(text);

    for (const caption of captions) {
        socket.emit("send-caption", caption);

        console.log("Sent caption:");
        console.log(caption);
    }
}

main().catch(error => {
    console.error("\nLive transcription failed:");
    console.error(error);
});