const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { protect } = require('../middleware/authMiddleware');

// All security dashboard routes are protected
router.use(protect);

// @desc    Get security dashboard stats
router.get('/stats', securityController.getSecurityStats);

module.exports = router;
