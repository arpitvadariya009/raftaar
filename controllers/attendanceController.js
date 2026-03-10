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
        }).sort({ date: 1 });

        res.status(200).json({
            success: true,
            data: logs
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

        // Count Working Days in the given month (excluding Sundays)
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= totalDaysInMonth; d++) {
            const tempDate = new Date(year, month - 1, d);
            if (tempDate.getDay() !== 0) workingDays++; // Exclude Sunday
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
