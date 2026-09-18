const MAX_LINE_LENGTH = 40;
const MAX_LINES = 2;

// formatting text into caption sized lines
function formatCaption(text) {
    if(!text || !text.trim()) {
        return "";
    }

    const words = text.trim().split(/\s+/);

    // const lines
    const lines = [];
    let currentLine = "";
    for (const word of words) {
        const testLine = currentLine === "" ? word : `${currentLine} ${word}`;

        if (testLine.length <= MAX_LINE_LENGTH) {
            currentLine = testLine;
        } else {
            if (currentLine !== "") {
                lines.push(currentLine);
            }
            currentLine = word;
        }
    }
    if (currentLine !== "") {
        lines.push(currentLine);
    }

    if (lines.length > MAX_LINES) {
        const firstLine = lines[0];
        const secondLine = lines.slice(1).join(" ");

        return `${firstLine}\n${secondLine}`;
    }
    return lines.join("\n");
}

module.exports = formatCaption;