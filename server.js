const { formatCaption }= require("./services/captionEngine");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// polished captions

let currentCaption = "";
const captionHistory = [];
const MAX_HISTORY = 20;

app.use(express.static('public'));

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.emit("caption-update", currentCaption);

    socket.emit("caption-history", captionHistory);

    socket.on("send-caption", (caption) => {
        currentCaption = formatCaption(caption);
        
        console.log("Caption:", caption);

        captionHistory.unshift({
            text: caption,
            time: new Date().toLocaleTimeString()
        });

        if (captionHistory.length > MAX_HISTORY) {
            captionHistory.pop();
        }
        io.emit("caption-update", caption);

        io.emit("caption-history", captionHistory)
    });

    socket.on("clear-caption", () => {
        currentCaption = "";
        
        io.emit("caption-update", "");
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});
server.listen(PORT, () => {
    const networkAddresses = Object.values(os.networkInterfaces())
        .flat()
        .filter(address => address && address.family === "IPv4" && !address.internal)
        .map(address => `http://${address.address}:${PORT}`);

    console.log(`Morning Captions running at:`);
    console.log(`Controller: http://localhost:${PORT}/controller.html`);
    console.log(`Display: http://localhost:${PORT}/display.html`);
    networkAddresses.forEach(address => {
        console.log(`Network: ${address}/controller.html`);
    });
});