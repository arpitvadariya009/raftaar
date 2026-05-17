const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// @desc    Apply for leave
router.post('/applyLeave', leaveController.applyLeave);

// @desc    Get all leave requests for a company
router.get('/getAllLeaves/:companyId', leaveController.getAllLeaves);

// @desc    Get leave stats for dashboard
router.get('/getLeaveStats/:companyId', leaveController.getLeaveStats);

// @desc    Update leave status (Approve/Reject)
router.put('/updateLeaveStatus/:leaveId', leaveController.updateLeaveStatus);

module.exports = router;
