const mongoose = require("mongoose");

const weeklyOffTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        offDays: {
            type: [Number], // 0-6 where 0 is Sunday
            required: true,
            validate: {
                validator: function(v) {
                    return v.every(day => day >= 0 && day <= 6);
                },
                message: "Days must be between 0 (Sunday) and 6 (Saturday)"
            }
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

module.exports = mongoose.model("WeeklyOffTemplate", weeklyOffTemplateSchema);
