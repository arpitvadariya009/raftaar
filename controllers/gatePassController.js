const GatePass = require("../models/GatePass");
const AuthEmployee = require("../models/AuthEmployee.model");
const Subscription = require("../models/Subscription");
const mongoose = require("mongoose");

/**
 * @desc    Apply for Gate Pass
 * @route   POST /api/gate-passes/apply
 * @access  Private (Employee)
 */
exports.applyGatePass = async (req, res, next) => {
    try {
        const { employeeId, companyId, gatePassType, date, startTime, endTime, reason } = req.body;

        if (!employeeId || !companyId || !gatePassType || !date || !startTime || !endTime || !reason) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Subscription check
        const activeSubscription = await Subscription.findOne({ company: companyId, status: 'Active' });
        if (!activeSubscription) {
            return res.status(403).json({ success: false, message: "No active subscription found for this company" });
        }

        const newGatePass = await GatePass.create({
            employee: employeeId,
            company: companyId,
            gatePassType,
            date,
            startTime,
            endTime,
            reason
        });

        res.status(201).json({
            success: true,
            message: "Gate Pass application submitted successfully",
            data: newGatePass
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all gate pass requests for a company
 * @route   GET /api/gate-passes/company/:companyId
 * @access  Private (Company/HR)
 */
exports.getAllGatePasses = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 10, search, status, sortBy = 'createdAt', order = 'desc', startDate, endDate } = req.query;

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
        if (status) {
            pipeline.push({ $match: { status } });
        }

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "employee.fullName": { $regex: search, $options: "i" } },
                        { "employee.firstName": { $regex: search, $options: "i" } },
                        { "employee.lastName": { $regex: search, $options: "i" } },
                        { "employee.department": { $regex: search, $options: "i" } }
                    ]
                }
            });
        }

        // Date Range Filter
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            pipeline.push({ $match: { date: dateFilter } });
        }

        // Sorting  
        pipeline.push({ $sort: { [sortBy]: sortOrder } });

        // Clone for Count Pipeline
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await GatePass.aggregate(countPipeline);
        const totalRecords = countResult[0] ? countResult[0].total : 0;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        const gatePasses = await GatePass.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: gatePasses,
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
 * @desc    Get gate pass stats for dashboard
 * @route   GET /api/gate-passes/stats/:companyId
 * @access  Private
 */
exports.getGatePassStats = async (req, res, next) => {
    try {
        const { companyId } = req.params;

        const stats = await GatePass.aggregate([
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
 * @desc    Update gate pass status (Approve/Reject)
 * @route   PUT /api/gate-passes/status/:id
 * @access  Private (Company/HR)
 */
exports.updateGatePassStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (![0, 1, 2, 3, 4].includes(Number(status))) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const updatedGatePass = await GatePass.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate("employee", "dateOfJoining department fullName lastName firstName image _id");

        if (!updatedGatePass) {
            return res.status(404).json({ success: false, message: "Gate Pass request not found" });
        }

        res.status(200).json({
            success: true,
            message: `Gate Pass request status updated successfully`,
            data: updatedGatePass
        });
    } catch (error) {
        next(error);
    }
};
