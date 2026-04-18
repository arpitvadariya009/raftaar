const express = require('express');
const router = express.Router();
const { getOrCreateChatRoom, getMyChatRooms, getMessages, sendMessage } = require('../controllers/chatController');

router.post('/room', getOrCreateChatRoom);
router.get('/rooms', getMyChatRooms);
router.get('/messages/:roomId', getMessages);
router.post('/messages', sendMessage);

module.exports = router;
