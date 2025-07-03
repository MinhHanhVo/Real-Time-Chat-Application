const accountModel = require("../models/user.model");

// Hàm tìm kiếm user theo full_name
exports.searchUser = async (req, res) => {
    try {
        const searchQuery = req.query.q;

        if (!searchQuery) {
            return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });
        }

        const users = await accountModel.find({
            full_name: { $regex: searchQuery, $options: "i" } // Không phân biệt hoa thường
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error });
    }
};
