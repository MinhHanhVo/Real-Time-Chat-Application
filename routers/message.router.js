const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");

router.get("/messages", messageController.getMessages);
router.get("/pendingMessages", messageController.getPendingMessages);

module.exports = router;