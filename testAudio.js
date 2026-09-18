const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const input = "./test/1000100202.mp4";
const output = "./test/audio.wav";

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