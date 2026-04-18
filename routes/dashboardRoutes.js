const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const employeeDashboardController = require('../controllers/employeeDashboardController');
const { protect } = require('../middleware/authMiddleware');

// All dashboard routes are protected
router.use(protect);

// @desc    Get all dashboard stats in one API call
router.get('/stats', dashboardController.getDashboardStats);

// @desc    Get recent companies (last 5 registered) for dashboard table
router.get('/recent-companies', dashboardController.getRecentCompanies);

// @desc    Get recent enquiries (latest 3) for dashboard card
router.get('/recent-enquiries', dashboardController.getRecentEnquiries);

// @desc    Employee specific dashboard
router.get('/employee', employeeDashboardController.getEmployeeDashboard);

module.exports = router;
