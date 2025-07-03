import mongoose from "mongoose";
import 'dotenv/config';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL);
        console.log(`MongoDB connected ${conn.connection.host}`);

    } catch (error) {
        console.log("MongoDB connection error:", error.message);
    }
}
export default connectDB;