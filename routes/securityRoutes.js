const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
// const { protect } = require('../middleware/authMiddleware'); // JWT disabled

// Security routes are open (JWT disabled)

// @desc    Get security dashboard stats
router.get('/stats', securityController.getSecurityStats);

module.exports = router;
