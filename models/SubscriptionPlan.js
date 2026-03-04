const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    planName: {
        type: String,
        required: [true, 'Plan name is required'],
        trim: true,
        unique: true
    },
    monthlyPrice: {
        type: Number,
        required: [true, 'Monthly price is required'],
        min: 0
    },
    yearlyPrice: {
        type: Number,
        required: [true, 'Yearly price is required'],
        min: 0
    },
    features: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
