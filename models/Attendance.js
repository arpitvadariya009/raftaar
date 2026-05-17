const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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
        date: {
            type: Date,
            required: true
        },
        inTime: {   // First IN of the day
            type: Date
        },
        outTime: {  // Last OUT of the day
            type: Date
        },
        // 🆕 Multiple sessions (IN/OUT pairs) for break support
        sessions: [
            {
                in:  { type: Date },
                out: { type: Date }
            }
        ],
        workingHours: {  // Total hours (sum of all sessions)
            type: Number,
            default: null
        },
        status: {
            type: String,
            enum: ["Present", "Absent", "Leave", "Half Day", "Weekly Off", "Holiday", "Late"],
            default: "Present"
        }
    },
    {
        timestamps: true
    }
);

// Indexes for faster queries on frequently searched fields
attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ company: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
