// controllers/group.controller.js
const Conversation = require('../models/conversation.model');
const User = require('../models/user.model');
const Message = require('../models/message.model');
const Task = require('../models/task.model'); // Thêm model Task
const fs = require('fs');
const path = require('path');

module.exports = {
    createGroup: async (req, res) => {
        const { userId, groupName, memberIds } = req.body;

        try {
            if (!userId || !groupName || !memberIds || !Array.isArray(memberIds)) {
                return res.status(400).json({ message: 'Thiếu thông tin nhóm hoặc danh sách thành viên' });
            }

            const creator = await User.findById(userId);
            if (!creator) {
                return res.status(404).json({ message: 'Người tạo nhóm không tồn tại' });
            }

            const members = await User.find({ _id: { $in: memberIds } });
            if (members.length !== memberIds.length) {
                return res.status(404).json({ message: 'Một số thành viên không tồn tại' });
            }

            const participants = [...new Set([userId, ...memberIds])];
            const conversation = new Conversation({
                participants,
                isGroup: true,
                groupName,
                admins: [userId]
            });

            await conversation.save();

            res.status(201).json({ message: 'Tạo nhóm thành công', group: conversation });
        } catch (error) {
            console.error('Lỗi tạo nhóm:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    getGroups: async (req, res) => {
        const { userId } = req.params;

        try {
            const groups = await Conversation.find({
                participants: userId,
                isGroup: true
            }).populate('participants', 'full_name _id');

            res.status(200).json(groups);
        } catch (error) {
            console.error('Lỗi lấy danh sách nhóm:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    addMemberToGroup: async (req, res) => {
        const { groupId, userId, newMemberIds } = req.body;

        try {
            if (!groupId || !userId || !newMemberIds || !Array.isArray(newMemberIds)) {
                return res.status(400).json({ message: 'Thiếu thông tin nhóm hoặc thành viên mới' });
            }

            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const newMembers = await User.find({ _id: { $in: newMemberIds } });
            if (newMembers.length !== newMemberIds.length) {
                return res.status(404).json({ message: 'Một số thành viên không tồn tại' });
            }

            const existingMembers = newMemberIds.filter(id => conversation.participants.includes(id));
            if (existingMembers.length > 0) {
                return res.status(400).json({ message: 'Một số thành viên đã ở trong nhóm' });
            }

            conversation.participants.push(...newMemberIds);
            await conversation.save();

            const updatedConversation = await Conversation.findById(groupId).populate('participants', 'full_name _id');

            res.status(200).json({ message: 'Thêm thành viên thành công', group: updatedConversation });
        } catch (error) {
            console.error('Lỗi thêm thành viên:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    getGroupFiles: async (req, res) => {
        const { groupId, userId, type } = req.params;

        try {
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const isLibrary = type === 'library';
            const files = await Message.find({
                conversation: groupId,
                file: { $ne: null },
                isLibraryUpload: isLibrary
            })
                .populate('sender', 'full_name _id')
                .sort({ createdAt: -1 });

            res.status(200).json(files);
        } catch (error) {
            console.error('Lỗi lấy danh sách file:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    deleteGroupFile: async (req, res) => {
        const { groupId, userId, fileId } = req.body;

        try {
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const message = await Message.findById(fileId);
            if (!message || message.conversation.toString() !== groupId || !message.file) {
                return res.status(404).json({ message: 'File không tồn tại' });
            }

            const filePath = path.join(__dirname, '..', 'public', message.file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            message.file = null;
            message.fileName = null;
            await message.save();

            res.status(200).json({ message: 'Xóa file thành công' });
        } catch (error) {
            console.error('Lỗi xóa file:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    uploadLibraryFile: async (req, res) => {
        const { groupId, userId, file, fileName } = req.body;

        try {
            if (!groupId || !userId || !file || !fileName) {
                return res.status(400).json({ message: 'Thiếu thông tin nhóm, người dùng hoặc file' });
            }

            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const base64Data = file.replace(/^data:[\w\/]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filePath = `/Uploads/${safeFileName}`;
            const uploadDir = path.join(__dirname, '..', 'public', 'Uploads');
            fs.writeFileSync(path.join(uploadDir, safeFileName), buffer);

            const message = new Message({
                sender: userId,
                conversation: groupId,
                file: filePath,
                fileName,
                isLibraryUpload: true
            });
            await message.save();

            const populatedMessage = await Message.findById(message._id).populate('sender', 'full_name _id');

            res.status(200).json({ 
                message: 'Upload file thành công', 
                file: populatedMessage 
            });
        } catch (error) {
            console.error('Lỗi upload file:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    getGroupTasks: async (req, res) => {
        const { groupId, userId } = req.params;

        try {
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const tasks = await Task.find({ conversation: groupId })
                .populate('creator', 'full_name _id')
                .sort({ createdAt: -1 });

            res.status(200).json(tasks);
        } catch (error) {
            console.error('Lỗi lấy danh sách công việc:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    createTask: async (req, res) => {
        const { groupId, userId, title, description } = req.body;

        try {
            if (!groupId || !userId || !title) {
                return res.status(400).json({ message: 'Thiếu thông tin nhóm, người dùng hoặc tiêu đề công việc' });
            }

            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const task = new Task({
                title,
                description,
                conversation: groupId,
                creator: userId
            });
            await task.save();

            const populatedTask = await Task.findById(task._id).populate('creator', 'full_name _id');

            res.status(201).json({ message: 'Tạo công việc thành công', task: populatedTask });
        } catch (error) {
            console.error('Lỗi tạo công việc:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    updateTask: async (req, res) => {
        const { groupId, userId, taskId, title, description, isCompleted } = req.body;

        try {
            if (!groupId || !userId || !taskId) {
                return res.status(400).json({ message: 'Thiếu thông tin nhóm, người dùng hoặc công việc' });
            }

            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const task = await Task.findById(taskId);
            if (!task || task.conversation.toString() !== groupId) {
                return res.status(404).json({ message: 'Công việc không tồn tại' });
            }

            task.title = title || task.title;
            task.description = description || task.description;
            task.isCompleted = typeof isCompleted === 'boolean' ? isCompleted : task.isCompleted;
            await task.save();

            const populatedTask = await Task.findById(task._id).populate('creator', 'full_name _id');

            res.status(200).json({ message: 'Cập nhật công việc thành công', task: populatedTask });
        } catch (error) {
            console.error('Lỗi cập nhật công việc:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    deleteTask: async (req, res) => {
        const { groupId, userId, taskId } = req.body;

        try {
            if (!groupId || !userId || !taskId) {
                return res.status(400).json({ message: 'Thiếu thông tin nhóm, người dùng hoặc công việc' });
            }

            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            if (!conversation.participants.includes(userId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên nhóm' });
            }

            const task = await Task.findById(taskId);
            if (!task || task.conversation.toString() !== groupId) {
                return res.status(404).json({ message: 'Công việc không tồn tại' });
            }

            await task.deleteOne();

            res.status(200).json({ message: 'Xóa công việc thành công' });
        } catch (error) {
            console.error('Lỗi xóa công việc:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }
};