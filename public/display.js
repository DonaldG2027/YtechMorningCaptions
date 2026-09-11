const socket = io();

const captionText = document.getElementById('captionText');

socket.on("caption-update", (caption) => {
    captionText.textContent = caption;
});