import { Server } from "socket.io";
import http from 'http';
import express from 'express';


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
        credentials: true,
    }
})

// online user
const userSocketMap = {}; //{userId= socketId}

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;
    // io.emit()
    io.emit("getOnlineUsers", Object.keys(userSocketMap));


    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
})

const getReceiverSocketId = (userId) => {
    return userSocketMap[userId];
}

export { io, app, server, getReceiverSocketId };