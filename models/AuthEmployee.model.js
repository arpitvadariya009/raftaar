const mongoose = require('mongoose');

const authEmployeeSchema = new mongoose.Schema({
    // Core keys requested
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    image: {
        type: String
    },
    descriptor: {
        type: [Number],
        required: true,
        validate: {
            validator: function (v) {
                return v && v.length === 128; // Face descriptor is 128D array
            },
            message: 'Descriptor must be a 128-dimensional array'
        }
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // Personal Details
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    bloodGroup: {
        type: String
    },
    maritalStatus: {
        type: String
    },

    // Contact Details
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    emergencyContact: {
        type: String
    },
    relation: {
        type: String
    },
    currentAddress: {
        type: String,
        required: true
    },

    // Employment Details
    employeeId: {
        type: String,
        required: true, // Auto-generated per UI, but uniquely identifies an employee
        unique: true
    },
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
        type: String,
        required: true
    },
    employmentType: {
        type: String,
        required: true
    },

    // Skills & Qualifications
    highestQualification: {
        type: String
    },
    yearsOfExperience: {
        type: Number
    },
    skills: {
        type: [String]
    },

    // Salary Details
    grossSalary: {
        type: Number,
        required: true
    },
    paymentMode: {
        type: String
    },
    bankName: {
        type: String
    },
    accountNumber: {
        type: String
    }
}, {
    timestamps: true
});

// Index for faster queries
authEmployeeSchema.index({ username: 1, email: 1 });

module.exports = mongoose.model('AuthEmployee', authEmployeeSchema);
