const mongoose = require('mongoose');

const locationSessionSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuthEmployee',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'stopped'],
        default: 'active'
    },
    totalDuration: {
        type: Number,   // minutes
        default: 0
    },
    totalLocations: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LocationSession', locationSessionSchema);
