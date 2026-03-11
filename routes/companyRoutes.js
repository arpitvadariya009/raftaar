const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const validateRequest = require('../middlewares/validateRequest');
const { companySchema } = require('../validations/hrmsValidation');
const { protect } = require('../middleware/authMiddleware');

// @desc    Login company
// @route   POST /api/companies/login
// @access  Public
router.post('/login', companyController.loginCompany);

// All company routes from here are protected (Admin only)
router.use(protect);

// @desc    Get all companies/customers (with search & pagination)
router.get('/getAllCompanies', companyController.getAllCompanies);

// @desc    Get companies with subscriptions expiring within 30 days
router.get('/getExpiringSoon', companyController.getExpiringSoon);

// @desc    Get companies for dropdown (id + name only)
router.get('/getCompanyDropdown', companyController.getCompanyDropdown);

// @desc    Get a single company by ID
router.get('/getCompanyById/:id', companyController.getCompanyById);

// @desc    Register a new company (Auto-generates Company Code)
router.post('/registerCompany', validateRequest(companySchema), companyController.registerCompany);

// @desc    Update company details
router.put('/updateCompany/:id', validateRequest(companySchema), companyController.updateCompany);

// @desc    Remove a company
router.delete('/deleteCompany/:id', companyController.deleteCompany);

// @desc    Toggle banner notifications for a specific company
router.patch('/toggleNotification/:id', companyController.toggleNotification);

// @desc    Helper: Validate GST number format
router.post('/validateGST', companyController.validateGST);

module.exports = router;
