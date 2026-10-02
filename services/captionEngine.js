const MAX_LINE_LENGTH = 40;
const MAX_LINES = 2;

function wrapText(text) {
    if (!text || !text.trim()) {
        return [];
    }

    const words = text.trim().split(/\s+/);
    const lines = [];
    let currentLine = "";

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;

        if (testLine.length <= MAX_LINE_LENGTH) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
            }

            currentLine = word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

function formatCaption(text) {
    return wrapText(text).slice(0, MAX_LINES).join("\n");
}

function splitIntoCaptions(text) {
    const lines = wrapText(text);
    const captions = [];

    for (let i = 0; i < lines.length; i += MAX_LINES) {
        captions.push(
            lines.slice(i, i + MAX_LINES).join("\n")
        );
    }

    return captions;
}

module.exports = {
    formatCaption,
    splitIntoCaptions
};