const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const userSchema = mongoose.Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    avatar: {
        type: String, // URL hoặc đường dẫn đến ảnh đại diện
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

// Mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcryptjs.hash(this.password, 10);
    }
    next();
});

module.exports = mongoose.model('account', userSchema);