const Attendance = require("../models/Attendance");
const AuthEmployee = require("../models/AuthEmployee.model");
const asyncHandler = require('express-async-handler');
const { formatResponse } = require('../utils/helpers');
const mongoose = require('mongoose');

/**
 * @desc    Mark Attendance (In / Out)
 * @route   POST /api/attendance/mark
 * @access  Private
 */
exports.markAttendance = async (req, res, next) => {
    try {
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required" });
        }

        // Validate employee exists
        const employee = await AuthEmployee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Check if attendance already exists for today
        let attendance = await Attendance.findOne({
            employee: employeeId,
            date: startOfDay
        });

        if (!attendance) {
            // No entry yet, mark In
            attendance = await Attendance.create({
                employee: employeeId,
                company: employee.company,
                date: startOfDay,
                inTime: now,
                status: "Present"
            });

            return res.status(201).json({
                success: true,
                message: "IN time marked successfully",
                data: attendance
            });
        }

        // If inTime exists but outTime does not, mark Out
        if (attendance.inTime && !attendance.outTime) {
            const diffInMs = now.getTime() - attendance.inTime.getTime();
            const hours = diffInMs / (1000 * 60 * 60);

            attendance.outTime = now;
            attendance.workingHours = parseFloat(hours.toFixed(2));
            await attendance.save();

            return res.status(200).json({
                success: true,
                message: "OUT time marked successfully",
                data: attendance
            });
        }

        return res.status(400).json({
            success: false,
            message: "Attendance for both IN and OUT has already been marked for today"
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Daily Attendance Log for a month
 * @route   GET /api/attendance/log/:employeeId
 * @access  Private
 * @query   month (1-12), year (e.g. 2026)
 */
exports.getAttendanceLog = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Fetch logs sorted by date ascending
        const logs = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 }).lean();

        // Fetch approved gate passes for the same period
        const GatePass = require("../models/GatePass");
        const gatePasses = await GatePass.find({
            employee: employeeId,
            status: 1,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 }).lean();

        // Merge gate passes into logs
        const logsWithGatePasses = logs.map(log => {
            const dayGatePasses = gatePasses.filter(gp =>
                gp.date.toDateString() === log.date.toDateString()
            );
            return {
                ...log,
                gatePasses: dayGatePasses
            };
        });

        // Add logs for days that have gate passes but no attendance marked yet
        const attendanceDates = new Set(logs.map(l => l.date.toDateString()));
        gatePasses.forEach(gp => {
            const dateStr = gp.date.toDateString();
            if (!attendanceDates.has(dateStr)) {
                logsWithGatePasses.push({
                    employee: employeeId,
                    date: gp.date,
                    status: "Absent", // Or maybe just a placeholder
                    gatePasses: gatePasses.filter(g => g.date.toDateString() === dateStr)
                });
                attendanceDates.add(dateStr);
            }
        });

        // Sort final list by date
        logsWithGatePasses.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            success: true,
            data: logsWithGatePasses
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Dashboard Statistics for a month
 * @route   GET /api/attendance/stats/:employeeId
 * @access  Private
 * @query   month (1-12), year (e.g. 2026)
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Fetch Weekly Off assignment for the employee for this month/year
        const WeeklyOffAssignment = require("../models/WeeklyOffAssignment");
        const assignment = await WeeklyOffAssignment.findOne({
            employee: employeeId,
            month: month,
            year: year
        }).populate("template");

        const offDays = assignment?.template?.offDays || [0]; // Default to Sunday (0) if no assignment

        // Count Working Days in the given month (excluding Weekly Offs)
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= totalDaysInMonth; d++) {
            const tempDate = new Date(year, month - 1, d);
            if (!offDays.includes(tempDate.getDay())) workingDays++;
        }

        const stats = await Attendance.aggregate([
            {
                $match: {
                    employee: new require('mongoose').Types.ObjectId(employeeId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        let present = 0;
        let absent = 0;
        let leave = 0;

        stats.forEach(stat => {
            if (stat._id === "Present") present = stat.count;
            if (stat._id === "Absent") absent = stat.count;
            if (stat._id === "Leave") leave = stat.count;
        });

        // Determine elapsed working days until now
        const now = new Date();
        let elapsedWorkingDays = workingDays;

        if (now.getFullYear() === year && now.getMonth() + 1 === month) {
            elapsedWorkingDays = 0;
            for (let d = 1; d <= now.getDate(); d++) {
                const tempDate = new Date(year, month - 1, d);
                if (tempDate.getDay() !== 0) elapsedWorkingDays++;
            }
        } else if (now < startDate) {
            elapsedWorkingDays = 0;
        }

        // Calculate missing days as absent (excluding marked leave/present)
        const calculatedAbsent = elapsedWorkingDays - (present + leave);

        res.status(200).json({
            success: true,
            data: {
                totalWorkingDays: workingDays,
                present: present,
                absent: Math.max(0, calculatedAbsent + absent),
                leave: leave
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Company-wide Attendance Statistics
 * @route   GET /api/attendance/company-stats
 * @access  Private (Admin / Guard)
 */
/**
 * @desc    Get Company-wide Attendance Statistics
 * @route   GET /api/attendance/company-stats
 * @access  Private (Admin / Guard)
 */
exports.getCompanyAttendanceStats = asyncHandler(async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;

        if (!companyId) {
            return res.status(400).json(formatResponse(false, 'Company ID is required'));
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : todayStart;
        const end = endDate ? new Date(endDate) : todayEnd;

        if (endDate && !startDate) start.setTime(end.getTime() - (end.getTime() % (24 * 60 * 60 * 1000)));
        if (startDate && !endDate) end.setTime(start.getTime() + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + 59999);

        const mongoose = require('mongoose');
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        const stats = await AuthEmployee.aggregate([
            { $match: { company: companyObjectId, isActive: true } },
            {
                $lookup: {
                    from: "attendances",
                    let: { empId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $gte: ["$date", start] },
                                        { $lte: ["$date", end] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "attendanceRecords"
                }
            },
            // If it's a single day, we have at most 1 attendance record per employee
            // If it's a range, an employee might have multiple.
            // For dashboard simplicity (based on screenshot), we'll categorize the most recent or default to Absent.
            {
                $project: {
                    status: {
                        $cond: {
                            if: { $gt: [{ $size: "$attendanceRecords" }, 0] },
                            then: { $arrayElemAt: ["$attendanceRecords.status", 0] }, // Simplify to first found status in range
                            else: "Absent"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            present: 0,
            absent: 0,
            late: 0
        };

        stats.forEach(s => {
            if (s._id === "Present") result.present = s.count;
            if (s._id === "Absent") result.absent = s.count;
            if (s._id === "Late") result.late = s.count;
        });

        res.status(200).json(formatResponse(true, 'Attendance statistics retrieved successfully', result));

    } catch (error) {
        console.error('Get Company Attendance Stats Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
});

/**
 * @desc    Get Detailed Company Attendance List
 * @route   GET /api/attendance/company-list
 * @access  Private (Admin / Guard)
 */
exports.getCompanyAttendanceList = asyncHandler(async (req, res) => {
    try {
        const {
            companyId,
            startDate,
            endDate,
            search,
            status,
            department,
            page = 1,
            limit = 20,
        } = req.query;

        // ─── Validation ───────────────────────────────────────────────
        if (!companyId) {
            return res.status(400).json(formatResponse(false, "companyId is required"));
        }

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json(formatResponse(false, "Invalid companyId"));
        }

        // ─── Date Range (default = today) ─────────────────────────────
        const now = new Date();

        const start = startDate
            ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
            : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        const end = endDate
            ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
            : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // ─── Stage 1: Match attendance by company + date range ────────
        const attendanceMatchConditions = {
            company: new mongoose.Types.ObjectId(companyId),
            date: { $gte: start, $lte: end },
        };

        if (status) {
            const VALID_STATUSES = ["Present", "Absent", "Leave", "Half Day", "Weekly Off", "Holiday", "Late"];
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json(formatResponse(false, `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`));
            }
            attendanceMatchConditions.status = status;
        }

        const matchAttendance = {
            $match: attendanceMatchConditions,
        };

        // ─── Stage 2: Lookup employee (replaces populate) ─────────────
        const lookupEmployee = {
            $lookup: {
                from: "authemployees",                   // MongoDB collection name
                localField: "employee",
                foreignField: "_id",
                as: "employeeData",
                pipeline: [
                    {
                        $project: {
                            firstName: 1,
                            lastName: 1,
                            fullName: 1,
                            email: 1,
                            designation: 1,
                            department: 1,
                            isActive: 1,
                            image: 1,
                        },
                    },
                ],
            },
        };

        // ─── Stage 3: Unwind (one employee per attendance doc) ────────
        const unwindEmployee = {
            $unwind: {
                path: "$employeeData",
                preserveNullAndEmptyArrays: true,        // keep if employee deleted
            },
        };

        // ─── Stage 4: Dynamic filter on employee fields ───────────────
        const employeeMatchConditions = [
            { $eq: ["$employeeData.isActive", true] },   // always active only
        ];

        if (department) {
            employeeMatchConditions.push({
                $eq: ["$employeeData.department", department],
            });
        }

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            employeeMatchConditions.push({
                $or: [
                    { $regexMatch: { input: "$employeeData.fullName", regex } },
                    { $regexMatch: { input: "$employeeData.firstName", regex } },
                    { $regexMatch: { input: "$employeeData.lastName", regex } },
                    { $regexMatch: { input: "$employeeData.email", regex } },
                    { $regexMatch: { input: "$employeeData.designation", regex } },
                ],
            });
        }

        const matchEmployee = {
            $match: {
                $expr: { $and: employeeMatchConditions },
            },
        };

        // ─── Stage 5: Shape final output fields ───────────────────────
        const projectFields = {
            $project: {
                _id: 1,
                date: 1,
                inTime: 1,
                outTime: 1,
                workingHours: 1,
                status: 1,
                createdAt: 1,
                employee: "$employeeData",
            },
        };

        // ─── Stage 6: Sort ────────────────────────────────────────────
        const sortStage = {
            $sort: { date: -1, inTime: 1 },
        };

        // ─── Stage 7: Facet — data + total count in one query ─────────
        const facetStage = {
            $facet: {
                data: [
                    { $skip: skip },
                    { $limit: limitNum },
                ],
                totalCount: [
                    { $count: "count" },
                ],
            },
        };

        // ─── Build & Run Pipeline ─────────────────────────────────────
        const pipeline = [
            matchAttendance,
            lookupEmployee,
            unwindEmployee,
            matchEmployee,
            projectFields,
            sortStage,
            facetStage,
        ];

        const [result] = await Attendance.aggregate(pipeline);

        const records = result?.data || [];
        const total = result?.totalCount?.[0]?.count || 0;

        // ─── Response ─────────────────────────────────────────────────
        return res.status(200).json(formatResponse(true, "Attendance list retrieved successfully", records, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
            totalRecords: total
        }));


    } catch (err) {
        console.error("getCompanyAttendanceList error:", err);
        return res.status(500).json(formatResponse(false, "Server Error", null, { error: err.message }));
    }
});
