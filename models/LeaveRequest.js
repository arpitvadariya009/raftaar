const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
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
        leaveType: {
            type: String,
            enum: ["Personal", "Official", "Medical", "Other"],
            required: true
        },
        fromDate: {
            type: Date,
            required: true
        },
        toDate: {
            type: Date,
            required: true
        },
        leaveTime: {
            type: String, // e.g., "14:00 - 16:00"
            trim: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: Number,
            enum: [0, 1, 2], // 0: Pending, 1: Approved, 2: Rejected
            default: 0
        },
        appliedDate: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Indexes for faster lookup
leaveRequestSchema.index({ company: 1, status: 1 });
leaveRequestSchema.index({ employee: 1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
