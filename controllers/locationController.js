const asyncHandler = require('express-async-handler');
const LocationLog = require('../models/LocationLog');
const LocationSession = require('../models/LocationSession');
const Attendance = require('../models/Attendance');
const AuthEmployee = require('../models/AuthEmployee.model');
const { formatResponse } = require('../utils/helpers');
const { getIO, emitToCompany } = require('../utils/socket');

// ─── Helper: Offline threshold (10 minutes) ───────────────────────────────────
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

const isOnline = (lastLogTime, status = '') => {
    if (!lastLogTime) return false;
    const isRecent = (Date.now() - new Date(lastLogTime).getTime()) < OFFLINE_THRESHOLD_MS;
    const isPausedOrStopped = ['tracking paused', 'tracking stopped', 'checked out'].includes(status);
    return isRecent && !isPausedOrStopped;
};
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Log employee location (Mobile App → sends every ~30 sec)
// @route   POST /api/location/logLocation
// @access  Private (Employee)
exports.logLocation = asyncHandler(async (req, res) => {
    try {
        const {
            employeeId, companyId,
            latitude, longitude,
            address, placeName,
            status, batteryLevel,
            speed, accuracy,
            sessionId
        } = req.body;

        const log = await LocationLog.create({
            employee: employeeId,
            company: companyId,
            latitude,
            longitude,
            address,
            placeName,
            status,
            batteryLevel,
            speed,
            accuracy,
            sessionId: sessionId || undefined
        });

        // ─── Session ka totalLocations update karo ────────────────────
        if (sessionId) {
            await LocationSession.findByIdAndUpdate(sessionId, {
                $inc: { totalLocations: 1 }
            });
        }
        // ─────────────────────────────────────────────────────────────

        // ─── Real-time update: Employee ka apna screen ────────────────
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            const locationCount = await LocationLog.countDocuments({
                employee: employeeId,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            const attendance = await Attendance.findOne({
                employee: employeeId,
                date: startOfDay
            }).select('inTime workingHours sessions');

            let trackingStatus = 'inactive';
            if (attendance?.sessions?.length > 0) {
                const lastSession = attendance.sessions[attendance.sessions.length - 1];
                trackingStatus = (lastSession.in && !lastSession.out) ? 'active' : 'paused';
            } else if (attendance?.inTime && !attendance?.outTime) {
                trackingStatus = 'active';
            }

            const io = getIO();
            // Employee ka apna room
            io.to(employeeId.toString()).emit('location-update', {
                newLog: {
                    _id: log._id,
                    latitude: log.latitude,
                    longitude: log.longitude,
                    address: log.address,
                    placeName: log.placeName,
                    status: log.status,
                    createdAt: log.createdAt
                },
                stats: {
                    checkIn:      attendance?.inTime    || null,
                    totalHours:   attendance?.workingHours || 0,
                    locationCount: locationCount,
                    currentStatus: status,
                    trackingStatus: trackingStatus,
                    lastUpdated:   log.createdAt
                }
            });

            // ─── HR Dashboard (Company Room) ko bhi update bhejo ─────────
            // Sirf us company ke HR ko milega
            const employee = await AuthEmployee.findById(employeeId)
                .select('firstName lastName department photo');

            emitToCompany(companyId, 'live-location-update', {
                employeeId,
                name: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
                department: employee?.department || '',
                photo: employee?.photo || null,
                latitude,
                longitude,
                address,
                placeName,
                status,
                batteryLevel,
                isOnline: isOnline(log.createdAt, status),
                lastUpdated: log.createdAt
            });
            // ─────────────────────────────────────────────────────────────

        } catch (socketErr) {
            console.warn('Socket emit failed (location-update):', socketErr.message);
        }
        // ─────────────────────────────────────────────────────────────

        res.status(201).json(formatResponse(true, 'Location logged successfully', log));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get today's timeline for an employee (Employee ka apna screen)
// @route   GET /api/location/getTimeline?employeeId=...&date=...
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

        const attendance = await Attendance.findOne({
            employee: employeeId,
            date: startOfDay
        });

        const stats = {
            checkIn: attendance ? attendance.inTime : null,
            totalHours: attendance ? attendance.workingHours : '0h 0m',
            locationCount: logs.length,
            currentStatus: logs.length > 0 ? logs[logs.length - 1].status : 'Inactive'
        };

        res.json(formatResponse(true, 'Timeline retrieved successfully', { logs, stats }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// ─── NEW APIs Below ───────────────────────────────────────────────────────────

// @desc    Get all employees' LIVE locations for HR Dashboard
// @route   GET /api/location/live?companyId=xxx
// @access  Private (HR/Manager of that company only)
exports.getLiveLocations = asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            return res.status(400).json(formatResponse(false, 'companyId is required'));
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Har employee ki aaj ki LAST location log nikalo
        const latestLogs = await LocationLog.aggregate([
            {
                $match: {
                    company: require('mongoose').Types.ObjectId.createFromHexString(companyId),
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$employee',
                    lastLog: { $first: '$$ROOT' }
                }
            }
        ]);

        // Employee details populate karo
        const result = await Promise.all(latestLogs.map(async (item) => {
            const emp = await AuthEmployee.findById(item._id)
                .select('firstName lastName department photo employeeId');

            const online = isOnline(item.lastLog.createdAt, item.lastLog.status);

            return {
                employeeId: item._id,
                employeeCode: emp?.employeeId || '',
                name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
                department: emp?.department || '',
                photo: emp?.photo || null,
                latitude: item.lastLog.latitude,
                longitude: item.lastLog.longitude,
                address: item.lastLog.address,
                placeName: item.lastLog.placeName,
                status: item.lastLog.status,
                batteryLevel: item.lastLog.batteryLevel,
                lastUpdated: item.lastLog.createdAt,
                isOnline: online
            };
        }));

        res.json(formatResponse(true, 'Live locations fetched successfully', result));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get full location logs with filters (HR Dashboard → Logs Table)
// @route   GET /api/location/logs?companyId=xxx&employeeId=xxx&date=2026-07-10&page=1&limit=20
// @access  Private (HR of that company)
exports.getLocationLogs = asyncHandler(async (req, res) => {
    try {
        const {
            companyId,
            employeeId,
            date,
            page = 1,
            limit = 20
        } = req.query;

        if (!companyId) {
            return res.status(400).json(formatResponse(false, 'companyId is required'));
        }

        const mongoose = require('mongoose');
        const filter = {
            company: mongoose.Types.ObjectId.createFromHexString(companyId)
        };

        if (employeeId) {
            filter.employee = mongoose.Types.ObjectId.createFromHexString(employeeId);
        }

        if (date) {
            const targetDate = new Date(date);
            filter.createdAt = {
                $gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
                $lte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)
            };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await LocationLog.countDocuments(filter);

        const logs = await LocationLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('employee', 'firstName lastName department photo employeeId');

        res.json(formatResponse(true, 'Location logs fetched successfully', logs, {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get single employee stats for today (HR Dashboard sidebar panel)
// @route   GET /api/location/employee-stats?employeeId=xxx&companyId=xxx
// @access  Private (HR of that company)
exports.getEmployeeStats = asyncHandler(async (req, res) => {
    try {
        const { employeeId, companyId } = req.query;

        if (!employeeId || !companyId) {
            return res.status(400).json(formatResponse(false, 'employeeId and companyId are required'));
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const [logs, attendance, employee] = await Promise.all([
            LocationLog.find({
                employee: employeeId,
                company: companyId,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }).sort({ createdAt: 1 }),
            Attendance.findOne({ employee: employeeId, date: startOfDay }),
            AuthEmployee.findById(employeeId).select('firstName lastName department photo employeeId')
        ]);

        const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

        res.json(formatResponse(true, 'Employee stats fetched successfully', {
            employee: {
                _id: employee?._id,
                name: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
                department: employee?.department || '',
                photo: employee?.photo || null,
                employeeCode: employee?.employeeId || ''
            },
            stats: {
                checkIn: attendance?.inTime || null,
                totalHours: attendance?.workingHours || '0h 0m',
                locationCount: logs.length,
                currentStatus: lastLog?.status || 'Inactive',
                lastLocation: lastLog ? {
                    address: lastLog.address,
                    placeName: lastLog.placeName,
                    latitude: lastLog.latitude,
                    longitude: lastLog.longitude,
                    updatedAt: lastLog.createdAt
                } : null,
                isOnline: isOnline(lastLog?.createdAt, lastLog?.status)
            },
            timeline: logs.map(l => ({
                _id: l._id,
                address: l.address,
                placeName: l.placeName,
                latitude: l.latitude,
                longitude: l.longitude,
                status: l.status,
                batteryLevel: l.batteryLevel,
                createdAt: l.createdAt
            }))
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Start / Pause / Stop tracking session (Employee App button)
// @route   PATCH /api/location/tracking-status
// @access  Private (Employee)
exports.updateTrackingStatus = asyncHandler(async (req, res) => {
    try {
        const { employeeId, companyId, action } = req.body;
        // action: "start" | "pause" | "stop"

        if (!['start', 'pause', 'stop'].includes(action)) {
            return res.status(400).json(formatResponse(false, 'action must be start, pause, or stop'));
        }

        let session;

        if (action === 'start') {
            // New session create karo
            session = await LocationSession.create({
                employee: employeeId,
                company: companyId,
                status: 'active'
            });
        } else {
            // Active session dhundho
            session = await LocationSession.findOne({
                employee: employeeId,
                company: companyId,
                status: { $in: ['active', 'paused'] }
            }).sort({ createdAt: -1 });

            if (!session) {
                return res.status(404).json(formatResponse(false, 'No active tracking session found'));
            }

            if (action === 'pause') {
                session.status = 'paused';
            } else if (action === 'stop') {
                session.status = 'stopped';
                session.endTime = new Date();
                session.totalDuration = Math.round(
                    (new Date() - session.startTime) / 60000
                );
            }

            await session.save();
        }

        // HR Dashboard ko bhi inform karo
        try {
            const employee = await AuthEmployee.findById(employeeId)
                .select('firstName lastName department photo');

            emitToCompany(companyId, 'employee-tracking-status', {
                employeeId,
                name: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
                department: employee?.department || '',
                photo: employee?.photo || null,
                trackingStatus: session.status,
                sessionId: session._id,
                updatedAt: new Date()
            });
        } catch (socketErr) {
            console.warn('Socket emit failed (employee-tracking-status):', socketErr.message);
        }

        res.json(formatResponse(true, `Tracking ${action}ed successfully`, session));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
