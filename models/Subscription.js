const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    subscriptionType: {
        subscriptionTypeBasic: { type: Number, default: 0 },
        subscriptionTypePro: { type: Number, default: 0 }
    },
    billingType: {
        type: String,
        enum: ['Monthly', 'Yearly'],
        required: true
    },
    charge: { type: Number, required: true },       // Auto-calculated total before discount
    discount: { type: Number, default: 0 },          // Manual discount by admin
    finalAmount: { type: Number, required: true },   // charge - discount
    startDate: { type: Date, required: true },
    duration: { type: Number, required: true },      // in months
    validTill: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Active', 'Expired'],
        default: 'Active'
    }
}, {
    timestamps: true
});

// Update status based on date
subscriptionSchema.pre('save', function () {
    if (this.validTill < new Date()) {
        this.status = 'Expired';
    } else {
        this.status = 'Active';
    }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
