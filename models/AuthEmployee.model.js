const mongoose = require('mongoose');

const authEmployeeSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
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

    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
authEmployeeSchema.index({ username: 1, email: 1 });

module.exports = mongoose.model('AuthEmployee', authEmployeeSchema);
