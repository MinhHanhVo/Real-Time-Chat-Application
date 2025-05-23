const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'conversation', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'account' },
    content: { type: String },
    file: { type: String },
    fileName: { type: String },
    isPending: { type: Boolean, default: false },
    isLibraryUpload: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'account' }], // Danh sách người đã đọc
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('message', messageSchema);