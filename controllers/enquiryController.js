const asyncHandler = require('express-async-handler');
const ExcelJS = require('exceljs');
const Enquiry = require('../models/Enquiry');
const Company = require('../models/Company');
const { formatResponse } = require('../utils/helpers');

// @desc    List all enquiries (supports ?isExcel=true / ?isCSV=true for export)
// @route   GET /api/enquiries
// @access  Private/Admin
exports.getAllEnquiries = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, type, status, isExcel, isCSV } = req.query;

        const query = {};
        if (type) query.enquiryType = type;
        if (status) query.status = status;

        // ---- Export mode (all records, no pagination) ----
        if (isExcel === 'true' || isCSV === 'true') {
            const enquiries = await Enquiry.find(query).sort({ enquiryDate: -1 }).lean();

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Enquiries');

            // Dynamically build columns from the first record's keys
            if (enquiries.length > 0) {
                const keys = Object.keys(enquiries[0]).filter(k => k !== '_id' && k !== '__v');
                sheet.columns = keys.map(k => ({ header: k, key: k, width: 20 }));
                sheet.getRow(1).font = { bold: true };

                // Loop through data and add rows
                enquiries.forEach(e => {
                    const row = {};
                    keys.forEach(k => {
                        row[k] = e[k] != null ? String(e[k]) : '';
                    });
                    sheet.addRow(row);
                });
            }

            if (isExcel === 'true') {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=enquiries.xlsx');
                return workbook.xlsx.write(res).then(() => res.end());
            }

            // CSV
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=enquiries.csv');
            return workbook.csv.write(res).then(() => res.end());
        }

        // ---- Normal JSON response (paginated) ----
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

// @desc    Create new enquiry
// @route   POST /api/enquiries
// @access  Public
exports.createEnquiry = asyncHandler(async (req, res) => {
    try {
        const enquiry = await Enquiry.create(req.body);
        res.status(201).json(formatResponse(true, 'Enquiry submitted successfully', enquiry));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Get enquiry details
// @route   GET /api/enquiries/:id
// @access  Private/Admin
exports.getEnquiryById = asyncHandler(async (req, res) => {
    try {
        const enquiry = await Enquiry.findById(req.params.id);
        if (!enquiry) {
            res.status(404);
            throw new Error('Enquiry not found');
        }
        res.json(formatResponse(true, 'Enquiry details retrieved', enquiry));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Respond to enquiry
// @route   PUT /api/enquiries/:id/respond
// @access  Private/Admin
exports.respondToEnquiry = asyncHandler(async (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Convert enquiry to customer
// @route   POST /api/enquiries/:id/convert
// @access  Private/Admin
exports.convertToCustomer = asyncHandler(async (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private/Admin
exports.deleteEnquiry = asyncHandler(async (req, res) => {
    try {
        const enquiry = await Enquiry.findById(req.params.id);
        if (!enquiry) {
            res.status(404);
            throw new Error('Enquiry not found');
        }
        await enquiry.deleteOne();
        res.json(formatResponse(true, 'Enquiry deleted successfully'));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
