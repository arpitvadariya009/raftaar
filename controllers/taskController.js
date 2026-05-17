const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { formatResponse } = require('../utils/helpers');

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = asyncHandler(async (req, res) => {
    try {
        const { title, description, date, time, priority, assignee, location, companyId, parentTask } = req.body;

        const task = await Task.create({
            title,
            description,
            date: new Date(date),
            time,
            priority,
            assignee,
            location,
            company: companyId,
            createdBy: req.user?._id,
            parentTask
        });

        // 🔔 Notification: New Task Assigned
        if (assignee) {
            await Notification.create({
                recipient: assignee,
                company: companyId,
                title: 'New Task Assigned 📋',
                message: `You have been assigned a new task: "${title}"`,
                type: 'New Task Assigned',
                relatedId: task._id,
                onModel: 'Task'
            });
        }

        res.status(201).json(formatResponse(true, 'Task created successfully', task));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get tasks for an employee
// @route   GET /api/tasks?date=2026-04-18&employeeId=...
// @access  Private
exports.getTasks = asyncHandler(async (req, res) => {
    try {
        const { date, employeeId, companyId, status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (employeeId) query.assignee = employeeId;
        if (companyId) query.company = companyId;
        if (status) query.status = status;

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const pageNum  = parseInt(page);
        const limitNum = parseInt(limit);
        const skip     = (pageNum - 1) * limitNum;

        const totalCount = await Task.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limitNum);

        const tasks = await Task.find(query)
            .populate('assignee', 'firstName lastName fullName image department')
            .sort({ time: 1 })
            .skip(skip)
            .limit(limitNum);

        res.json(formatResponse(true, 'Tasks retrieved successfully', {
            tasks,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                limit: limitNum,
            }
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = asyncHandler(async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        res.json(formatResponse(true, 'Task status updated successfully', task));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get task stats (for Approvals screen)
// @route   GET /api/tasks/stats?companyId=...
// @access  Private
exports.getTaskStats = asyncHandler(async (req, res) => {
    try {
        const { companyId, employeeId, date, startDate, endDate } = req.query;

        const query = {};

        if (companyId) query.company = new mongoose.Types.ObjectId(companyId);
        if (employeeId) query.assignee = new mongoose.Types.ObjectId(employeeId);

        // Single date filter
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        // Date range filter (startDate to endDate)
        if (!date && (startDate || endDate)) {
            query.date = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                query.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const stats = await Task.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedStats = {
            Total: 0,
            Completed: 0,
            'In Progress': 0,
            Pending: 0,
            Overdue: 0
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
            formattedStats.Total += stat.count;
        });

        res.json(formatResponse(true, 'Task stats retrieved successfully', formattedStats));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
