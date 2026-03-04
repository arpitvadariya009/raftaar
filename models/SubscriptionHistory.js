const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    action: {
        type: String,
        enum: ['Created', 'Upgraded', 'Downgraded', 'Renewed', 'Cancelled'],
        required: true
    },
    previousData: {
        subscriptionTypeBasic: { type: Number, default: 0 },
        subscriptionTypePro: { type: Number, default: 0 },
        billingType: { type: String },
        charge: { type: Number },
        discount: { type: Number },
        finalAmount: { type: Number }
    },
    newData: {
        subscriptionTypeBasic: { type: Number, default: 0 },
        subscriptionTypePro: { type: Number, default: 0 },
        billingType: { type: String },
        charge: { type: Number },
        discount: { type: Number },
        finalAmount: { type: Number }
    },
    remarks: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
