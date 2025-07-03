import express from 'express';
import 'dotenv/config';
import authRoutes from './routes/auth.route.js';
import connectDB from './lib/db.js';


const app = express();
const PORT = process.env.PORT;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
})