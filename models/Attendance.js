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
        inTime: {
            type: Date
        },
        outTime: {
            type: Date
        },
        workingHours: {
            type: Number,
            default: null
        },
        status: {
            type: String,
            enum: ["Present", "Absent", "Leave", "Half Day", "Weekly Off", "Holiday"],
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
