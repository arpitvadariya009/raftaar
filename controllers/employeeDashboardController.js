const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const AuthEmployee = require('../models/AuthEmployee.model');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Task = require('../models/Task');
const { formatResponse } = require('../utils/helpers');

// @desc    Get dashboard data for employee mobile app
// @route   GET /api/dashboard/employee?employeeId=...&companyId=...
// @access  Private
exports.getEmployeeDashboard = asyncHandler(async (req, res) => {
    try {
        const { employeeId, companyId, date } = req.query;

        if (!employeeId || !companyId) {
            return res.status(400).json(formatResponse(false, 'Employee ID and Company ID are required'));
        }

        // Validate ObjectId format before DB calls
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return res.status(400).json(formatResponse(false, 'Invalid employeeId format'));
        }
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json(formatResponse(false, 'Invalid companyId format'));
        }

        // Optional date param (format: YYYY-MM-DD) — default: today
        let now;
        if (date) {
            now = new Date(date);
            if (isNaN(now.getTime())) {
                return res.status(400).json(formatResponse(false, 'Invalid date format. Use YYYY-MM-DD'));
            }
        } else {
            now = new Date(); // default: aaj ki date
        }

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const [
            employee,
            todaysBirthdays,
            todaysTasks,
            onLeaveEmployees,
            attendanceStats,
            todayAttendance   // 🆕 aaj ka attendance status
        ] = await Promise.all([
            // 1. Employee Profile Info
            AuthEmployee.findById(employeeId).select('firstName lastName fullName image department designation'),

            // 2. Today's Birthdays
            AuthEmployee.find({
                company: companyId,
                isActive: true,
                $expr: {
                    $and: [
                        { $eq: [{ $dayOfMonth: '$dateOfBirth' }, now.getDate()] },
                        { $eq: [{ $month: '$dateOfBirth' }, now.getMonth() + 1] }
                    ]
                }
            }).select('firstName lastName fullName image department'),

            // 3. Today's Scheduled Tasks
            Task.find({
                assignee: employeeId,
                date: { $gte: startOfToday, $lte: endOfToday }
            }).sort({ time: 1 }),

            // 4. Employees On Leave Today
            LeaveRequest.find({
                company: companyId,
                status: 1, // Approved
                fromDate: { $lte: endOfToday },
                toDate: { $gte: startOfToday }
            }).populate('employee', 'firstName lastName fullName image'),

            // 5. Attendance Stats for this month
            Attendance.aggregate([
                {
                    $match: {
                        employee: new mongoose.Types.ObjectId(employeeId),
                        date: { 
                            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                            $lte: endOfToday
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        daysPresent: { 
                            $sum: { $cond: [{ $in: ['$status', ['Present', 'Half Day']] }, 1, 0] } 
                        },
                        totalDays: { $sum: 1 }
                    }
                }
            ]),

            // 6. 🆕 Aaj ka attendance record (toggle state ke liye)
            Attendance.findOne({
                employee: employeeId,
                date: startOfToday
            }).select('inTime outTime sessions status workingHours')
        ]);

        // Calculate attendance percentage
        const attendancePercentage = attendanceStats.length > 0 
            ? Math.round((attendanceStats[0].daysPresent / attendanceStats[0].totalDays) * 100)
            : 0;

        // Get Leave Balance (Placeholder logic - usually comes from a LeaveBalance model or calculated)
        const leaveBalance = 12; // Placeholder

        // Tasks done this week
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const tasksDoneThisWeek = await Task.countDocuments({
            assignee: employeeId,
            status: 'Completed',
            updatedAt: { $gte: startOfWeek }
        });

        // Determine current toggle state
        let toggleStatus = 'OUT'; // default
        if (todayAttendance) {
            if (todayAttendance.sessions && todayAttendance.sessions.length > 0) {
                // New records — sessions se check karo
                const lastSession = todayAttendance.sessions[todayAttendance.sessions.length - 1];
                toggleStatus = (lastSession.in && !lastSession.out) ? 'IN' : 'OUT';
            } else if (todayAttendance.inTime && !todayAttendance.outTime) {
                // Old records (without sessions) — inTime/outTime fallback
                toggleStatus = 'IN';
            }
        }

        res.json(formatResponse(true, 'Employee dashboard data retrieved', {
            profile: employee,
            todaysBirthdays,
            todaysTasks,
            onLeave: onLeaveEmployees.map(l => l.employee).filter(e => e != null),
            stats: {
                attendancePercentage,
                leaveBalance,
                tasksDoneThisWeek
            },
            // 🆕 App toggle restore ke liye
            todayAttendance: {
                toggleStatus,          // 'IN' ya 'OUT' — toggle seedha set karo
                inTime:  todayAttendance?.inTime  || null,
                outTime: todayAttendance?.outTime || null,
                workingHours: todayAttendance?.workingHours || 0,
                sessions: todayAttendance?.sessions || []
            }
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
