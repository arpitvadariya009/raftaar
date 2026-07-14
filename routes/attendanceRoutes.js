const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
// const { protect } = require('../middleware/authMiddleware'); // JWT disabled

// Attendance routes are open (JWT disabled)

// @desc    Mark Attendance (In / Out)
router.post('/markAttendance', attendanceController.markAttendance);

// @desc    Get Daily Attendance Log for a month
router.get('/getAttendanceLog/:employeeId', attendanceController.getAttendanceLog);

// @desc    Get Dashboard Statistics for a month
router.get('/getDashboardStats/:employeeId', attendanceController.getDashboardStats);

// @desc    Get Company-wide Attendance Statistics
router.get('/getCompanyAttendanceStats', attendanceController.getCompanyAttendanceStats);

// @desc    Get Detailed Company Attendance List
router.get('/getCompanyAttendanceList', attendanceController.getCompanyAttendanceList);

module.exports = router;
