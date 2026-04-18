const asyncHandler = require('express-async-handler');
const LocationLog = require('../models/LocationLog');
const Attendance = require('../models/Attendance');
const { formatResponse } = require('../utils/helpers');

// @desc    Log employee location
// @route   POST /api/location/log
// @access  Private
exports.logLocation = asyncHandler(async (req, res) => {
    try {
        const { employeeId, companyId, latitude, longitude, address, status, batteryLevel } = req.body;

        const log = await LocationLog.create({
            employee: employeeId,
            company: companyId,
            latitude,
            longitude,
            address,
            status,
            batteryLevel
        });

        res.status(201).json(formatResponse(true, 'Location logged successfully', log));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get today's timeline for an employee
// @route   GET /api/location/timeline?employeeId=...&date=...
// @access  Private
exports.getTimeline = asyncHandler(async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

        const logs = await LocationLog.find({
            employee: employeeId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: 1 });

        // Get attendance stats for today
        const attendance = await Attendance.findOne({
            employee: employeeId,
            date: startOfDay
        });

        const stats = {
            checkIn: attendance ? attendance.checkIn : null,
            totalHours: attendance ? attendance.workingHours : '0h 0m',
            locationCount: logs.length,
            currentStatus: logs.length > 0 ? logs[logs.length - 1].status : 'Inactive'
        };

        res.json(formatResponse(true, 'Timeline retrieved successfully', { logs, stats }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
