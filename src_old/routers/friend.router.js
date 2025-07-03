
const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friend.controller");

router.post("/send", friendController.sendFriendRequest); // Gửi lời mời kết bạn
router.post("/accept", friendController.acceptFriendRequest); // Chấp nhận kết bạn
router.post("/reject", friendController.rejectFriendRequest); // Từ chối kết bạn
router.get("/requests/:userId", friendController.getFriendRequests); // Lấy danh sách lời mời
router.get("/:userId", friendController.getFriends);

module.exports = router;
