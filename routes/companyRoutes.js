const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const validate = require('../middleware/validateMiddleware');
const { companySchema } = require('../validations/hrmsValidation');
const { protect } = require('../middleware/authMiddleware');

// All company routes are protected (Admin only)
router.use(protect);

// @desc    Get all companies/customers (with search & pagination)
router.get('/getAllCompanies', companyController.getAllCompanies);

// @desc    Get companies with subscriptions expiring within 30 days
router.get('/getExpiringSoon', companyController.getExpiringSoon);

// @desc    Get a single company by ID
router.get('/getCompanyById/:id', companyController.getCompanyById);

// @desc    Register a new company (Auto-generates Company Code)
router.post('/registerCompany', validate(companySchema), companyController.registerCompany);

// @desc    Update company details
router.put('/updateCompany/:id', validate(companySchema), companyController.updateCompany);

// @desc    Remove a company
router.delete('/deleteCompany/:id', companyController.deleteCompany);

// @desc    Toggle banner notifications for a specific company
router.patch('/toggleNotification/:id', companyController.toggleNotification);

// @desc    Helper: Validate GST number format
router.post('/validateGST', companyController.validateGST);

module.exports = router;
