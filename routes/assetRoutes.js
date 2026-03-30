const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

// @desc    Add a new asset
router.post('/add', assetController.addAsset);

// @desc    Get all assets for a company
router.get('/company/:companyId', assetController.getAssets);

// @desc    Get dashboard stats for assets
router.get('/stats/:companyId', assetController.getAssetStats);

// @desc    Update an asset
router.put('/update/:id', assetController.updateAsset);

// @desc    Get all unique asset categories for a company
router.get('/categories/:companyId', assetController.getAssetCategories);

// @desc    Delete an asset
router.delete('/delete/:id', assetController.deleteAsset);

module.exports = router;
