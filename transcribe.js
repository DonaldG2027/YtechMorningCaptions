const fs = require("fs");
const wavefile = require("wavefile");
const { pipeline } = require("@huggingface/transformers");

async function main() {
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

    console.log("\n--- TRANSCRIPTION ---");
    console.log(result.text);
    console.log("---------------------");
}

main().catch(error => {
    console.error("\n Trascription failed:");
    console.error(error);
});