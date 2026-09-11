const socket = io();

const captionInput = document.getElementById('captionInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const statusDisplay = document.getElementById('status');

socket.on('connect', () => {
    statusDisplay.textContent = '🟢 Connected';
});

socket.on('disconnect', () => {
    statusDisplay.textContent = '🔴 Disconnected';
});

sendButton.addEventListener('click', () => {
    const caption = captionInput.value.trim();
    if (caption === "") {
        return;
    }
    socket.emit("send-caption", caption);
});

clearButton.addEventListener('click', () => {

    captionInput.value = "";
    socket.emit("clear-caption");
});

captionInput.addEventListener('keydown', (event) => {
    if (event.key && event.key === 'Enter') {
        sendButton.click();
    }

});
