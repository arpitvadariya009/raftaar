const LeaveRequest = require("../models/LeaveRequest");
const AuthEmployee = require("../models/AuthEmployee.model");
const mongoose = require("mongoose");

/**
 * @desc    Apply for leave
 * @route   POST /api/leaves/apply
 * @access  Private (Employee)
 */
exports.applyLeave = async (req, res, next) => {
    try {
        const { employeeId, companyId, leaveType, fromDate, toDate, leaveTime, reason } = req.body;

        if (!employeeId || !companyId || !leaveType || !fromDate || !toDate || !reason) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const newLeave = await LeaveRequest.create({
            employee: employeeId,
            company: companyId,
            leaveType,
            fromDate,
            toDate,
            leaveTime,
            reason
        });

        res.status(201).json({
            success: true,
            message: "Leave application submitted successfully",
            data: newLeave
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all leave requests for a company
 * @route   GET /api/leaves/company/:companyId
 * @access  Private (Company/HR)
 */
exports.getAllLeaves = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 10, search, status, sortBy = 'createdAt', order = 'desc', isExport } = req.query;

        const sortOrder = order === 'desc' ? -1 : 1;

        // Base Pipeline
        const pipeline = [
            { $match: { company: new mongoose.Types.ObjectId(companyId) } },
            {
                $lookup: {
                    from: "authemployees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employee",
                    pipeline: [
                        {
                            $project: {
                                dateOfJoining: 1,
                                department: 1,
                                fullName: 1,
                                lastName: 1,
                                firstName: 1,
                                image: 1,
                                _id: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: "$employee" }
        ];

        // Filters
        if (status !== undefined && status !== "") {
            pipeline.push({ $match: { status: Number(status) } });
        }

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "employee.fullName": { $regex: search, $options: "i" } },
                        { "employee.employeeId": { $regex: search, $options: "i" } },
                        { "employee.department": { $regex: search, $options: "i" } }
                    ]
                }
            });
        }

        // Sorting
        pipeline.push({ $sort: { [sortBy]: sortOrder } });

        // Clone for Count Pipeline
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await LeaveRequest.aggregate(countPipeline);
        const totalRecords = countResult[0] ? countResult[0].total : 0;

        // Data Pipeline (Skip/Limit only if not exporting)
        if (isExport !== 'true' && isExport !== true) {
            const skip = (parseInt(page) - 1) * parseInt(limit);
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: parseInt(limit) });
        }

        const leaves = await LeaveRequest.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: leaves,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get leave stats for dashboard
 * @route   GET /api/leaves/stats/:companyId
 * @access  Private
 */
exports.getLeaveStats = async (req, res, next) => {
    try {
        const { companyId } = req.params;

        const stats = await LeaveRequest.aggregate([
            { $match: { company: new mongoose.Types.ObjectId(companyId) } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0
        };

        stats.forEach(stat => {
            result.total += stat.count;
            if (stat._id === 0) result.pending = stat.count;
            if (stat._id === 1) result.approved = stat.count;
            if (stat._id === 2) result.rejected = stat.count;
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update leave status (Approve/Reject)
 * @route   PUT /api/leaves/status/:leaveId
 * @access  Private (Company/HR)
 */
exports.updateLeaveStatus = async (req, res, next) => {
    try {
        const { leaveId } = req.params;
        const { status } = req.body;

        // 1: Approved, 2: Rejected
        if (![1, 2].includes(Number(status))) {
            return res.status(400).json({ success: false, message: "Invalid status. Use 1 for Approved or 2 for Rejected." });
        }

        const updatedLeave = await LeaveRequest.findByIdAndUpdate(
            leaveId,
            { status },
            { new: true }
        ).populate("employee", "dateOfJoining department fullName lastName firstName image _id");

        if (!updatedLeave) {
            return res.status(404).json({ success: false, message: "Leave request not found" });
        }

        res.status(200).json({
            success: true,
            message: `Leave request ${status == 1 ? 'approved' : 'rejected'} successfully`,
            data: updatedLeave
        });
    } catch (error) {
        next(error);
    }
};
