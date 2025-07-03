// Quản lý quan hệ bạn bè và lời mời kết bạn

const mongoose = require('mongoose');

const friendshipSchema = mongoose.Schema({
    // requester: Người gửi lời mời kết bạn.
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: true
    },
    // recipient: Người nhận lời mời kết bạn.
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: true
    },
    status: {
        type: String,
        // pending: Đang chờ chấp nhận, accepted: Đã là bạn bè, rejected: Từ chối
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true,
    versionKey: false
});

// Đảm bảo mỗi cặp requester-recipient là duy nhất
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model('friendship', friendshipSchema);