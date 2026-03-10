const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

// @desc    Add a new asset
router.post('/add', assetController.addAsset);

// @desc    Get all assets for a company with dashboard stats
router.get('/company/:companyId', assetController.getAssets);

// @desc    Update an asset
router.put('/update/:id', assetController.updateAsset);

// @desc    Delete an asset
router.delete('/delete/:id', assetController.deleteAsset);

module.exports = router;
