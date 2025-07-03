const mongoose = require('mongoose');

const reminderSchema = mongoose.Schema({
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'conversation', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true },
    time: { type: Date, required: true },
    content: { type: String, required: true },
    isTriggered: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('reminder', reminderSchema);