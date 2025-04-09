// routes/chat.routes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const auth = require('../middleware/auth.middleware');
const  upload  = require('../middleware/upload.middleware');

// Message routes
router.post('/:channelId/messages', auth, chatController.sendMessage);
router.post('/:channelId/messages/file', auth, upload.single('file'), chatController.sendFileMessage);
router.get('/:channelId/messages', auth, chatController.getMessages);
router.delete('/messages/:messageId', auth, chatController.deleteMessage);
router.put('/messages/:messageId', auth, chatController.editMessage);
router.post('/:channelId/read', auth, chatController.markAsRead);
router.get('/:channelId/unread', auth, chatController.getUnreadCount);
router.get('/:channelId/messages/search', auth, chatController.searchMessages);

module.exports = router;