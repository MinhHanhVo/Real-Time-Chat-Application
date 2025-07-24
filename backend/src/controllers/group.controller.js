import Group from '../models/group.model.js';
import User from '../models/user.model.js';

// Create Group
const createGroup = async (req, res) => {
    try {
        const { name, members, admin } = req.body;
        if (!name || !members || !Array.isArray(members) || members.length < 2 || !admin) {
            return res.status(400).json({ message: 'Thiếu thông tin hoặc nhóm phải có ít nhất 2 thành viên.' });
        }
        // Check admin nằm trong members
        if (!members.includes(admin)) {
            members.push(admin);
        }
        const group = await Group.create({ name, members, admin });
        res.status(201).json(group);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Tạo nhóm thất bại.' });
    }
};

// Add Member
const addMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId, adminId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });
        if (String(group.admin) !== adminId) return res.status(403).json({ message: 'Chỉ admin mới được thêm thành viên.' });
        if (group.members.includes(userId)) return res.status(400).json({ message: 'Thành viên đã tồn tại.' });
        group.members.push(userId);
        await group.save();
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Thêm thành viên thất bại.' });
    }
};

// Delete Member
const removeMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId, adminId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });
        if (String(group.admin) !== adminId) return res.status(403).json({ message: 'Chỉ admin mới được xóa thành viên.' });
        group.members = group.members.filter(id => String(id) !== userId);
        await group.save();
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Xóa thành viên thất bại.' });
    }
};

// Get list group for user
const getUserGroups = async (req, res) => {
    try {
        const { userId } = req.params;
        const groups = await Group.find({ members: userId });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Lấy danh sách nhóm thất bại.' });
    }
};

// Rename Group
const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, adminId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });
        if (String(group.admin) !== adminId) return res.status(403).json({ message: 'Chỉ admin mới được đổi tên nhóm.' });
        if (name) group.name = name;

        await group.save();
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Cập nhật nhóm thất bại.' });
    }
};

// Out group
const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });
        group.members = group.members.filter(id => String(id) !== userId);
        // Nếu admin rời nhóm thì chuyển quyền admin cho thành viên đầu tiên còn lại
        if (String(group.admin) === userId && group.members.length > 0) {
            group.admin = group.members[0];
        }
        await group.save();
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Rời nhóm thất bại.' });
    }
};

// Delete group (for admin)
const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { adminId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });
        if (String(group.admin) !== adminId) return res.status(403).json({ message: 'Chỉ admin mới được xóa nhóm.' });
        await group.deleteOne();
        res.json({ message: 'Đã xóa nhóm.' });
    } catch (error) {
        res.status(500).json({ message: 'Xóa nhóm thất bại.' });
    }
};

export {
    createGroup,
    addMember,
    removeMember,
    getUserGroups,
    updateGroup,
    leaveGroup,
    deleteGroup
}; 