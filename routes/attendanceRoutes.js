const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// @desc    Mark Attendance (In / Out)
router.post('/mark', attendanceController.markAttendance);

// @desc    Get Daily Attendance Log for a month
router.get('/log/:employeeId', attendanceController.getAttendanceLog);

// @desc    Get Dashboard Statistics for a month
router.get('/stats/:employeeId', attendanceController.getDashboardStats);

// @desc    Get Company-wide Attendance Statistics
router.get('/company-stats', attendanceController.getCompanyAttendanceStats);

// @desc    Get Detailed Company Attendance List
router.get('/company-list', attendanceController.getCompanyAttendanceList);

module.exports = router;
