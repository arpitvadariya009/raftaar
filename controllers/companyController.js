const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const { formatResponse } = require('../utils/helpers');

// @desc    Get all customers/companies
// @route   GET /api/customers
// @access  Private/Admin
exports.getAllCompanies = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
        query.$or = [
            { companyName: { $regex: search, $options: 'i' } },
            { companyCode: { $regex: search, $options: 'i' } },
            { contactNumber: { $regex: search, $options: 'i' } },
            { hrName: { $regex: search, $options: 'i' } }
        ];
    }

    const companies = await Company.find(query)
        .populate('currentSubscription')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const count = await Company.countDocuments(query);

    res.json(formatResponse(true, 'Companies retrieved successfully', companies, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        totalRecords: count
    }));
});

// @desc    Register new company
// @route   POST /api/companies/register
// @access  Private/Admin
exports.registerCompany = asyncHandler(async (req, res) => {
    const company = await Company.create(req.body);
    res.status(201).json(formatResponse(true, 'Company registered successfully', company));
});

// @desc    Get company by ID
// @route   GET /api/customers/:id
// @access  Private/Admin
exports.getCompanyById = asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id).populate('currentSubscription');
    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }
    res.json(formatResponse(true, 'Company details retrieved', company));
});

// @desc    Update company
// @route   PUT /api/customers/:id
// @access  Private/Admin
exports.updateCompany = asyncHandler(async (req, res) => {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }
    res.json(formatResponse(true, 'Company updated successfully', company));
});

// @desc    Delete company
// @route   DELETE /api/customers/:id
// @access  Private/Admin
exports.deleteCompany = asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }
    await company.deleteOne();
    res.json(formatResponse(true, 'Company deleted successfully'));
});

// @desc    Toggle notification
// @route   PATCH /api/customers/:id/notification-toggle
// @access  Private/Admin
exports.toggleNotification = asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }
    company.notificationEnabled = !company.notificationEnabled;
    await company.save();
    res.json(formatResponse(true, `Notifications ${company.notificationEnabled ? 'enabled' : 'disabled'}`, { notificationEnabled: company.notificationEnabled }));
});

// @desc    Get expiring subscriptions
// @route   GET /api/customers/expiring-soon
// @access  Private/Admin
exports.getExpiringSoon = asyncHandler(async (req, res) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSubscriptions = await Subscription.find({
        validTill: { $gte: new Date(), $lte: thirtyDaysFromNow },
        status: 'Active'
    }).populate('company');

    res.json(formatResponse(true, 'Expiring subscriptions retrieved', expiringSubscriptions));
});

// @desc    Validate GST
// @route   POST /api/companies/validate-gst
// @access  Private/Admin
exports.validateGST = asyncHandler(async (req, res) => {
    const { gstNumber } = req.body;
    // Simple regex check (frontend logic mostly, but good for backend too)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const isValid = gstRegex.test(gstNumber);
    res.json(formatResponse(isValid, isValid ? 'Valid GST format' : 'Invalid GST format', { isValid }));
});
