const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const Enquiry = require('../models/Enquiry');
const { formatResponse } = require('../utils/helpers');

// @desc    Get dashboard stats (all counts)
// @route   GET /api/dashboard/stats?startDate=2026-01-01&endDate=2026-02-28
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Current date references
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Build date filter if startDate & endDate are provided
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            // Set endDate to end of that day (23:59:59)
            const end = new Date(endDate);
            // end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        // Create query conditions with date filter
        const hasDateFilter = Object.keys(dateFilter).length > 0;
        const companyDateQuery = hasDateFilter ? { createdAt: dateFilter } : {};
        const subscriptionDateQuery = hasDateFilter ? { createdAt: dateFilter } : {};
        const enquiryDateQuery = hasDateFilter ? { createdAt: dateFilter } : {};

        // Revenue match condition
        const revenueMatch = hasDateFilter
            ? { status: 'Active', createdAt: dateFilter }
            : { status: 'Active', startDate: { $lte: now }, validTill: { $gte: now } };

        // Run all queries in parallel for speed
        const [
            totalCompanies,
            newCompaniesThisMonth,
            activeSubscriptions,
            totalSubscriptions,
            pendingEnquiries,
            newEnquiriesToday,
            revenueResult
        ] = await Promise.all([
            // Total Companies (in date range)
            Company.countDocuments(companyDateQuery),

            // New Companies This Month
            Company.countDocuments({ createdAt: { $gte: startOfMonth } }),

            // Active Subscriptions (in date range)
            Subscription.countDocuments({ status: 'Active', ...subscriptionDateQuery }),

            // Total Subscriptions (in date range, for active rate %)
            Subscription.countDocuments(subscriptionDateQuery),

            // Pending Enquiries (in date range)
            Enquiry.countDocuments({ status: 'Pending', ...enquiryDateQuery }),

            // New Enquiries Today
            Enquiry.countDocuments({ createdAt: { $gte: startOfToday } }),

            // Monthly Revenue
            Subscription.aggregate([
                {
                    $match: {
                        status: 'Active',
                        startDate: { $lte: now },
                        validTill: { $gte: now }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$charge' }
                    }
                }
            ])
        ]);

        // Calculate active rate percentage
        const activeRate = totalSubscriptions > 0
            ? Math.round((activeSubscriptions / totalSubscriptions) * 100)
            : 0;

        // Extract monthly revenue
        const monthlyRevenue = 0;

        res.json(formatResponse(true, 'Dashboard stats retrieved successfully', {
            totalCompanies,
            newCompaniesThisMonth,
            activeSubscriptions,
            activeRate,
            pendingEnquiries,
            newEnquiriesToday,
            monthlyRevenue
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get recent companies (last 5 registered)
// @route   GET /api/dashboard/recent-companies
// @access  Private/Admin
exports.getRecentCompanies = asyncHandler(async (req, res) => {
    try {
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

        const data = await Company.aggregate([
            {
                $match: query
            },
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
                $lookup: {
                    from: 'authemployees',
                    let: { companyId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$company', '$$companyId'] }
                            }
                        },
                        {
                            $count: 'employeeCount'
                        }
                    ],
                    as: 'employees'
                }
            },
            {
                $addFields: {
                    employeeCount: {
                        $ifNull: [
                            { $arrayElemAt: ['$employees.employeeCount', 0] },
                            0
                        ]
                    }
                }
            },
            // 3️⃣ Final Projection (Only Required Fields)
            {
                $project: {
                    companyName: 1,
                    subscriptionType: '$subscription.subscriptionType',
                    subscriptionTypeBasic: '$subscription.subscriptionType.subscriptionTypeBasic' || 0,
                    subscriptionTypePro: '$subscription.subscriptionType.subscriptionTypePro' || 0,
                    subscriptionStatus: '$subscription.status',
                    employeeCount: 1,
                    createdAt: 1 // needed for sorting if sortBy=createdAt
                }
            },
            {
                $sort: { [sortBy]: order === 'asc' ? 1 : -1 }
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: limit * 1
            }
        ]);

        const count = await Company.countDocuments(query);

        res.json(formatResponse(true, 'Companies retrieved successfully', data, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
            totalRecords: count
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get recent enquiries (latest 3)
// @route   GET /api/dashboard/recent-enquiries
// @access  Private/Admin
exports.getRecentEnquiries = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, type, status } = req.query;

        const query = {};
        if (type) query.enquiryType = type;
        if (status) query.status = status;

        const enquiries = await Enquiry.find(query)
            .sort({ enquiryDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Enquiry.countDocuments(query);

        res.json(formatResponse(true, 'Enquiries retrieved successfully', enquiries, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
            totalRecords: count
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
