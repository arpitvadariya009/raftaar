const asyncHandler = require('express-async-handler');
const AuthEmployee = require('../models/AuthEmployee.model');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const GatePass = require('../models/GatePass');
const { formatResponse } = require('../utils/helpers');

/**
 * @desc    Get dashboard statistics for a company
 * @route   GET /api/company-dashboard/stats
 * @access  Private (Company Admin / Admin)
 */
exports.getCompanyStats = asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            return res.status(400).json(formatResponse(false, 'Company ID is required'));
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Run queries in parallel
        const [
            totalEmployees,
            subscribedEmployees,
            todayAttendance,
            employeesOnLeaveCount,
            todaysBirthdays,
            todaysOnLeaveList,
            todayGatePassCount
        ] = await Promise.all([
            // 1. Total Employees
            AuthEmployee.countDocuments({ company: companyId, isActive: true }),

            // 2. Subscribed Employees (Pro Plan = 2)
            AuthEmployee.countDocuments({ company: companyId, isActive: true, applicationPlanType: "2" }),

            // 3. Today's Attendance
            Attendance.countDocuments({
                company: companyId,
                date: startOfToday,
                status: { $in: ['Present', 'Half Day'] }
            }),

            // 4. Employees on Leave Count
            LeaveRequest.countDocuments({
                company: companyId,
                status: 1,
                fromDate: { $lte: endOfToday },
                toDate: { $gte: startOfToday }
            }),

            // 5. Today's Birthdays (List)
            AuthEmployee.find({
                company: companyId,
                isActive: true,
                $expr: {
                    $and: [
                        { $eq: [{ $dayOfMonth: '$dateOfBirth' }, now.getDate()] },
                        { $eq: [{ $month: '$dateOfBirth' }, now.getMonth() + 1] }
                    ]
                }
            }).select('firstName lastName fullName image'),

            // 6. Today's On Leave (List)
            LeaveRequest.find({
                company: companyId,
                status: 1,
                fromDate: { $lte: endOfToday },
                toDate: { $gte: startOfToday }
            }).populate('employee', 'dateOfJoining department firstName lastName fullName image'),
            
            // 7. Today's Gate Pass Count
            GatePass.countDocuments({
                company: companyId,
                status: 1,
                date: startOfToday
            })
        ]);

        // Flatten the on leave list
        const flattenedOnLeave = todaysOnLeaveList.map(leave => leave.employee).filter(emp => emp != null);

        res.json(formatResponse(true, 'Company dashboard stats retrieved successfully', {
            totalEmployees,
            subscribedEmployees,
            todayAttendance,
            employeesOnLeaveCount,
            todayGatePassCount,
            todaysBirthdays,
            todaysOnLeaveList: flattenedOnLeave
        }));

    } catch (error) {
        console.error('Get Company Stats Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
});
