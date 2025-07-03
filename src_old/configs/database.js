const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        // await mongoose.connect("mongodb+srv://hanhvo:hanhvo@cluster0.cm2qrjc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
        await mongoose.connect('mongodb://127.0.0.1:27017/appchat');
    } catch (error) {
        console.log(error.message);
    }
}
module.exports = connectDB;