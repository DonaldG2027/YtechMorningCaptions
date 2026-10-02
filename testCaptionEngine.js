const assert = require("assert");
const { splitIntoCaptions } = require("./services/captionEngine");

const testTranscripts = [
    "Alright, hello. So basically we have some good news and some bad news. The good news is the experiment was a success and now we have Kayden as a super mechatronic device or whatever. Don't worry, we didn't mutate him or whatever, but he's cool. The bad news is he's gonna kill.",
    "GOOOOOOD MORNING YORK TECH! There are no additional announcements except - let's make it a great day. Please tune into Spartan TV.",
    "This is a short test. "
];

for (const transcript of testTranscripts) {
    const captions = splitIntoCaptions(transcript);

    const reconstructed = captions.join(" ").replace(/\s+/g, " ").trim();

    const expected = transcript.replace(/\s+/g, " ").trim();

    assert.strictEqual(reconstructed, expected);

    for (const caption of captions) {
        const lines = caption.split("\n");

        assert(lines.length <= 2, "Caption has more than 2 lines");

        for (const line of lines) {
            assert(line.length <= 40,`Line exceeds 40 characters: "${line}"`);
        }
    }
}

assert.deepStrictEqual(splitIntoCaptions(""), []);

console.log("Caption engine tests passed!");