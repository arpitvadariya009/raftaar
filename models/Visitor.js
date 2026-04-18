const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },

    meetWith: {
      type: String,
      trim: true
    },

    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      match: [/^[0-9]{10}$/, 'Contact number must be 10 digits']
    },

    reason: {
      type: String,
      required: [true, 'Reason for visit is required']
    },

    image: {
      type: String // stores image URL or path
    },

    // Entry Time
    checkInTime: {
      type: Date,
      default: Date.now
    },

    // Exit Time
    checkOutTime: {
      type: Date
    },

    status: {
      type: String,
      enum: ['IN', 'OUT'],
      default: 'IN'
    },

    // User or Security Guard who registered the visitor
    createdBy: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Visitor', visitorSchema);
