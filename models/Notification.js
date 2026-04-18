const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuthEmployee',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuthEmployee'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'Leave Approved', 
            'Leave Rejected', 
            'New Task Assigned', 
            'Timesheet Overdue', 
            'Meeting Reminder', 
            'Policy Update', 
            'Birthday Wishes', 
            'Salary Credited'
        ],
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'onModel'
    },
    onModel: {
        type: String,
        enum: ['LeaveRequest', 'Task', 'Message', 'Attendance']
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
