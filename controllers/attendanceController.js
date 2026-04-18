const Attendance = require("../models/Attendance");
const AuthEmployee = require("../models/AuthEmployee.model");

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
exports.getCompanyAttendanceStats = async (req, res, next) => {
    try {
        const { companyId, startDate, endDate } = req.query;

        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : todayStart;
        const end = endDate ? new Date(endDate) : todayEnd;

        if (endDate && !startDate) start.setTime(end.getTime() - (end.getTime() % (24 * 60 * 60 * 1000)));
        if (startDate && !endDate) end.setTime(start.getTime() + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + 59999);

        // Run queries in parallel
        const [totalEmployees, attendanceStats] = await Promise.all([
            AuthEmployee.countDocuments({ company: companyId, isActive: true }),
            Attendance.aggregate([
                {
                    $match: {
                        company: new require('mongoose').Types.ObjectId(companyId),
                        date: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        let present = 0;
        let absent = 0;
        let late = 0;
        let leave = 0;
        let halfDay = 0;

        attendanceStats.forEach(stat => {
            if (stat._id === "Present") present = stat.count;
            if (stat._id === "Late") late = stat.count;
            if (stat._id === "Absent") absent = stat.count;
            if (stat._id === "Leave") leave = stat.count;
            if (stat._id === "Half Day") halfDay = stat.count;
        });

        // If today, calculate missing employees as absent
        const now = new Date();
        let calculatedAbsent = absent;
        if (start <= now && end >= now) {
            const accountedFor = present + late + leave + halfDay + absent;
            calculatedAbsent = Math.max(0, totalEmployees - accountedFor) + absent;
        }

        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                present: present,
                late: late,
                absent: calculatedAbsent,
                leave: leave,
                halfDay: halfDay
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Detailed Company Attendance List
 * @route   GET /api/attendance/company-list
 * @access  Private (Admin / Guard)
 */
exports.getCompanyAttendanceList = async (req, res, next) => {
    try {
        const { companyId, startDate, endDate, search, department } = req.query;

        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : todayStart;
        const end = endDate ? new Date(endDate) : todayEnd;

        // Fetch all active employees matching filters
        const employeeQuery = { company: companyId, isActive: true };
        if (department) employeeQuery.department = department;
        if (search) {
            employeeQuery.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { fullName: { $regex: search, $options: "i" } }
            ];
        }

        const employees = await AuthEmployee.find(employeeQuery)
            .select("firstName lastName fullName department image")
            .lean();

        // Fetch attendance records in date range
        const attendanceRecords = await Attendance.find({
            company: companyId,
            date: { $gte: start, $lte: end }
        }).lean();

        // Merge logic
        // If it's a single day check, we show all employees (Left Join)
        // If it's a range, we show all attendance records found (Inner Join pattern usually better for logs)
        
        const isSingleDay = start.toDateString() === end.toDateString();

        let result = [];

        if (isSingleDay) {
            result = employees.map(emp => {
                const record = attendanceRecords.find(r => r.employee.toString() === emp._id.toString());
                return {
                    employee: emp,
                    checkIn: record?.inTime || null,
                    checkOut: record?.outTime || null,
                    status: record?.status || "Absent",
                    workingHours: record?.workingHours || 0
                };
            });
        } else {
            result = attendanceRecords.map(record => {
                const emp = employees.find(e => e._id.toString() === record.employee.toString());
                if (!emp) return null; // Filtered out by employee search/dept
                return {
                    employee: emp,
                    date: record.date,
                    checkIn: record.inTime,
                    checkOut: record.outTime,
                    status: record.status,
                    workingHours: record.workingHours
                };
            }).filter(item => item !== null);
        }

        res.status(200).json({
            success: true,
            totalRows: result.length,
            data: result
        });

    } catch (error) {
        next(error);
    }
};
