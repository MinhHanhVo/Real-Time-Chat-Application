
const User = require("../models/user.model");
const bcryptjs = require('bcryptjs');

module.exports = {
    register: async (req, res) => {
        const { username, password, full_name, email } = req.body;
        try {
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                return res.status(400).json({ message: 'Username hoặc email đã tồn tại' });
            }
            const newUser = new User({ username, password, full_name, email });
            await newUser.save();
            res.status(201).json({ message: 'Đăng ký thành công' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi server', error });
        }
    },
    login: async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(404).json({ message: 'Tài khoản không tồn tại' });
            }
            const isMatch = await bcryptjs.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Mật khẩu không đúng' });
            }
            res.status(200).json(user);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi server', error });
        }
    }
};