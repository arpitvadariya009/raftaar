const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatRoom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuthEmployee',
        required: true
    },
    text: {
        type: String,
        trim: true
    },
    attachments: [{
        url: String,
        type: {
            type: String,
            enum: ['image', 'video', 'file', 'audio']
        },
        name: String
    }],
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AuthEmployee'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
