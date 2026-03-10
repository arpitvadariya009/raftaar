

const mongoose = require("mongoose");

const authEmployeeSchema = new mongoose.Schema(
    {
        // Face Recognition
        image: {
            type: String
        },
        descriptor: {
            type: [Number],
            validate: {
                validator: function (v) {
                    return !v || v.length === 128;
                },
                message: "Descriptor must be a 128D array"
            }
        },

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        },

        // Basic Info
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        fatherName: {
            type: String,
            trim: true
        },

        dateOfBirth: {
            type: Date,
            required: true
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Other"]
        },

        // Contact Details
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        mobileNumber: {
            type: String,
            required: true
        },

        emergencyContact: {
            type: String
        },

        address: {
            type: String,
            required: true
        },

        // Employment Details
        dateOfJoining: {
            type: Date,
            required: true
        },

        department: {
            type: String,
            required: true
        },

        designation: {
            type: String,
            required: true
        },

        reportingHead: {
            type: String
        },

        skillType: {
            type: String
        },

        // Salary
        grossSalary: {
            type: Number,
            required: true
        }

    },
    {
        timestamps: true
    }
);

// Index for faster search
authEmployeeSchema.index({ email: 1 });

module.exports = mongoose.model("AuthEmployee", authEmployeeSchema);
