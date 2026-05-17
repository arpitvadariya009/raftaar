const express = require('express');
const router = express.Router();
const { getOrCreateChatRoom, getMyChatRooms, getMessages, sendMessage } = require('../controllers/chatController');
const { chatUpload } = require('../middleware/chatUpload');

router.post('/getOrCreateChatRoom', getOrCreateChatRoom);
router.get('/getMyChatRooms', getMyChatRooms);
router.get('/getMessages/:roomId', getMessages);
router.post('/sendMessage', chatUpload.array('files', 10), sendMessage);

module.exports = router;
