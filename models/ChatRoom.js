const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['direct', 'group'],
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuthEmployee'
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuthEmployee'
    },
    groupImage: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
