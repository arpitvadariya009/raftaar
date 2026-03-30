const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Company = require('../models/Company');
const { calculateValidTill, formatResponse } = require('../utils/helpers');

/**
 * Helper: Calculate charge from plan prices × subscription counts × duration
 * Monthly: (basicCount × basicMonthlyPrice + proCount × proMonthlyPrice) × duration
 * Yearly:  (basicCount × basicYearlyPrice + proCount × proYearlyPrice) × years
 */
const calculateCharge = async (subscriptionType, billingType, duration) => {
    const { subscriptionTypeBasic = 0, subscriptionTypePro = 0 } = subscriptionType || {};

    const [basicPlan, proPlan] = await Promise.all([
        SubscriptionPlan.findOne({ planName: { $regex: /^basic$/i }, isActive: true }),
        SubscriptionPlan.findOne({ planName: { $regex: /^pro$/i }, isActive: true })
    ]);

    if (!basicPlan || !proPlan) {
        throw new Error('Subscription plans (Basic/Pro) not found. Please create them first.');
    }

    let charge = 0;
    if (billingType === 'Monthly') {
        charge = (subscriptionTypeBasic * basicPlan.monthlyPrice + subscriptionTypePro * proPlan.monthlyPrice) * duration;
    } else {
        const years = Math.ceil(duration / 12);
        charge = (subscriptionTypeBasic * basicPlan.yearlyPrice + subscriptionTypePro * proPlan.yearlyPrice) * years;
    }

    return charge;
};

/**
 * Helper: Get snapshot data for history logging
 */
const getSnapshotData = (subscription) => ({
    subscriptionTypeBasic: subscription.subscriptionType?.subscriptionTypeBasic || 0,
    subscriptionTypePro: subscription.subscriptionType?.subscriptionTypePro || 0,
    billingType: subscription.billingType,
    charge: subscription.charge,
    discount: subscription.discount,
    finalAmount: subscription.finalAmount
});

/**
 * Helper: Determine action type (Upgraded/Downgraded)
 */
const getActionType = (oldData, newData) => {
    const oldTotal = (oldData.subscriptionTypeBasic || 0) + (oldData.subscriptionTypePro || 0);
    const newTotal = (newData.subscriptionTypeBasic || 0) + (newData.subscriptionTypePro || 0);
    if (newTotal > oldTotal || newData.charge > oldData.charge) return 'Upgraded';
    if (newTotal < oldTotal || newData.charge < oldData.charge) return 'Downgraded';
    return 'Upgraded';
};

// @desc    Create new subscription (New Purchase / Renewal)
// @route   POST /api/subscriptions/createSubscription
// @access  Private/Admin
exports.createSubscription = asyncHandler(async (req, res) => {
    try {
        const { company, subscriptionType, billingType, startDate, duration, discount = 0 } = req.body;

        // Auto-calculate charge from plan prices
        const charge = await calculateCharge(subscriptionType, billingType, duration);

        // Calculate final amount after discount
        const finalAmount = charge - discount;
        if (finalAmount < 0) {
            return res.status(400).json(formatResponse(false, 'Discount cannot be greater than the charge'));
        }

        // Calculate valid till date
        const validTill = calculateValidTill(new Date(startDate), duration);

        // Check if company has active subscription — if yes, expire it (Renewal flow)
        const activeSubscription = await Subscription.findOne({ company, status: 'Active' });
        if (activeSubscription) {
            activeSubscription.status = 'Expired';
            await activeSubscription.save();

            await SubscriptionHistory.create({
                subscription: activeSubscription._id,
                company,
                action: 'Renewed',
                previousData: getSnapshotData(activeSubscription),
                newData: {},
                remarks: 'Subscription expired due to renewal with new subscription'
            });
        }

        const subscription = await Subscription.create({
            company,
            subscriptionType: subscriptionType || {},
            billingType,
            charge,
            discount,
            finalAmount,
            startDate,
            duration,
            validTill
        });

        // Log creation history
        await SubscriptionHistory.create({
            subscription: subscription._id,
            company,
            action: 'Created',
            previousData: {},
            newData: getSnapshotData(subscription),
            remarks: activeSubscription ? 'Renewal - new subscription created' : 'New subscription created'
        });

        // Update company status to Active
        await Company.findByIdAndUpdate(company, { status: 'Active' });

        res.status(201).json(formatResponse(true, 'Subscription created successfully', subscription));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get all subscriptions
// @route   GET /api/subscriptions/getAllSubscriptions
// @access  Private/Admin
exports.getAllSubscriptions = asyncHandler(async (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get subscriptions expiring within 1 month
// @route   GET /api/subscriptions/getExpiringSubscriptions
// @access  Private/Admin
exports.getExpiringSubscriptions = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const now = new Date();
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        const query = {
            status: 'Active',
            validTill: { $gte: now, $lte: oneMonthLater }
        };

        const subscriptions = await Subscription.find(query)
            .populate('company', 'companyName companyCode')
            .sort({ validTill: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Subscription.countDocuments(query);

        res.json(formatResponse(true, 'Expiring subscriptions retrieved successfully', subscriptions, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
            totalRecords: count
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get company subscriptions (all history)
// @route   GET /api/subscriptions/getCompanySubscriptions/:companyId
// @access  Private/Admin
exports.getCompanySubscriptions = asyncHandler(async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ company: req.params.companyId })
            .sort({ createdAt: -1 });
        res.json(formatResponse(true, 'Company subscriptions retrieved', subscriptions));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update subscription (Upgrade/Downgrade mid-term)
// @route   PUT /api/subscriptions/updateSubscription/:id
// @access  Private/Admin
exports.updateSubscription = asyncHandler(async (req, res) => {
    try {
        const { startDate, duration, subscriptionType, billingType, discount, remarks } = req.body;

        const existing = await Subscription.findById(req.params.id);
        if (!existing) {
            return res.status(404).json(formatResponse(false, 'Subscription not found'));
        }

        // Save previous data for history
        const previousData = getSnapshotData(existing);

        let updateData = { ...req.body };

        // Recalculate charge
        const finalSubType = subscriptionType || existing.subscriptionType;
        const finalBilling = billingType || existing.billingType;
        const finalDuration = duration || existing.duration;

        const charge = await calculateCharge(finalSubType, finalBilling, finalDuration);
        updateData.charge = charge;

        // Recalculate final amount
        const finalDiscount = discount !== undefined ? discount : existing.discount;
        updateData.discount = finalDiscount;
        updateData.finalAmount = charge - finalDiscount;

        if (updateData.finalAmount < 0) {
            return res.status(400).json(formatResponse(false, 'Discount cannot be greater than the charge'));
        }

        if (startDate && (duration || existing.duration)) {
            updateData.validTill = calculateValidTill(new Date(startDate), duration || existing.duration);
        }

        // Remove remarks from updateData (it's not a subscription field)
        delete updateData.remarks;

        const subscription = await Subscription.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        // Determine action type and log history
        const newData = getSnapshotData(subscription);
        const action = getActionType(previousData, newData);

        await SubscriptionHistory.create({
            subscription: subscription._id,
            company: subscription.company,
            action,
            previousData,
            newData,
            remarks: remarks || `Subscription ${action.toLowerCase()}`
        });

        res.json(formatResponse(true, 'Subscription updated successfully', subscription));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Cancel subscription
// @route   DELETE /api/subscriptions/cancelSubscription/:id
// @access  Private/Admin
exports.cancelSubscription = asyncHandler(async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json(formatResponse(false, 'Subscription not found'));
        }

        // Save previous data for history
        const previousData = getSnapshotData(subscription);

        subscription.status = 'Expired';
        await subscription.save();

        // Log cancellation history
        await SubscriptionHistory.create({
            subscription: subscription._id,
            company: subscription.company,
            action: 'Cancelled',
            previousData,
            newData: { ...previousData, finalAmount: 0 },
            remarks: 'Subscription cancelled by admin'
        });

        res.json(formatResponse(true, 'Subscription cancelled successfully'));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get subscription change history
// @route   GET /api/subscriptions/getHistory/:subscriptionId
// @access  Private/Admin
exports.getSubscriptionHistory = asyncHandler(async (req, res) => {
    try {
        const history = await SubscriptionHistory.find({ subscription: req.params.subscriptionId })
            .sort({ createdAt: -1 });

        res.json(formatResponse(true, 'Subscription history retrieved', history));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get all history for a company
// @route   GET /api/subscriptions/getCompanyHistory/:companyId
// @access  Private/Admin
exports.getCompanyHistory = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const history = await SubscriptionHistory.find({ company: req.params.companyId })
            .populate('subscription')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await SubscriptionHistory.countDocuments({ company: req.params.companyId });

        res.json(formatResponse(true, 'Company subscription history retrieved', history, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
            totalRecords: count
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
