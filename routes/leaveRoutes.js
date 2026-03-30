const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// @desc    Apply for leave
router.post('/apply', leaveController.applyLeave);

// @desc    Get all leave requests for a company
router.get('/company/:companyId', leaveController.getAllLeaves);

// @desc    Get leave stats for dashboard
router.get('/stats/:companyId', leaveController.getLeaveStats);

// @desc    Update leave status (Approve/Reject)
router.put('/status/:leaveId', leaveController.updateLeaveStatus);

module.exports = router;
