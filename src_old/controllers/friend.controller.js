const Friendship = require("../models/friendship.model");
const User = require("../models/user.model");

// Gửi lời mời kết bạn
exports.sendFriendRequest = async (req, res) => {
    const { userId, friendId } = req.body;
    console.log('Nhận yêu cầu kết bạn:', { userId, friendId });

    try {
        if (!userId || !friendId) {
            return res.status(400).json({ message: "Thiếu userId hoặc friendId" });
        }

        const requester = await User.findById(userId);
        const recipient = await User.findById(friendId);
        console.log('Requester:', requester, 'Recipient:', recipient);
        if (!requester || !recipient) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        if (userId === friendId) {
            return res.status(400).json({ message: "Không thể gửi lời mời cho chính mình" });
        }

        const existingRequest = await Friendship.findOne({
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId }
            ]
        });
        if (existingRequest) {
            return res.status(400).json({ message: "Đã có quan hệ bạn bè hoặc lời mời trước đó" });
        }

        const friendRequest = new Friendship({
            requester: userId,
            recipient: friendId,
            status: "pending"
        });
        await friendRequest.save();

        res.status(200).json({ message: "Đã gửi lời mời kết bạn" });
    } catch (error) {
        console.error("Lỗi khi gửi lời mời:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
};

// Chấp nhận lời mời kết bạn
exports.acceptFriendRequest = async (req, res) => {
    const { userId, friendId } = req.body;

    try {
        if (!userId || !friendId) {
            return res.status(400).json({ message: "Thiếu userId hoặc friendId" });
        }

        const friendRequest = await Friendship.findOne({
            requester: friendId,
            recipient: userId,
            status: "pending"
        });

        if (!friendRequest) {
            return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
        }

        friendRequest.status = "accepted";
        await friendRequest.save();

        res.status(200).json({ message: "Đã chấp nhận kết bạn" });
    } catch (error) {
        console.error("Lỗi khi chấp nhận lời mời:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
};

// Từ chối lời mời kết bạn
exports.rejectFriendRequest = async (req, res) => {
    const { userId, friendId } = req.body;

    try {
        if (!userId || !friendId) {
            return res.status(400).json({ message: "Thiếu userId hoặc friendId" });
        }

        const friendRequest = await Friendship.findOne({
            requester: friendId,
            recipient: userId,
            status: "pending"
        });

        if (!friendRequest) {
            return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
        }

        friendRequest.status = "rejected";
        await friendRequest.save();

        res.status(200).json({ message: "Đã từ chối lời mời kết bạn" });
    } catch (error) {
        console.error("Lỗi khi từ chối lời mời:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
};

// Lấy danh sách lời mời kết bạn của user
exports.getFriendRequests = async (req, res) => {
    const { userId } = req.params;

    try {
        if (!userId) {
            return res.status(400).json({ message: "Thiếu userId" });
        }

        const requests = await Friendship.find({
            recipient: userId,
            status: "pending"
        }).populate("requester", "full_name _id");

        const requestList = requests.map(req => ({
            _id: req.requester._id,
            full_name: req.requester.full_name
        }));

        res.status(200).json(requestList);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách lời mời:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
};

// Lấy danh sách bạn bè của user
exports.getFriends = async (req, res) => {
    const { userId } = req.params;

    try {
        if (!userId) {
            return res.status(400).json({ message: "Thiếu userId" });
        }

        const friendships = await Friendship.find({
            $or: [
                { requester: userId, status: "accepted" },
                { recipient: userId, status: "accepted" }
            ]
        }).populate("requester recipient", "full_name _id status");

        const friends = friendships.map(friendship => {
            if (friendship.requester._id.toString() === userId) {
                return {
                    _id: friendship.recipient._id,
                    full_name: friendship.recipient.full_name,
                    status: friendship.recipient.status
                };
            } else {
                return {
                    _id: friendship.requester._id,
                    full_name: friendship.requester.full_name,
                    status: friendship.requester.status
                };
            }
        });

        res.status(200).json(friends);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
};