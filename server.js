const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./configs/database');
const router = require('./routers');
const Message = require('./models/message.model');
const Conversation = require('./models/conversation.model');
const Friendship = require('./models/friendship.model');
const User = require('./models/user.model'); // Thêm để lấy thông tin người gửi
const Task = require('./models/task.model'); // Thêm model Task
const { censorContent } = require('./utils/censor'); // Import hàm kiểm duyệt
// Thêm model Reminder để lưu nhắc nhở
const Reminder = require('./models/reminder.model');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

connectDB();
router(app);

app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: 'Route not found' });
    }
    res.status(404).send('Page not found');
});

// Hàm phân tích thời gian và nội dung nhắc nhở
const parseReminder = (content) => {
    if (!content) return null;
    const timeRegex = /(\d{1,2}):(\d{2})\s*(.*?)$/;
    const match = content.match(timeRegex);
    if (!match) return null;

    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const reminderContent = match[3].trim();

    // Kiểm tra thời gian hợp lệ
    if (!reminderContent || hours > 23 || minutes > 59) return null;

    const now = new Date();
    const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    // Nếu thời gian đã qua, đặt cho ngày mai
    if (reminderTime <= now) {
        reminderTime.setDate(now.getDate() + 1);
    }

    // Thêm kiểm tra để không kích hoạt ngay nếu thời gian chưa tới
    if ((reminderTime - now) < 1000) {
        return null;
    }

    return { time: reminderTime, content: reminderContent };
};

// Kiểm tra nhắc nhở mỗi giây thay vì liên tục
setInterval(async () => {
    try {
        const now = new Date();
        // Tìm nhắc nhở chưa kích hoạt, trong khoảng 1 giây hiện tại
        const reminders = await Reminder.find({
            isTriggered: false,
            time: {
                $gte: new Date(now.getTime() - 1000), // Từ 1 giây trước
                $lte: now // Đến hiện tại
            }
        });

        for (const reminder of reminders) {
            io.to(reminder.user.toString()).emit('reminderAlert', {
                content: reminder.content,
                time: reminder.time
            });
            reminder.isTriggered = true;
            await reminder.save();
            console.log(`Gửi nhắc nhở cho user ${reminder.user}: ${reminder.content} vào ${reminder.time}`);
        }
    } catch (error) {
        console.error('Lỗi kiểm tra nhắc nhở:', error);
    }
}, 1000);




io.on('connection', (socket) => {
    console.log('Có người kết nối');

    socket.on('join', ({ userId }) => {
        socket.join(userId);
        console.log(`User ${userId} đã tham gia`);
    });

    socket.on('sendMessage', async ({ senderId, conversationId, content, file, fileName }) => {
        try {
            if (!senderId || !conversationId) {
                throw new Error('Thiếu senderId hoặc conversationId');
            }

            if (!content && !file) {
                throw new Error('Tin nhắn phải có nội dung hoặc file');
            }

            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Cuộc trò chuyện không tồn tại');
            }

            const censoredContent = censorContent(content);
            const containsBadWords = censoredContent !== content;

            let filePath = null;
            if (file) {
                const base64Data = file.replace(/^data:[\w\/]+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                filePath = `/Uploads/${safeFileName}`;
                fs.writeFileSync(path.join(uploadDir, safeFileName), buffer);
                console.log('File saved at:', filePath);
            }

            const messageData = {
                sender: senderId,
                conversation: conversationId,
                content: censoredContent || '',
                file: filePath,
                fileName,
                isPending: false,
                readBy: [senderId]
            };

            if (!conversation.isGroup && conversation.participants.length === 2) {
                const receiverId = conversation.participants.find(id => id.toString() !== senderId);
                messageData.receiver = receiverId;

                const friendship = await Friendship.findOne({
                    $or: [
                        { requester: senderId, recipient: receiverId, status: 'accepted' },
                        { requester: receiverId, recipient: senderId, status: 'accepted' }
                    ]
                });
                messageData.isPending = !friendship;
            }

            const message = new Message(messageData);
            await message.save();

            conversation.lastMessage = message._id;
            await conversation.save();

            const populatedMessage = await Message.findById(message._id).populate('sender', 'username full_name');

            // Gửi tin nhắn đến tất cả người tham gia
            conversation.participants.forEach(participant => {
                io.to(participant.toString()).emit(conversation.isGroup ? 'receiveGroupMessage' : 'receiveMessage', populatedMessage);
            });

            // Xử lý nhắc nhở
            const reminderInfo = parseReminder(content);
            if (reminderInfo) {
                // Xác định người nhận: nhóm thì gửi cho tất cả, 1-1 thì gửi cho người nhận
                const participants = conversation.isGroup
                    ? conversation.participants
                    : [conversation.participants.find(id => id.toString() !== senderId)];
                for (const userId of participants) {
                    const reminder = new Reminder({
                        conversation: conversationId,
                        user: userId,
                        time: reminderInfo.time,
                        content: reminderInfo.content
                    });
                    await reminder.save();
                    console.log(`Lưu nhắc nhở cho user ${userId}: ${reminderInfo.content} vào ${reminderInfo.time}`);
                }
            }
            // --------------------------------------

            // Gửi thông báo tin nhắn mới đến người nhận (không phải người gửi)
            conversation.participants.forEach(participant => {
                if (participant.toString() !== senderId) {
                    io.to(participant.toString()).emit('newMessageNotification', {
                        senderId,
                        conversationId,
                        senderName: populatedMessage.sender.full_name,
                        content: censoredContent ? censoredContent.substring(0, 20) + '...' : `Đã gửi file: ${fileName}`,
                        isGroup: conversation.isGroup,
                        groupName: conversation.isGroup ? conversation.groupName : null
                    });
                }
            });

            if (conversation.isGroup && filePath) {
                const sender = await User.findById(senderId).select('full_name');
                conversation.participants.forEach(participant => {
                    io.to(participant.toString()).emit('newFileAdded', {
                        groupId: conversationId,
                        fileId: message._id,
                        fileName,
                        filePath,
                        sender: sender.full_name,
                        createdAt: message.createdAt
                    });
                });
            }

            if (containsBadWords) {
                io.to(senderId).emit('messageCensored', {
                    message: 'Tin nhắn của bạn chứa từ không phù hợp và đã được kiểm duyệt.'
                });
            }
        } catch (error) {
            console.error('Lỗi gửi tin nhắn:', error.message);
        }
    });

    // Sự kiện đánh dấu tin nhắn đã đọc
    socket.on('markMessagesRead', async ({ userId, conversationId }) => {
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Cuộc trò chuyện không tồn tại');
            }

            if (!conversation.participants.includes(userId)) {
                throw new Error('Bạn không phải thành viên cuộc trò chuyện');
            }
            await Message.updateMany(
                {
                    conversation: conversationId,
                    readBy: { $ne: userId }
                },
                {
                    $addToSet: { readBy: userId }
                }
            );

            socket.emit('messagesMarkedRead', { conversationId });
        } catch (error) {
            console.error('Lỗi đánh dấu tin nhắn đã đọc:', error.message);
        }
    });

    socket.on('addMember', async ({ groupId, userId, newMemberIds }) => {
        try {
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                throw new Error('Nhóm không tồn tại');
            }

            if (!conversation.participants.includes(userId)) {
                throw new Error('Bạn không phải thành viên nhóm');
            }

            const newMembers = await User.find({ _id: { $in: newMemberIds } });
            if (newMembers.length !== newMemberIds.length) {
                throw new Error('Một số thành viên không tồn tại');
            }

            const existingMembers = newMemberIds.filter(id => conversation.participants.includes(id));
            if (existingMembers.length > 0) {
                throw new Error('Một số thành viên đã ở trong nhóm');
            }

            conversation.participants.push(...newMemberIds);
            await conversation.save();

            const updatedConversation = await Conversation.findById(groupId).populate('participants', 'full_name _id');

            newMemberIds.forEach(memberId => {
                io.to(memberId).emit('addedToGroup', {
                    groupId,
                    groupName: conversation.groupName,
                    addedBy: userId
                });
            });

            conversation.participants.forEach(participant => {
                if (!newMemberIds.includes(participant.toString()) && participant.toString() !== userId) {
                    io.to(participant.toString()).emit('newMemberAdded', {
                        groupId,
                        newMemberIds,
                        addedBy: userId
                    });
                }
            });
        } catch (error) {
            console.error('Lỗi thêm thành viên:', error.message);
        }
    });

    socket.on('uploadLibraryFile', async ({ groupId, userId, file, fileName }) => {
        try {
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                throw new Error('Nhóm không tồn tại');
            }

            if (!conversation.participants.includes(userId)) {
                throw new Error('Bạn không phải thành viên nhóm');
            }

            const base64Data = file.replace(/^data:[\w\/]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filePath = `/Uploads/${safeFileName}`;
            fs.writeFileSync(path.join(uploadDir, safeFileName), buffer);

            const message = new Message({
                sender: userId,
                conversation: groupId,
                file: filePath,
                fileName,
                isLibraryUpload: true
            });
            await message.save();

            const populatedMessage = await Message.findById(message._id).populate('sender', 'full_name');

            const sender = await User.findById(userId).select('full_name');
            conversation.participants.forEach(participant => {
                io.to(participant.toString()).emit('newFileAdded', {
                    groupId,
                    fileId: message._id,
                    fileName,
                    filePath,
                    sender: sender.full_name,
                    createdAt: message.createdAt
                });
            });
        } catch (error) {
            console.error('Lỗi upload file thư viện:', error.message);
        }
    });

    socket.on('createTask', async ({ groupId, userId, title, description }) => {
        try {
            // Không tạo công việc mới ở đây, chỉ phát thông báo
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                throw new Error('Nhóm không tồn tại');
            }
            if (!conversation.participants.includes(userId)) {
                throw new Error('Bạn không phải thành viên nhóm');
            }

            // Tìm công việc vừa được tạo (do API đã tạo)
            const task = await Task.findOne({
                conversation: groupId,
                title,
                creator: userId,
                createdAt: { $gte: new Date(Date.now() - 5000) } // Trong 5 giây gần nhất
            }).populate('creator', 'full_name');

            if (!task) {
                throw new Error('Không tìm thấy công việc vừa tạo');
            }

            conversation.participants.forEach(participant => {
                io.to(participant.toString()).emit('taskUpdated', {
                    groupId,
                    task,
                    action: 'created'
                });
            });
        } catch (error) {
            console.error('Lỗi phát thông báo công việc:', error.message);
            socket.emit('error', { message: 'Lỗi phát thông báo: ' + error.message });
        }
    });

    socket.on('updateTask', async ({ groupId, userId, taskId, title, description, isCompleted }) => {
        try {
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                throw new Error('Nhóm không tồn tại');
            }
            if (!conversation.participants.includes(userId)) {
                throw new Error('Bạn không phải thành viên nhóm');
            }

            const task = await Task.findById(taskId);
            if (!task || task.conversation.toString() !== groupId) {
                throw new Error('Công việc không tồn tại');
            }

            task.title = title || task.title;
            task.description = description || task.description;
            task.isCompleted = typeof isCompleted === 'boolean' ? isCompleted : task.isCompleted;
            await task.save();

            const populatedTask = await Task.findById(task._id).populate('creator', 'full_name');

            conversation.participants.forEach(participant => {
                io.to(participant.toString()).emit('taskUpdated', {
                    groupId,
                    task: populatedTask,
                    action: 'updated'
                });
            });
        } catch (error) {
            console.error('Lỗi cập nhật công việc:', error.message);
            socket.emit('error', { message: 'Lỗi cập nhật công việc: ' + error.message });
        }
    });

    socket.on('deleteTask', async ({ groupId, userId, taskId }) => {
        try {
            const conversation = await Conversation.findById(groupId);
            if (!conversation || !conversation.isGroup) {
                throw new Error('Nhóm không tồn tại');
            }
            if (!conversation.participants.includes(userId)) {
                throw new Error('Bạn không phải thành viên nhóm');
            }

            const task = await Task.findById(taskId);
            if (!task || task.conversation.toString() !== groupId) {
                throw new Error('Công việc không tồn tại');
            }

            await task.deleteOne();

            conversation.participants.forEach(participant => {
                io.to(participant.toString()).emit('taskUpdated', {
                    groupId,
                    taskId,
                    action: 'deleted'
                });
            });
        } catch (error) {
            console.error('Lỗi xóa công việc:', error.message);
            socket.emit('error', { message: 'Lỗi xóa công việc: ' + error.message });
        }
    });

    socket.on('sendFriendRequest', async ({ userId, friendId }) => {
        try {
            const friendRequest = new Friendship({
                requester: userId,
                recipient: friendId,
                status: "pending"
            });
            await friendRequest.save();

            io.to(friendId).emit('newFriendRequest', {
                requesterId: userId,
                message: 'Bạn có lời mời kết bạn mới!'
            });
        } catch (error) {
            console.error('Lỗi gửi lời mời:', error);
        }
    });

    socket.on('acceptFriendRequest', async ({ userId, friendId }) => {
        try {
            // Tìm và cập nhật trạng thái friendship
            const friendship = await Friendship.findOne({
                $or: [
                    { requester: userId, recipient: friendId },
                    { requester: friendId, recipient: userId }
                ]
            });

            if (!friendship) {
                throw new Error('Không tìm thấy lời mời kết bạn');
            }

            friendship.status = 'accepted';
            await friendship.save();
            console.log('Friendship accepted:', { userId, friendId });

            // Cập nhật trạng thái tin nhắn từ isPending: true thành isPending: false
            const updatedMessages = await Message.updateMany(
                {
                    $or: [
                        { sender: userId, receiver: friendId, isPending: true },
                        { sender: friendId, receiver: userId, isPending: true }
                    ]
                },
                { $set: { isPending: false } }
            );
            console.log('Updated messages:', updatedMessages);

            // Lấy lại danh sách tin nhắn đã cập nhật để gửi cho client
            const messages = await Message.find({
                $or: [
                    { sender: userId, receiver: friendId },
                    { sender: friendId, receiver: userId }
                ]
            })
                .populate('sender', 'username full_name')
                .sort({ createdAt: 1 });

            // Emit sự kiện friendshipAccepted tới cả hai người dùng
            io.to(userId).emit('friendshipAccepted', {
                friendId,
                messages
            });
            io.to(friendId).emit('friendshipAccepted', {
                friendId: userId,
                messages
            });
            console.log('Emitted friendshipAccepted to:', [userId, friendId]);
        } catch (error) {
            console.error('Lỗi chấp nhận lời mời:', error);
        }
    });

    // Xử lý bảng trắng
    socket.on('whiteboardDraw', async ({ conversationId, x, y, color, isNewStroke }) => {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isGroup) return;

        conversation.participants.forEach(participant => {
            io.to(participant.toString()).emit('whiteboardDraw', { x, y, color, isNewStroke });
        });
    });

    socket.on('whiteboardClear', async ({ conversationId }) => {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isGroup) return;

        conversation.participants.forEach(participant => {
            io.to(participant.toString()).emit('whiteboardClear');
        });
    });

    socket.on('whiteboardActivity', async ({ conversationId, userId, action }) => {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isGroup) return;

        const user = await User.findById(userId).select('full_name');
        if (!user) return;

        conversation.participants.forEach(participant => {
            if (participant.toString() !== userId) {
                io.to(participant.toString()).emit('whiteboardActivity', {
                    userId,
                    action,
                    username: user.full_name
                });
            }
        });
    });

    socket.on('requestWhiteboardState', async ({ conversationId }) => {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isGroup) return;

        // Tìm một thành viên đang mở bảng trắng
        conversation.participants.forEach(participant => {
            io.to(participant.toString()).emit('provideWhiteboardState', {
                conversationId,
                requesterId: socket.id
            });
        });
    });

    socket.on('provideWhiteboardState', ({ conversationId, imageData, requesterId }) => {
        if (imageData) {
            io.to(requesterId).emit('whiteboardState', { imageData });
        }
    });
    // 
});

server.listen(5000, () => {
    console.log('Server chạy tại cổng 5000');
});