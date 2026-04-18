const mongoose = require("mongoose");

const gatePassSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AuthEmployee",
            required: true
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        },
        gatePassType: {
            type: String,
            enum: ["Personal", "Official", "Medical", "Other"],
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: Number,
            enum: [0, 1, 2, 4, 5], // 0: Pending, 1: Approved, 2: Rejected , 4 EXITED , 5 DENIED
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Indexes for faster lookup
gatePassSchema.index({ company: 1, status: 1 });
gatePassSchema.index({ employee: 1, date: 1 });

module.exports = mongoose.model("GatePass", gatePassSchema);
