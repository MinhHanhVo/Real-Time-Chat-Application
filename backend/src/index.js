import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';

import cors from "cors";

import path from 'path';

import authRoutes from './routes/auth.route.js';
import messageRoutes from "./routes/message.route.js";
import seedUsers from './seeds/user.seed.js';


import connectDB from './lib/db.js';
import { app, server } from './lib/socket.js';
import User from './models/user.model.js';


const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use(cors(
    {
        origin: "http://localhost:5173",
        credentials: true
    }
));


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
    });
}

app.get('/', (req, res) => {
    res.send('Hello World')
})

const checkAndSeedUsers = async () => {
    const count = await User.countDocuments();
    if (count === 0) {
        await User.insertMany(seedUsers);
        console.log("Seeded default users.");
    } else {
        console.log("Users already exist. Skipping seeding.");
    }
};

server.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
    await checkAndSeedUsers();
})
