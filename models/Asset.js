const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
    {
        assetName: {
            type: String,
            required: true,
            trim: true
        },
        serialCode: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AssetCategory",
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        approxCost: {
            type: Number,
            default: 0
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AuthEmployee",
            default: null
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        },
        status: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
assetSchema.index({ company: 1 });
assetSchema.index({ serialCode: 1 });

module.exports = mongoose.model("Asset", assetSchema);

