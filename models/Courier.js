const mongoose = require("mongoose");

const courierSchema = new mongoose.Schema(
    {
        courierType: {
            type: String,
            enum: ["INWARD", "OUTWARD"],
            required: true,
        },

        courierCompany: {
            type: String,
            required: true,
        },

        fromOrTo: {
            type: String, // received from / send to
            required: true,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        },

        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AuthEmployee",
            required: true
        },

        image: {
            type: String, // uploaded image URL
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Courier", courierSchema);