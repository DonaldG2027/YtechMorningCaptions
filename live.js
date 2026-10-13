const childProcess = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");
const { pipeline } = require("@huggingface/transformers");
const { io } = require("socket.io-client");
const { splitIntoCaptions } = require("./services/captionEngine");
const input = "./test/1000100477.mp4";

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const CHUNK_SECONDS = 5;

const CHUNK_SIZE = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * CHUNK_SECONDS;


async function main() {
    console.log("Loading Whisper model...");

    const transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en");

    console.log("Whisper ready.");
    console.log("Connecting to caption server...");

    const socket = io("http://localhost:3000");

    await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
    });

    console.log("Connected to caption server.");
    console.log("Starting live audio stream...");

    const ffmpeg = childProcess.spawn(ffmpegPath, [
        "-re",
        "-i", input,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        "-f", "s16le",
        "pipe:1"
    ]);

    let audioBuffer = Buffer.alloc(0);
    let chunkNumber = 0;

    ffmpeg.stdout.on("data", async (data) => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.subarray(0, CHUNK_SIZE);

            audioBuffer = audioBuffer.subarray(CHUNK_SIZE);

            chunkNumber++;

            await transcribeChunk(
                chunk,
                chunkNumber,
                transcriber,
                socket
            );
        }
    });

    ffmpeg.stderr.on("data", () => {
        // ignoring ffmpeg output status
    });

    ffmpeg.on("close", async (code) => {
        console.log(`FFmpeg finished with code ${code}.`);

        if (audioBuffer.length > 0) {
            chunkNumber++;

            await transcribeChunk(
                audioBuffer,
                chunkNumber,
                transcriber,
                socket
            );
        }
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