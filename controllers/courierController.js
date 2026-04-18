const asyncHandler = require('express-async-handler');
const Courier = require('../models/Courier');
const { formatResponse } = require('../utils/helpers');

// @desc    Create a new courier
// @route   POST /api/couriers/createCourier
// @access  Private
exports.createCourier = asyncHandler(async (req, res) => {
    try {
        const courierData = { ...req.body };
        if (req.file) {
            courierData.image = req.file.filename;
        }
        const courier = await Courier.create(courierData);
        res.status(201).json(formatResponse(true, 'Courier entry created successfully', courier));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get all couriers with search, filtering, and pagination
// @route   GET /api/couriers/getAllCouriers
// @access  Private
exports.getCouriers = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            courierType,
            company,
            employee,
            startDate,
            endDate,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const query = {};

        // Filters
        if (courierType) query.courierType = courierType;
        if (company) query.company = company;
        if (employee) query.employee = employee;

        // Date Range Filter (based on createdAt)
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search logic
        if (search) {
            query.$or = [
                { courierCompany: { $regex: search, $options: 'i' } },
                { fromOrTo: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === 'desc' ? -1 : 1;

        const couriers = await Courier.find(query)
            .populate('company', 'companyName companyCode')
            .populate('employee', 'firstName lastName fullName')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRecords = await Courier.countDocuments(query);

        res.json(formatResponse(true, 'Couriers retrieved successfully', couriers, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords: totalRecords
        }));

    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get single courier by ID
// @route   GET /api/couriers/getCourierById/:id
// @access  Private
exports.getCourierById = asyncHandler(async (req, res) => {
    try {
        const courier = await Courier.findById(req.params.id)
            .populate('company', 'companyName companyCode')
            .populate('employee', 'firstName lastName fullName');
        
        if (!courier) {
            return res.status(404).json(formatResponse(false, 'Courier entry not found'));
        }
        res.json(formatResponse(true, 'Courier details retrieved', courier));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update courier details
// @route   PUT /api/couriers/updateCourier/:id
// @access  Private
exports.updateCourier = asyncHandler(async (req, res) => {
    try {
        const courier = await Courier.findById(req.params.id);
        if (!courier) {
            return res.status(404).json(formatResponse(false, 'Courier entry not found'));
        }

        const updateData = { ...req.body };
        if (req.file) {
            updateData.image = req.file.filename;
        }

        const updatedCourier = await Courier.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json(formatResponse(true, 'Courier updated successfully', updatedCourier));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
