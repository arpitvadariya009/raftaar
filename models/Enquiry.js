const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    enquiryType: {
        type: String,
        enum: ['New', 'Renewal', 'Custom', 'Demo'],
        required: true
    },
    description: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, required: true },
    enquiryDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Pending', 'Responded', 'Converted'],
        default: 'Pending'
    },
    responseMessage: { type: String },
    respondedAt: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('Enquiry', enquirySchema);
