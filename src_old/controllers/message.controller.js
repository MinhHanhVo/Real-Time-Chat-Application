// controllers/message.controller.js
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

module.exports = {
    getMessages: async (req, res) => {
        const { sender, conversationId } = req.query;

        try {
            if (!sender || !conversationId) {
                return res.status(400).json({ message: 'Thiếu sender hoặc conversationId' });
            }

            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Cuộc trò chuyện không tồn tại' });
            }

            if (!conversation.participants.some(id => id.toString() === sender)) {
                return res.status(403).json({ message: 'Bạn không có quyền truy cập cuộc trò chuyện này' });
            }

            const messages = await Message.find({ conversation: conversationId })
                .sort({ createdAt: 1 })
                .populate('sender', 'username full_name');

            console.log('Tin nhắn tìm thấy:', messages.length);
            res.status(200).json(messages);
        } catch (error) {
            console.error('Lỗi khi lấy tin nhắn:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    getPendingMessages: async (req, res) => {
        const { userId } = req.query;

        try {
            if (!userId) {
                return res.status(400).json({ message: 'Thiếu userId' });
            }

            const messages = await Message.find({
                receiver: userId,
                isPending: true
            })
                .populate('sender', 'username full_name')
                .sort({ createdAt: -1 });

            res.status(200).json(messages);
        } catch (error) {
            console.error('Lỗi khi lấy tin nhắn chờ:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }
};