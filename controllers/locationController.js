const asyncHandler = require('express-async-handler');
const LocationLog = require('../models/LocationLog');
const Attendance = require('../models/Attendance');
const { formatResponse } = require('../utils/helpers');
const { getIO } = require('../utils/socket');

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

        // ─── Real-time update: Location Tracking Screen ───────────────
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            // Aaj ke saare location logs count karo
            const locationCount = await LocationLog.countDocuments({
                employee: employeeId,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            // Aaj ki attendance (checkIn + workingHours)
            const attendance = await Attendance.findOne({
                employee: employeeId,
                date: startOfDay
            }).select('inTime workingHours sessions');

            // Toggle status determine karo
            let trackingStatus = 'inactive';
            if (attendance?.sessions?.length > 0) {
                const lastSession = attendance.sessions[attendance.sessions.length - 1];
                trackingStatus = (lastSession.in && !lastSession.out) ? 'active' : 'paused';
            } else if (attendance?.inTime && !attendance?.outTime) {
                trackingStatus = 'active';
            }

            // Socket event emit karo — sirf us employee ke room mein
            const io = getIO();
            io.to(employeeId.toString()).emit('location-update', {
                newLog: {
                    _id: log._id,
                    latitude: log.latitude,
                    longitude: log.longitude,
                    address: log.address,
                    status: log.status,
                    createdAt: log.createdAt
                },
                stats: {
                    checkIn:      attendance?.inTime    || null,
                    totalHours:   attendance?.workingHours || 0,
                    locationCount: locationCount,
                    currentStatus: status,         // e.g. "moving", "on site", "checked in"
                    trackingStatus: trackingStatus, // "active" | "paused" | "inactive"
                    lastUpdated:   log.createdAt
                }
            });
        } catch (socketErr) {
            // Socket error se main response affect na ho
            console.warn('Socket emit failed (location-update):', socketErr.message);
        }
        // ─────────────────────────────────────────────────────────────

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
