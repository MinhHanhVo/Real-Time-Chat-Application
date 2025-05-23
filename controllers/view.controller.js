
const User = require("../models/user.model");

module.exports = {
    renderChat: async (req, res) => {
        const userId = req.query.userId; // Lấy userId từ query parameter

        // Nếu không có userId, chuyển hướng về login
        if (!userId) {
            return res.redirect('/login');
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.redirect('/login');
            }
            // Render chat.ejs với userId
            res.render("chat", { userId: user._id });
        } catch (error) {
            console.error("Lỗi khi render chat:", error);
            res.status(500).send("Lỗi server");
        }
    }
};