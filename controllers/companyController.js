const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const jwt = require('jsonwebtoken');
const { formatResponse, generatePassword } = require('../utils/helpers');
const mailService = require('../utils/mail.service');

// @desc    Get all customers/companies
// @route   GET /api/customers
// @access  Private/Admin

exports.getAllCompanies = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

        const matchStage = {};

        if (status) {
            matchStage.status = status;
        }

        if (search) {
            matchStage.$or = [
                { companyName: { $regex: search, $options: 'i' } },
                { companyCode: { $regex: search, $options: 'i' } },
                { contactNumber: { $regex: search, $options: 'i' } },
                { hrName: { $regex: search, $options: 'i' } }
            ];
        }

        const companies = await Company.aggregate([
            { $match: matchStage },

            {
                $lookup: {
                    from: 'subscriptions',
                    let: { companyId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$company', '$$companyId'] }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'subscription'
                }
            },

            {
                $addFields: {
                    subscription: { $arrayElemAt: ['$subscription', 0] }
                }
            },

            {
                $addFields: {
                    subscriptionType: '$subscription.subscriptionType',
                    validTill: '$subscription.validTill',
                    subscriptionStatus: '$subscription.status',
                    totalSubscriptions: {
                        $add: [
                            { $ifNull: ['$subscription.subscriptionType.subscriptionTypeBasic', 0] },
                            { $ifNull: ['$subscription.subscriptionType.subscriptionTypePro', 0] }
                        ]
                    }
                }
            },

            {
                $project: {
                    subscription: 0
                }
            },

            {
                $sort: {
                    [sortBy]: order === 'asc' ? 1 : -1
                }
            },

            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);

        const totalRecords = await Company.countDocuments(matchStage);

        res.json(formatResponse(true, 'Companies retrieved successfully', companies, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords: totalRecords
        }));

    } catch (error) {
        console.error('Get All Companies Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Something went wrong',
            error: error.message
        });
    }
};

// @desc    Register new company
// @route   POST /api/companies/register
// @access  Private/Admin
exports.registerCompany = asyncHandler(async (req, res) => {
    try {
        const password = generatePassword();
        const companyData = { ...req.body, password };
        const company = await Company.create(companyData);

        // Convert to object to add plain password for response
        const companyResponse = company.toObject();
        companyResponse.password = password;

        // Generate and store token (persistent)
        const token = jwt.sign({ id: company._id }, process.env.JWT_SECRET);
        company.token = token;
        await company.save();
        companyResponse.token = token;

        // Send welcome email
        mailService.sendEmail(
            company.hrEmail, 
            'Welcome to Raftaar HRMS - Your Company Credentials', 
            'company-welcome', 
            { hrName: company.hrName, companyName: company.companyName, companyCode: company.companyCode, password, loginUrl: process.env.FRONTEND_URL || '#' }
        );

        res.status(201).json(formatResponse(true, 'Company registered successfully', companyResponse));
    } catch (error) {
        console.log(error);
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Login company
// @route   POST /api/companies/login
// @access  Public
exports.loginCompany = asyncHandler(async (req, res) => {
    try {
        const { _id, password } = req.body;

        if (!_id || !password) {
            res.status(400);
            throw new Error('Please provide both company _id and password');
        }

        const company = await Company.findById(_id).select('+password');

        if (company && (await company.matchPassword(password))) {
            // Use existing token or generate one if missing (for legacy records)
            if (!company.token) {
                company.token = jwt.sign({ id: company._id }, process.env.JWT_SECRET);
                await company.save();
            }

            res.json(formatResponse(true, 'Login successful', {
                _id: company._id,
                companyName: company.companyName,
                companyCode: company.companyCode,
                hrEmail: company.hrEmail,
                token: company.token,
            }));
        } else {
            res.status(401);
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get company by ID
// @route   GET /api/customers/:id
// @access  Private/Admin
exports.getCompanyById = asyncHandler(async (req, res) => {
    try {
        const company = await Company.findById(req.params.id).populate('currentSubscription');
        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }
        res.json(formatResponse(true, 'Company details retrieved', company));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update company
// @route   PUT /api/customers/:id
// @access  Private/Admin
exports.updateCompany = asyncHandler(async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }

        // Apply updates
        Object.keys(req.body).forEach(key => {
            company[key] = req.body[key];
        });

        await company.save();

        // Send password change email if password was updated
        if (req.body.password) {
            mailService.sendEmail(
                company.hrEmail, 
                'Security Notification: Company Password Changed', 
                'company-password-reset', 
                { hrName: company.hrName, companyName: company.companyName, companyCode: company.companyCode, password: req.body.password }
            );
        }

        res.json(formatResponse(true, 'Company updated successfully', company));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Delete company
// @route   DELETE /api/customers/:id
// @access  Private/Admin
exports.deleteCompany = asyncHandler(async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }
        await company.deleteOne();
        res.json(formatResponse(true, 'Company deleted successfully'));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Toggle notification
// @route   PATCH /api/customers/:id/notification-toggle
// @access  Private/Admin
exports.toggleNotification = asyncHandler(async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }
        company.isActive = !company.isActive;
        await company.save();
        res.json(formatResponse(true, `Company ${company.isActive ? 'enabled' : 'disabled'}`, { isActive: company.isActive }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get expiring subscriptions
// @route   GET /api/customers/expiring-soon
// @access  Private/Admin
exports.getExpiringSoon = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, sortBy = 'validTill', order = 'asc', expiringSoon } = req.query;

        const matchSubscription = {};

        // If expiringSoon is true, filter by next 30 days and Active status
        if (expiringSoon === 'true') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            matchSubscription.validTill = { $gte: new Date(), $lte: thirtyDaysFromNow };
            matchSubscription.status = 'Active';
        }

        // Allow explicit status filter for subscription if provided
        if (status) {
            matchSubscription.status = status;
        }

        const aggregationPipeline = [
            { $match: matchSubscription },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company',
                    foreignField: '_id',
                    as: 'company'
                }
            },
            { $unwind: '$company' }
        ];

        // Add search filter for company fields if search query exists
        if (search) {
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { 'company.companyName': { $regex: search, $options: 'i' } },
                        { 'company.companyCode': { $regex: search, $options: 'i' } },
                        { 'company.contactNumber': { $regex: search, $options: 'i' } },
                        { 'company.hrName': { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }

        // Sorting
        let sortField = sortBy;
        const companyFields = ['companyName', 'companyCode', 'hrName', 'contactNumber'];
        if (companyFields.includes(sortBy)) {
            sortField = `company.${sortBy}`;
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        aggregationPipeline.push({
            $sort: { [sortField]: sortOrder }
        });

        // Pagination
        const totalRecordsPipeline = [...aggregationPipeline];
        const skip = (parseInt(page) - 1) * parseInt(limit);

        aggregationPipeline.push({ $skip: skip });
        aggregationPipeline.push({ $limit: parseInt(limit) });

        const expiringSubscriptions = await Subscription.aggregate(aggregationPipeline);

        // Count total records for pagination
        totalRecordsPipeline.push({ $count: 'total' });
        const totalResult = await Subscription.aggregate(totalRecordsPipeline);
        const totalRecords = totalResult.length > 0 ? totalResult[0].total : 0;

        res.json(formatResponse(true, 'Subscriptions retrieved successfully', expiringSubscriptions, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords: totalRecords
        }));

    } catch (error) {
        console.error('Get Expiring Subscriptions Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Validate GST
// @route   POST /api/companies/validate-gst
// @access  Private/Admin
exports.validateGST = asyncHandler(async (req, res) => {
    try {
        const { gstNumber } = req.body;
        // Simple regex check (frontend logic mostly, but good for backend too)
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const isValid = gstRegex.test(gstNumber);
        res.json(formatResponse(isValid, isValid ? 'Valid GST format' : 'Invalid GST format', { isValid }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get companies for dropdown (id + name only)
// @route   GET /api/companies/getCompanyDropdown
// @access  Private/Admin
exports.getCompanyDropdown = asyncHandler(async (req, res) => {
    try {
        const companies = await Company.find({ status: { $in: ['Active', 'Trial'] } })
            .select('_id companyName companyCode')
            .sort({ companyName: 1 });

        res.json(formatResponse(true, 'Company dropdown list retrieved', companies));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
