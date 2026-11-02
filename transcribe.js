const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");
const { io } = require("socket.io-client");
const { splitIntoCaptions } = require("./services/captionEngine");

const WHISPER_DIR = path.join(
    process.env.USERPROFILE,
    "OneDrive - York County School of Technology",
    "Documents",
    "whisper.cpp"
);

const WHISPER_EXE = path.join(
    WHISPER_DIR,
    "build",
    "bin",
    "Release",
    "whisper-cli.exe"
);

const MODEL_PATH = path.join(WHISPER_DIR, "ggml-base.en.bin");
const AUDIO_PATH = path.resolve("./test/audio.wav");
const TRANSCRIPT_PATH = path.resolve("./test/native-transcript.txt");


async function main() {
    for (const file of [WHISPER_EXE, MODEL_PATH, AUDIO_PATH]) {
        if (!fs.existsSync(file)) {
            throw new Error(`File not found: ${file}`);
        }
    }

    console.log("Running native Whisper...");
    console.log(`Audio: ${AUDIO_PATH}`);

    const result = spawnSync(
        WHISPER_EXE,
        [
            "-m", MODEL_PATH,
            "-f", AUDIO_PATH,
            "-otxt",
            "-of", TRANSCRIPT_PATH.replace(/\.txt$/i, "")
        ],
        {
            cwd: WHISPER_DIR,
            encoding: "utf8",
            windowsHide: true
        }
    );

    if (result.error) {
        throw result.error;
    }

    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.log(result.stderr);

    if (result.status !== 0) {
        throw new Error(`Whisper exited with code ${result.status}`);
    }

    if (!fs.existsSync(TRANSCRIPT_PATH)) {
        throw new Error(`Whisper did not create: ${TRANSCRIPT_PATH}`);
    }

    const transcript = fs.readFileSync(TRANSCRIPT_PATH, "utf8").trim();

    if (!transcript) {
        throw new Error("Whisper returned an empty transcript.");
    }

    const captions = splitIntoCaptions(transcript);

    console.log("\n--- GENERATED CAPTIONS ---\n");
    captions.forEach((caption, index) => {
        console.log(`[Caption ${index + 1}]`);
        console.log(caption);
        console.log();
    });

    const socket = io("http://localhost:3000");

    try {
        await new Promise((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("connect_error", reject);
        });

        console.log("Connected. Sending captions...");

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

        console.log("Finished sending captions.");
    } finally {
        socket.disconnect();
    }
}


main().catch(error => {
    console.error("\n Transcription failed:");
    console.error(error);
    process.exitCode = 1;
});