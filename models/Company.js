const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    companyCode: {
        type: String,
        unique: true,
        uppercase: true
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
    },
    address: { type: String },
    location: { type: String },
    gstNumber: {
        type: String,
        unique: true,
        sparse: true,
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please add a valid GST number']
    },
    contactNumber: {
        type: String,
        required: [true, 'Contact number is required'],
        match: [/^[0-9]{10}$/, 'Contact number must be 10 digits']
    },
    alternateContact: { type: String },
    hrName: {
        type: String,
        required: [true, 'HR name is required']
    },
    hrEmail: {
        type: String,
        required: [true, 'HR email is required'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    employeeStrength: { type: Number },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Trial'],
        default: 'Trial'
    },
    onboardDate: { type: Date, default: Date.now },
    notificationEnabled: { type: Boolean, default: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for current subscription
companySchema.virtual('currentSubscription', {
    ref: 'Subscription',
    localField: '_id',
    foreignField: 'company',
    justOne: true,
    options: { sort: { createdAt: -1 } }
});

// Pre-save to auto-generate company code
companySchema.pre('save', async function () {
    if (this.isNew && !this.companyCode) {
        const { generateCompanyCode } = require('../utils/helpers'); // Lazy load to avoid circular deps if any
        this.companyCode = await generateCompanyCode(this.companyName);
    }
});

module.exports = mongoose.model('Company', companySchema);
