// controllers/conversation.controller.js
const Conversation = require('../models/conversation.model');

module.exports = {
    createConversation: async (req, res) => {
        const { participants } = req.body;

        try {
            if (!participants || !Array.isArray(participants) || participants.length < 2) {
                return res.status(400).json({ message: 'Cần ít nhất 2 thành viên' });
            }

            const conversation = await Conversation.findOne({
                participants: { $all: participants, $size: participants.length },
                isGroup: false
            });

            if (conversation) {
                return res.status(200).json({ conversation });
            }

            const newConversation = new Conversation({ participants });
            await newConversation.save();

            res.status(201).json({ conversation: newConversation });
        } catch (error) {
            console.error('Lỗi tạo conversation:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }
};