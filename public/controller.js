const socket = io();

const captionInput = document.getElementById("captionInput");
const statusDisplay = document.getElementById("statusDisplay")
const sendButton = document.getElementById("sendButton");
const clearButton = document.getElementById("clearButton");
const clearHistoryButton = document.getElementById("clearHistoryButton");

const status = document.getElementById("status");
const previewText = document.getElementById("previewText");
const characterCount = document.getElementById("characterCount");
const captionHistory = document.getElementById("captionHistory");

/* ======================
    CONNECTION
======================*/

socket.on('connect', () => {
    statusDisplay.textContent = '🟢 Connected';
});

socket.on('disconnect', () => {
    statusDisplay.textContent = '🔴 Disconnected';
});

/* ======================
    Live Preview
======================*/
captionInput.addEventListener("input", () => {
    const text = captionInput.value;

    characterCount.textContent = `${text.length} characters`;
    if (text.trim() === "") {
        previewText.textContent = "Captions will appear here.";

        return;
    }

    previewText.textContent = formatCaption(text);
});
/* ======================
    Send Caption
======================*/
function sendCaption() {
    const caption = captionInput.value.trim();
    if (caption === "") {
        return;
    }
    console.log("Before format:", caption)
    console.log("After format:", formatCaption(caption))
    socket.emit("send-caption", formatCaption(caption));

    captionInput.value ="";

    characterCount.textContent = "0 characters";
}
sendButton.addEventListener("click", sendCaption);

/* ======================
    Clear Display
======================*/
clearButton.addEventListener("click", () => {
    socket.emit("clear-caption");
    previewText.textContent = "Captions will appear here.";
});
/* ======================
    Keyboard Shortcut
======================*/
captionInput.addEventListener("keydown", (event) => {
    if(event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        sendCaption();
    }
});
/* ======================
    Recieve Caption
======================*/
socket.on("caption-update", (caption) => {
    if (caption === "") {
        previewText.textContent = "Captions will appear here.";
        return;
    }
    previewText.textContent = caption;
});
/* ======================
    Caption History
======================*/

socket.on("caption-history", (history) => {
    renderHistory(history);
});

function renderHistory(history) {
    captionHistory.innerHTML = "";

    if (history.length === 0) {
        captionHistory.innerHTML = `<p class="empty-history">No captions yet.</p>`;

        return;
    }

    history.forEach((item) => {
        const historyItem = document.createElement("div");

        historyItem.className = "history-item";

        historyItem.innerHTML = `
            <div class="history-text">
                ${item.text}
                
            </div>
            
            <div class="history-time>
                ${item.time}
            </div>
        `;

        captionHistory.appendChild(historyItem);
    
    });
};
/* ======================
    Clear History
======================*/
clearHistoryButton.addEventListener("click", () => {
    captionHistory.innerHTML=`
        <p class="empty-history">History will clear when the server is restarted for now.</p>
    `;
});
/* ======================
    Format Caption
======================*/

function formatCaption(text) {
    const words = text.trim().split(/\s+/);
    const MAX_LINE_LENGTH = 40;
    let lineOne = "";
    let lineTwo = "";

    for (const word of words) {
        if((lineOne + " " +word).trim().length <= MAX_LINE_LENGTH) {
            lineOne = (lineOne + " " + word).trim();
        } else {
            lineTwo = (lineTwo + " " + word).trim();
        }
    }
    if (lineTwo === "") {
        return lineOne;
    }
    return `${lineOne}\n${lineTwo}`;
}