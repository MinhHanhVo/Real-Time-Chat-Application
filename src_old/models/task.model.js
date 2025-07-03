// models/task.model.js
const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    isCompleted: { type: Boolean, default: false },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'conversation', required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('task', taskSchema);