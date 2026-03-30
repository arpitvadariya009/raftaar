const mongoose = require("mongoose");

const assetCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
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

// Unique category name per company
assetCategorySchema.index({ name: 1, company: 1 }, { unique: true });

module.exports = mongoose.model("AssetCategory", assetCategorySchema);
