const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        documentFlow: {
            type: String,
            enum: ["INWARD", "OUTWARD"],
            required: true,
        },

        date: {
            type: Date,
            required: true,
        },

        vendorName: {
            type: String,
            required: true,
        },

        documentType: {
            type: String,
            enum: ["INVOICE", "CHALLAN", "OTHER"],
            required: true,
        },
        vehicleNumber: {
            type: String,
        },

        image: {
            type: String, // uploaded file URL
        },

        discrepancy: {
            type: String,
            enum: ["YES", "NO"],
            default: "NO",
        },

        remarks: {
            type: String,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        },

    },
    { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);