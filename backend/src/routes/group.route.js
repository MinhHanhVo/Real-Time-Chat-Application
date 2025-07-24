import express from 'express';
import { addMember, createGroup, deleteGroup, getUserGroups, leaveGroup, removeMember, updateGroup } from '../controllers/group.controller.js';

const router = express.Router();

// Create Group
router.post('/', createGroup);

// Add Member
router.post('/:groupId/add-member', addMember);

// Delete Member
router.post('/:groupId/remove-member', removeMember);

// Get List Group
router.get('/user/:userId', getUserGroups);

// Rename Group
router.put('/:groupId', updateGroup);

// Out Group
router.post('/:groupId/leave', leaveGroup);

// Delete Group
router.delete('/:groupId', deleteGroup);

export default router; 