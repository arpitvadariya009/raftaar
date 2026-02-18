const mongoose = require('mongoose');

const faceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    descriptor: {
        type: [Number],
        required: true
    }, // 128D array
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('Face', faceSchema);
