const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Company = require('../models/Company');
const { calculateValidTill, formatResponse } = require('../utils/helpers');

// @desc    Create new subscription
// @route   POST /api/subscriptions
// @access  Private/Admin
exports.createSubscription = asyncHandler(async (req, res) => {
    const { company, startDate, duration } = req.body;

    // Calculate valid till date
    const validTill = calculateValidTill(new Date(startDate), duration);

    const subscription = await Subscription.create({
        ...req.body,
        validTill
    });

    res.status(201).json(formatResponse(true, 'Subscription created successfully', subscription));
});

// @desc    Get all subscriptions
// @route   GET /api/subscriptions
// @access  Private/Admin
exports.getAllSubscriptions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, companyId, status } = req.query;

    const query = {};
    if (companyId) query.company = companyId;
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
        .populate('company', 'companyName companyCode')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const count = await Subscription.countDocuments(query);

    res.json(formatResponse(true, 'Subscriptions retrieved successfully', subscriptions, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        totalRecords: count
    }));
});

// @desc    Get company subscriptions
// @route   GET /api/subscriptions/company/:companyId
// @access  Private/Admin
exports.getCompanySubscriptions = asyncHandler(async (req, res) => {
    const subscriptions = await Subscription.find({ company: req.params.companyId }).sort({ createdAt: -1 });
    res.json(formatResponse(true, 'Company subscriptions retrieved', subscriptions));
});

// @desc    Update subscription
// @route   PUT /api/subscriptions/:id
// @access  Private/Admin
exports.updateSubscription = asyncHandler(async (req, res) => {
    const { startDate, duration } = req.body;

    let updateData = { ...req.body };
    if (startDate && duration) {
        updateData.validTill = calculateValidTill(new Date(startDate), duration);
    }

    const subscription = await Subscription.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
    });

    if (!subscription) {
        res.status(404);
        throw new Error('Subscription not found');
    }

    res.json(formatResponse(true, 'Subscription updated successfully', subscription));
});

// @desc    Cancel subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private/Admin
exports.cancelSubscription = asyncHandler(async (req, res) => {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
        res.status(404);
        throw new Error('Subscription not found');
    }

    subscription.status = 'Expired'; // Or delete it, but usually soft delete/status update is better
    await subscription.save();

    res.json(formatResponse(true, 'Subscription cancelled successfully'));
});
