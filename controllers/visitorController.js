const asyncHandler = require('express-async-handler');
const Visitor = require('../models/Visitor');
const { formatResponse } = require('../utils/helpers');

// @desc    Register a new visitor
// @route   POST /api/visitors/createVisitor
// @access  Private
exports.createVisitor = asyncHandler(async (req, res) => {
    try {
        const visitorData = { ...req.body };
        if (req.file) {
            visitorData.image = req.file.path.replace(/\\/g, '/');
        }
        const visitor = await Visitor.create(visitorData);
        res.status(201).json(formatResponse(true, 'Visitor registered successfully', visitor));
    } catch (error) {

        res.status(500).json(formatResponse(false, error.message));
    }
});



// @desc    Get all visitors with search, filtering, and pagination
// @route   GET /api/visitors/getAllVisitors
// @access  Private
exports.getVisitors = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            company,
            startDate,
            endDate,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const query = {};

        // Status Filter
        if (status) query.status = status;

        // Company Filter
        if (company) query.company = company;

        // Time Range Filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search logic (Name, contact, or meetWith)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contactNumber: { $regex: search, $options: 'i' } },
                { meetWith: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === 'desc' ? -1 : 1;

        const visitors = await Visitor.find(query)
            .populate('company', 'companyName companyCode')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRecords = await Visitor.countDocuments(query);

        res.json(formatResponse(true, 'Visitors retrieved successfully', visitors, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords: totalRecords
        }));

    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get single visitor by ID
// @route   GET /api/visitors/getVisitorById/:id
// @access  Private
exports.getVisitorById = asyncHandler(async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id).populate('company', 'companyName companyCode');
        if (!visitor) {
            res.status(404);
            throw new Error('Visitor not found');
        }
        res.json(formatResponse(true, 'Visitor details retrieved', visitor));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update visitor details
// @route   PUT /api/visitors/updateVisitor/:id
// @access  Private
exports.updateVisitor = asyncHandler(async (req, res) => {
    try {
        const visitorData = { ...req.body };
        if (req.file) {
            visitorData.image = req.file.path.replace(/\\/g, '/');
        }

        const visitor = await Visitor.findById(req.params.id);
        if (!visitor) {
            res.status(404);
            throw new Error('Visitor not found');
        }

        const updatedVisitor = await Visitor.findByIdAndUpdate(
            req.params.id,
            visitorData,
            { new: true, runValidators: true }
        );

        res.json(formatResponse(true, 'Visitor updated successfully', updatedVisitor));
    } catch (error) {

        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update visitor status (Check-out)
// @route   PATCH /api/visitors/updateStatus/:id
// @access  Private
exports.updateStatus = asyncHandler(async (req, res) => {
    try {
        const { status } = req.body;
        const visitor = await Visitor.findById(req.params.id);

        if (!visitor) {
            res.status(404);
            throw new Error('Visitor not found');
        }

        visitor.status = status;

        // If status is OUT, set checkOutTime
        if (status === 'OUT') {
            visitor.checkOutTime = Date.now();
        }

        await visitor.save();

        res.json(formatResponse(true, `Visitor status updated to ${status}`, visitor));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
