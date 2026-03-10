const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// @desc    Mark Attendance (In / Out)
router.post('/mark', attendanceController.markAttendance);

// @desc    Get Daily Attendance Log for a month
router.get('/log/:employeeId', attendanceController.getAttendanceLog);

// @desc    Get Dashboard Statistics for a month
router.get('/stats/:employeeId', attendanceController.getDashboardStats);

module.exports = router;
