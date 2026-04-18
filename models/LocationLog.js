const mongoose = require('mongoose');

const locationLogSchema = new mongoose.Schema({
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
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['checked in', 'on site', 'checked out', 'tracking active', 'tracking paused'],
        default: 'on site'
    },
    batteryLevel: Number,
    isMockLocation: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LocationLog', locationLogSchema);
