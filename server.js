const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static('public'));

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("send-caption", (caption) => {
        console.log("Caption:", caption);

        io.emit("caption-update", caption);
    });

    socket.on("clear-caption", () => {
        io.emit("caption-update", "");
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});
server.listen(PORT, () => {
    console.log(`Morning Captions running at:`);
    console.log(`http://localhost:${PORT}`);
    console.log(`Controller: http://localhost:${PORT}/controller.html`);
    console.log(`Display: http://localhost:${PORT}/display.html`);
});