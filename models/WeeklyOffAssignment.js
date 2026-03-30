const mongoose = require("mongoose");

const weeklyOffAssignmentSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AuthEmployee",
            required: true
        },
        template: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WeeklyOffTemplate",
            required: true
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Ensure unique assignment per employee per month/year
weeklyOffAssignmentSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("WeeklyOffAssignment", weeklyOffAssignmentSchema);
