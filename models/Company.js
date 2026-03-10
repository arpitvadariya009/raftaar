const mongoose = require('mongoose');
const { generateCompanyCode } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

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
    countryCode: {
        type: String,
        required: [true, 'Country code is required'],
        match: [/^[A-Z]{2,3}$/, 'Country code must be a valid 2-3 letter ISO code (e.g. IN, US)']
    },
    dialCode: {
        type: String,
        required: [true, 'Dial code is required'],
        match: [/^[0-9]{1,3}$/, 'Dial code must be 1-3 digits']
    },
    alternateContact: { type: String },
    alternateCountryCode: {
        type: String,
        match: [/^[A-Z]{2,3}$/, 'Country code must be a valid 2-3 letter ISO code (e.g. IN, US)']
    },
    alternateDialCode: {
        type: String,
        match: [/^[0-9]{1,3}$/, 'Dial code must be 1-3 digits']
    },
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
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false,
    },
    token: {
        type: String,
    },
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

// Pre-save to auto-generate company code and hash password
companySchema.pre('save', async function (next) {
    if (this.isNew && !this.companyCode) {
        const { generateCompanyCode } = require('../utils/helpers'); // Lazy load to avoid circular deps if any
        this.companyCode = await generateCompanyCode(this.companyName);
    }

    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    next();
});

// Match company entered password to hashed password in database
companySchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Company', companySchema);
