const asyncHandler = require('express-async-handler');
const Enquiry = require('../models/Enquiry');
const Company = require('../models/Company');
const { formatResponse } = require('../utils/helpers');

// @desc    List all enquiries
// @route   GET /api/enquiries
// @access  Private/Admin
exports.getAllEnquiries = asyncHandler(async (req, res) => {
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
});

// @desc    Create new enquiry
// @route   POST /api/enquiries
// @access  Public
exports.createEnquiry = asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.create(req.body);
    res.status(201).json(formatResponse(true, 'Enquiry submitted successfully', enquiry));
});

// @desc    Get enquiry details
// @route   GET /api/enquiries/:id
// @access  Private/Admin
exports.getEnquiryById = asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
        res.status(404);
        throw new Error('Enquiry not found');
    }
    res.json(formatResponse(true, 'Enquiry details retrieved', enquiry));
});

// @desc    Respond to enquiry
// @route   PUT /api/enquiries/:id/respond
// @access  Private/Admin
exports.respondToEnquiry = asyncHandler(async (req, res) => {
    const { responseMessage } = req.body;
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, {
        status: 'Responded',
        responseMessage,
        respondedAt: new Date()
    }, { new: true });

    if (!enquiry) {
        res.status(404);
        throw new Error('Enquiry not found');
    }
    res.json(formatResponse(true, 'Response recorded', enquiry));
});

// @desc    Convert enquiry to customer
// @route   POST /api/enquiries/:id/convert
// @access  Private/Admin
exports.convertToCustomer = asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
        res.status(404);
        throw new Error('Enquiry not found');
    }

    // This would typically involve creating a company record from the enquiry data
    // For now, mark as converted
    enquiry.status = 'Converted';
    await enquiry.save();

    res.json(formatResponse(true, 'Enquiry marked as converted'));
});

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private/Admin
exports.deleteEnquiry = asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
        res.status(404);
        throw new Error('Enquiry not found');
    }
    await enquiry.deleteOne();
    res.json(formatResponse(true, 'Enquiry deleted successfully'));
});
