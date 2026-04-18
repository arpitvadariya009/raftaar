const asyncHandler = require('express-async-handler');
const Document = require('../models/Document');
const { formatResponse } = require('../utils/helpers');

// @desc    Create a new document
// @route   POST /api/documents/createDocument
// @access  Private
exports.createDocument = asyncHandler(async (req, res) => {
    try {
        const documentData = { ...req.body };
        if (req.file) {
            documentData.image = req.file.filename;
        }
        const document = await Document.create(documentData);
        res.status(201).json(formatResponse(true, 'Document created successfully', document));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get all documents with search, filtering, and pagination
// @route   GET /api/documents/getAllDocuments
// @access  Private
exports.getDocuments = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            documentFlow,
            documentType,
            discrepancy,
            company,
            startDate,
            endDate,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const query = {};

        // Filters
        if (documentFlow) query.documentFlow = documentFlow;
        if (documentType) query.documentType = documentType;
        if (discrepancy) query.discrepancy = discrepancy;
        if (company) query.company = company;

        // Date Range Filter (based on document date)
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        // Search logic
        if (search) {
            query.$or = [
                { vendorName: { $regex: search, $options: 'i' } },
                { vehicleNumber: { $regex: search, $options: 'i' } },
                { remarks: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === 'desc' ? -1 : 1;

        const documents = await Document.find(query)
            .populate('company', 'companyName companyCode')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRecords = await Document.countDocuments(query);

        res.json(formatResponse(true, 'Documents retrieved successfully', documents, {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords: totalRecords
        }));

    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get single document by ID
// @route   GET /api/documents/getDocumentById/:id
// @access  Private
exports.getDocumentById = asyncHandler(async (req, res) => {
    try {
        const document = await Document.findById(req.params.id).populate('company', 'companyName companyCode');
        if (!document) {
            return res.status(404).json(formatResponse(false, 'Document not found'));
        }
        res.json(formatResponse(true, 'Document details retrieved', document));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update document details
// @route   PUT /api/documents/updateDocument/:id
// @access  Private
exports.updateDocument = asyncHandler(async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json(formatResponse(false, 'Document not found'));
        }

        const updateData = { ...req.body };
        if (req.file) {
            updateData.image = req.file.filename;
        }

        const updatedDocument = await Document.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json(formatResponse(true, 'Document updated successfully', updatedDocument));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
