const asyncHandler = require('express-async-handler');
const Visitor = require('../models/Visitor');
const GatePass = require('../models/GatePass');
const Document = require('../models/Document');
const Courier = require('../models/Courier');
const { formatResponse } = require('../utils/helpers');

// @desc    Get security dashboard statistics (counts)
// @route   GET /api/security/stats
// @access  Private
exports.getSecurityStats = asyncHandler(async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;

        if (!companyId) {
            return res.status(400).json(formatResponse(false, 'Company ID is required'));
        }

        // Build date filter
        const query = { company: companyId };
        
        if (startDate || endDate) {
            // Document model uses 'date' field, others use 'createdAt' usually
            // but the user wants "time based" based on when data was recorded.
            // Let's use createdAt for most, and specifically handle Document's 'date' if needed.
            // Actually, we'll use createdAt for everything to be consistent about "data entry" time.
            
            const dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            query.createdAt = dateFilter;
        }

        // Specific query for Document because it has its own 'date' field, 
        // but we'll stick to 'createdAt' if we want "when it was entered".
        // Let's stick to consistent filtering for the dashboard.

        const [
            visitorCount,
            pendingGatePassCount,
            approvedGatePassCount,
            documentCount,
            courierCount
        ] = await Promise.all([
            Visitor.countDocuments(query),
            GatePass.countDocuments({ ...query, status: 0 }),
            GatePass.countDocuments({ ...query, status: 1 }),
            Document.countDocuments(query),
            Courier.countDocuments(query)
        ]);

        res.json(formatResponse(true, 'Security stats retrieved successfully', {
            visitorCount,
            pendingGatePassCount,
            approvedGatePassCount,
            inwardOutwardCount: documentCount + courierCount,
            // Providing breakdown just in case
            breakdown: {
                documents: documentCount,
                couriers: courierCount
            }
        }));

    } catch (error) {
        console.error('Get Security Stats Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
});
