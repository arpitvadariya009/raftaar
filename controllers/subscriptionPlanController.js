const asyncHandler = require('express-async-handler');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { formatResponse } = require('../utils/helpers');

// @desc    Create a new subscription plan
// @route   POST /api/subscription-plans/createPlan
// @access  Private/Admin
exports.createPlan = asyncHandler(async (req, res) => {
    try {
        const plan = await SubscriptionPlan.create(req.body);
        res.status(201).json(formatResponse(true, 'Subscription plan created successfully', plan));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get all subscription plans
// @route   GET /api/subscription-plans/getAllPlans
// @access  Private/Admin
exports.getAllPlans = asyncHandler(async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
        res.json(formatResponse(true, 'Subscription plans retrieved successfully', plans));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get single plan details
// @route   GET /api/subscription-plans/getPlan/:id
// @access  Private/Admin
exports.getPlan = asyncHandler(async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) {
            res.status(404);
            throw new Error('Subscription plan not found');
        }
        res.json(formatResponse(true, 'Subscription plan details retrieved', plan));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update a subscription plan
// @route   PUT /api/subscription-plans/updatePlan/:id
// @access  Private/Admin
exports.updatePlan = asyncHandler(async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!plan) {
            res.status(404);
            throw new Error('Subscription plan not found');
        }
        res.json(formatResponse(true, 'Subscription plan updated successfully', plan));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Soft delete a subscription plan
// @route   DELETE /api/subscription-plans/deletePlan/:id
// @access  Private/Admin
exports.deletePlan = asyncHandler(async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) {
            res.status(404);
            throw new Error('Subscription plan not found');
        }
        plan.isActive = false;
        await plan.save();
        res.json(formatResponse(true, 'Subscription plan deleted (deactivated) successfully'));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});