const asyncHandler = require('express-async-handler');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const { formatResponse } = require('../utils/helpers');
const { emitMessage, getIO } = require('../utils/socket');
const { getFileType } = require('../middleware/chatUpload');

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

        // ── Validation ──────────────────────────────────────────────
        if (!chatRoomId || !senderId) {
            return res.status(400).json(formatResponse(false, 'chatRoomId and senderId are required'));
        }

        // Parse attachments if they are sent as JSON string in form-data
        let processedAttachments = [];
        if (attachments) {
            if (typeof attachments === 'string') {
                try {
                    processedAttachments = JSON.parse(attachments);
                } catch (e) {
                    console.error("Error parsing attachments string:", e);
                }
            } else if (Array.isArray(attachments)) {
                processedAttachments = attachments;
            }
        }

        // Process newly uploaded files through multer
        if (req.files && req.files.length > 0) {
            const uploadedFiles = req.files.map(file => ({
                url: `/uploads/chat/${file.filename}`,
                type: getFileType(file.filename),
                name: file.originalname
            }));
            processedAttachments = [...processedAttachments, ...uploadedFiles];
        }

        if (!text && processedAttachments.length === 0) {
            return res.status(400).json(formatResponse(false, 'Message text or attachment is required'));
        }

        // ── Save message to DB ──────────────────────────────────────
        const message = await Message.create({
            chatRoom: chatRoomId,
            sender: senderId,
            text,
            attachments: processedAttachments
        });

        // ── Update room's lastMessage ───────────────────────────────
        const room = await ChatRoom.findByIdAndUpdate(
            chatRoomId,
            { lastMessage: message._id, updatedAt: Date.now() },
            { new: true }
        ).select('participants');

        // ── Populate sender info ────────────────────────────────────
        const populatedMessage = await message.populate('sender', 'firstName lastName fullName image');

        // ── Socket Event 1: Chat room mein live message bhejo ───────
        // Dono log same chat screen pe hoon toh turant message dikhega
        emitMessage(chatRoomId, populatedMessage);

        // ── Socket Event 2: Har participant ke private room mein ────
        // notification bhejo (unread badge + chat list update ke liye)
        try {
            const io = getIO();
            if (room?.participants) {
                room.participants.forEach((participantId) => {
                    // Sender ko notification mat bhejo
                    if (participantId.toString() !== senderId.toString()) {
                        io.to(participantId.toString()).emit('new-message-notification', {
                            chatRoomId,
                            message: {
                                _id: populatedMessage._id,
                                text: populatedMessage.text,
                                sender: populatedMessage.sender,
                                createdAt: populatedMessage.createdAt,
                                attachments: populatedMessage.attachments
                            }
                        });
                    }
                });
            }
        } catch (socketErr) {
            console.warn('Socket emit failed (new-message-notification):', socketErr.message);
        }
        // ───────────────────────────────────────────────────────────

        res.status(201).json(formatResponse(true, 'Message sent', populatedMessage));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
