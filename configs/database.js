const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://hanhvo:hanhvo@cluster0.cm2qrjc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")

        // await mongoose.connect("mongodb+srv://hanhvo:vWc8YirNS@w2S@Y@cluster0.c9mll3j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")

    } catch (error) {
        console.log(error.message);
    }
}
module.exports = connectDB;