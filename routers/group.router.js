// routers/group.router.js
const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');

router.post('/create', groupController.createGroup);
router.get('/:userId', groupController.getGroups);
router.post('/add-member', groupController.addMemberToGroup);
router.get('/files/:groupId/:userId/:type', groupController.getGroupFiles);
router.post('/delete-file', groupController.deleteGroupFile);
router.post('/upload-file', groupController.uploadLibraryFile);
router.get('/tasks/:groupId/:userId', groupController.getGroupTasks);
router.post('/tasks/create', groupController.createTask);
router.post('/tasks/update', groupController.updateTask);
router.post('/tasks/delete', groupController.deleteTask);

module.exports = router;