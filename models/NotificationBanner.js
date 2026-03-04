const mongoose = require('mongoose');

const notificationBannerSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    companyName: { type: String }, // For quick company selection/display
    imagePath: { type: String },
    message: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('NotificationBanner', notificationBannerSchema);
