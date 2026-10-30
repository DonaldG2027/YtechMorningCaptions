const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

const input = "./test/20260922_231023.mp4";
const output = "./test/audio.wav";

console.log("Working directory:", process.cwd());
console.log("Input file path:", path.resolve(input));
console.log("Output file path:", path.resolve(output));
ffmpeg.setFfmpegPath(ffmpegPath);

console.log("Extracting audio...");

ffmpeg (input)
    .noVideo()
    .audioCodec("pcm_s16le")
    .audioFrequency(16000)
    .audioChannels(1)
    .format("wav")
    .on("start", command => {
        console.log("FFmpeg started:");
        console.log(command);
    })
    .on("end", () => {
        console.log("Audio extraction complete!");
        console.log(`Created: ${output}`);
    })
    .on("error", error => {
        console.error("FFmpeg error:");
        console.error(error.message);
    })
    .save(output);