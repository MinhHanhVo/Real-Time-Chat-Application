// conversation.model.js
const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'message' },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('conversation', conversationSchema);