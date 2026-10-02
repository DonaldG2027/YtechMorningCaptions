const fs = require("fs");
const childProcess = require("node:child_process");
const { io } = require("socket.io-client");
const { splitIntoCaptions } = require("./services/captionEngine");
const wavefile = require("wavefile");
const { pipeline } = require("@huggingface/transformers");

async function main() {
    const server = childProcess.spawn("node", ["server.js"], { stdio: "inherit" });

    console.log("Loading Whisper model...");

    const transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en"
    );

    console.log("Loading audio...");
    
    const buffer = fs.readFileSync("./test/audio.wav");
    const wav = new wavefile.WaveFile(buffer);

    // 16 kHz audio since thats what whisper expects
    wav.toSampleRate(16000);

    // convert PC audio to Float32
    wav.toBitDepth("32f");

    let audioData = wav.getSamples();

    if (Array.isArray(audioData)) {
        audioData = audioData[0];
    }

    console.log("Transcribing...");

    const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5
    });

    const captions = splitIntoCaptions(result.text);
    
    console.log("\n--- GENERATED CAPTIONS ---\n");

    captions.forEach((caption, index) => {
        console.log(`[Caption ${index + 1}]`);
        console.log(caption);
        console.log();
    });

    // socket io stuff
    const socket = io("http://localhost:3000");
    await new Promise ((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
    });
    console.log("Connected to captions server. Sending captions...");

    function getCaptionDurationMs(caption) {
    const words = caption.trim().split(/\s+/).length;
    const endsSentence = /[.!?]["')\]]?$/.test(caption.trim());

    const duration = 1200 + words * 300 + (endsSentence ? 500 : 0);

    return Math.min(6000, Math.max(2500, duration));
}

    for (const caption of captions) {
        const duration = getCaptionDurationMs(caption);

        socket.emit("send-caption", caption);
        console.log(`Showing caption for ${duration / 1000}s`);

        await new Promise(resolve => setTimeout(resolve, duration));
    }
    
    socket.disconnect();
    console.log("Finished sending captions.")
}

main().catch(error => {
    console.error("\n Transcription failed:");
    console.error(error);
});