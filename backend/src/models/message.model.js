import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            require: true,
            ref: "User",
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            require: true,
            ref: "User",
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
        },
    },
    { timestamps: true }
)

const Message = mongoose.model("Message", messageSchema);
export default Message;
