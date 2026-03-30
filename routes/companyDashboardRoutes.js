const express = require('express');
const router = express.Router();
const companyDashboardController = require('../controllers/companyDashboardController');
const { protect } = require('../middleware/authMiddleware');

// Dashboard routes
// Note: Using protect for now, but ensure company admin can access if needed.
// router.use(protect);

/**
 * @route   GET /api/company-dashboard/stats
 * @desc    Get dashboard statistics for a company
 * @access  Private
 */
router.get('/stats', companyDashboardController.getCompanyStats);

module.exports = router;
