const express = require('express');
const router = express.Router();
const gatePassController = require('../controllers/gatePassController');

// @desc    Apply for Gate Pass
router.post('/apply', gatePassController.applyGatePass);

// @desc    Get all gate pass requests for a company
router.get('/company/:companyId', gatePassController.getAllGatePasses);

// @desc    Get gate pass stats for dashboard
router.get('/stats/:companyId', gatePassController.getGatePassStats);

// @desc    Update gate pass status (Approve/Reject)
router.put('/status/:id', gatePassController.updateGatePassStatus);

module.exports = router;
