const asyncHandler = require('express-async-handler');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const { formatResponse } = require('../utils/helpers');
const { emitMessage } = require('../utils/socket');

// @desc    Get or Create Direct Chat Room
// @route   POST /api/chat/room
// @access  Private
exports.getOrCreateChatRoom = asyncHandler(async (req, res) => {
    try {
        const { participantId, companyId, type = 'direct', name } = req.body;
        const currentUserId = req.user?._id || req.body.currentUserId;

        if (type === 'direct') {
            let room = await ChatRoom.findOne({
                type: 'direct',
                participants: { $all: [currentUserId, participantId] },
                company: companyId
            }).populate('participants', 'firstName lastName fullName image');

            if (!room) {
                room = await ChatRoom.create({
                    type: 'direct',
                    participants: [currentUserId, participantId],
                    company: companyId
                });
                room = await room.populate('participants', 'firstName lastName fullName image');
            }
            return res.json(formatResponse(true, 'Chat room retrieved', room));
        } else {
            // Group Chat
            const room = await ChatRoom.create({
                type: 'group',
                name,
                participants: req.body.participants, // Array of IDs
                company: companyId,
                groupAdmin: currentUserId
            });
            res.status(201).json(formatResponse(true, 'Group created successfully', room));
        }
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get All Chat Rooms for User
// @route   GET /api/chat/rooms?employeeId=...&companyId=...
// @access  Private
exports.getMyChatRooms = asyncHandler(async (req, res) => {
    try {
        const { employeeId, companyId } = req.query;

        const rooms = await ChatRoom.find({
            participants: employeeId,
            company: companyId
        })
        .populate('participants', 'firstName lastName fullName image')
        .populate({
            path: 'lastMessage',
            populate: { path: 'sender', select: 'firstName lastName fullName' }
        })
        .sort({ updatedAt: -1 });

        res.json(formatResponse(true, 'Chat rooms retrieved', rooms));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get Message History
// @route   GET /api/chat/messages/:roomId
// @access  Private
exports.getMessages = asyncHandler(async (req, res) => {
    try {
        const { roomId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const messages = await Message.find({ chatRoom: roomId })
            .populate('sender', 'firstName lastName fullName image')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json(formatResponse(true, 'Messages retrieved', messages.reverse()));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Send Message
// @route   POST /api/chat/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res) => {
    try {
        const { chatRoomId, senderId, text, attachments } = req.body;

        const message = await Message.create({
            chatRoom: chatRoomId,
            sender: senderId,
            text,
            attachments
        });

        await ChatRoom.findByIdAndUpdate(chatRoomId, {
            lastMessage: message._id,
            updatedAt: Date.now()
        });

        const populatedMessage = await message.populate('sender', 'firstName lastName fullName image');

        // Logic to emit via Socket.io
        emitMessage(chatRoomId, populatedMessage);

        res.status(201).json(formatResponse(true, 'Message sent', populatedMessage));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
