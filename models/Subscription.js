const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    subscriptionType: { type: String, required: true },
    billingType: {
        type: String,
        enum: ['One-Time', 'Monthly'],
        required: true
    },
    charge: { type: Number, required: true },
    startDate: { type: Date, required: true },
    duration: { type: Number, required: true }, // in months
    validTill: { type: Date },
    status: {
        type: String,
        enum: ['Active', 'Expired'],
        default: 'Active'
    }
}, {
    timestamps: true
});

// Update status based on date
subscriptionSchema.pre('save', function (next) {
    if (this.validTill < new Date()) {
        this.status = 'Expired';
    } else {
        this.status = 'Active';
    }
    next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
