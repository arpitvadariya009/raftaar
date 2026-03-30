const WeeklyOffTemplate = require("../models/WeeklyOffTemplate");
const WeeklyOffAssignment = require("../models/WeeklyOffAssignment");
const AuthEmployee = require("../models/AuthEmployee.model");
const mongoose = require("mongoose");

/**
 * @desc    Create Weekly Off Template
 * @route   POST /api/weekly-off/template
 * @access  Private (Company/HR)
 */
exports.createTemplate = async (req, res, next) => {
    try {
        const { name, offDays, companyId } = req.body;

        if (!name || !offDays || !companyId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const template = await WeeklyOffTemplate.create({
            name,
            offDays,
            company: companyId
        });

        res.status(201).json({
            success: true,
            message: "Weekly Off Template created successfully",
            data: template
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all templates for a company
 * @route   GET /api/weekly-off/templates/:companyId
 * @access  Private
 */
exports.getAllTemplates = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const templates = await WeeklyOffTemplate.find({ company: companyId });

        res.status(200).json({
            success: true,
            data: templates
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update Weekly Off Template
 * @route   PUT /api/weekly-off/template/:id
 * @access  Private (Company/HR)
 */
exports.updateTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, offDays } = req.body;

        const template = await WeeklyOffTemplate.findByIdAndUpdate(
            id,
            { name, offDays },
            { new: true, runValidators: true }
        );

        if (!template) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        res.status(200).json({
            success: true,
            message: "Weekly Off Template updated successfully",
            data: template
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Duplicate Weekly Off Template
 * @route   POST /api/weekly-off/template/duplicate/:id
 * @access  Private (Company/HR)
 */
exports.duplicateTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const originalTemplate = await WeeklyOffTemplate.findById(id);
        if (!originalTemplate) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        const newTemplate = await WeeklyOffTemplate.create({
            name: name || `${originalTemplate.name} (Copy)`,
            offDays: originalTemplate.offDays,
            company: originalTemplate.company
        });

        res.status(201).json({
            success: true,
            message: "Weekly Off Template duplicated successfully",
            data: newTemplate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Assign Weekly Off Template to Employee
 * @route   POST /api/weekly-off/assign
 * @access  Private (Company/HR)
 */
exports.assignWeeklyOff = async (req, res, next) => {
    try {
        const { employeeId, templateId, month, year, companyId } = req.body;

        if (!employeeId || !templateId || !month || !year || !companyId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Upsert assignment
        const assignment = await WeeklyOffAssignment.findOneAndUpdate(
            { employee: employeeId, month, year },
            { template: templateId, company: companyId },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Weekly Off assigned successfully",
            data: assignment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Month Wise Assignments
 * @route   GET /api/weekly-off/assignments/:companyId
 * @access  Private
 */
exports.getMonthWiseAssignments = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const { month, year, search } = req.query;

        const currentMonth = parseInt(month) || new Date().getMonth() + 1;
        const currentYear = parseInt(year) || new Date().getFullYear();

        const pipeline = [
            { 
                $match: { 
                    company: new mongoose.Types.ObjectId(companyId),
                    month: currentMonth,
                    year: currentYear
                } 
            },
            {
                $lookup: {
                    from: "authemployees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employee"
                }
            },
            { $unwind: "$employee" },
            {
                $lookup: {
                    from: "weeklyofftemplates",
                    localField: "template",
                    foreignField: "_id",
                    as: "template"
                }
            },
            { $unwind: "$template" }
        ];

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "employee.fullName": { $regex: search, $options: "i" } },
                        { "employee.department": { $regex: search, $options: "i" } }
                    ]
                }
            });
        }

        const assignments = await WeeklyOffAssignment.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: assignments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Employee Wise Assignments (Latest for each employee)
 * @route   GET /api/weekly-off/employee-wise/:companyId
 * @access  Private
 */
exports.getEmployeeWiseAssignments = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const { search } = req.query;

        // Base matching query for employees
        const matchQuery = { company: new mongoose.Types.ObjectId(companyId) };

        if (search) {
            matchQuery.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { department: { $regex: search, $options: "i" } }
            ];
        }

        const pipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: "weeklyoffassignments",
                    let: { employeeId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$employee", "$$employeeId"] } } },
                        { $sort: { year: -1, month: -1 } },
                        { $limit: 1 }
                    ],
                    as: "latestAssignment"
                }
            },
            { $unwind: { path: "$latestAssignment", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "weeklyofftemplates",
                    localField: "latestAssignment.template",
                    foreignField: "_id",
                    as: "template"
                }
            },
            { $unwind: { path: "$template", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    firstName: 1,
                    lastName: 1,
                    department: 1,
                    designation: 1,
                    image: 1,
                    latestAssignment: {
                        month: "$latestAssignment.month",
                        year: "$latestAssignment.year",
                        templateName: "$template.name",
                        offDays: "$template.offDays"
                    }
                }
            }
        ];

        const employees = await AuthEmployee.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: employees
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Weekly Off Dashboard Stats
 * @route   GET /api/weekly-off/stats/:companyId
 * @access  Private
 */
exports.getWeeklyOffStats = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();

        const [templatesCount, assignedCount, mostUsed] = await Promise.all([
            WeeklyOffTemplate.countDocuments({ company: companyId }),
            WeeklyOffAssignment.countDocuments({ company: companyId, month, year }),
            WeeklyOffAssignment.aggregate([
                { $match: { company: new mongoose.Types.ObjectId(companyId), month, year } },
                { $group: { _id: "$template", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 },
                {
                    $lookup: {
                        from: "weeklyofftemplates",
                        localField: "_id",
                        foreignField: "_id",
                        as: "template"
                    }
                },
                { $unwind: { path: "$template", preserveNullAndEmptyArrays: true } }
            ])
        ]);

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        res.status(200).json({
            success: true,
            data: {
                totalTemplates: templatesCount,
                employeesAssigned: assignedCount,
                currentMonth: months[month - 1],
                mostUsedTemplate: mostUsed[0]?.template?.name || "None"
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete Weekly Off Template
 * @route   DELETE /api/weekly-off/template/:id
 * @access  Private (Company/HR)
 */
exports.deleteTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if template is assigned
        const isAssigned = await WeeklyOffAssignment.findOne({ template: id });
        if (isAssigned) {
            return res.status(400).json({ 
                success: false, 
                message: "Cannot delete template as it is assigned to employees. Please remove assignments first." 
            });
        }

        await WeeklyOffTemplate.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Weekly Off Template deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
