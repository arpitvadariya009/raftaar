const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const validate = require('../middleware/validateMiddleware');
const { subscriptionSchema } = require('../validations/hrmsValidation');
const { protect } = require('../middleware/authMiddleware');

// Protect all subscription routes
router.use(protect);

// @desc    Create a new subscription plan (calculates validTill)
router.post('/createSubscription', validate(subscriptionSchema), subscriptionController.createSubscription);

// @desc    Get all subscriptions across all companies
router.get('/getAllSubscriptions', subscriptionController.getAllSubscriptions);

// @desc    Get subscription history for a specific company
router.get('/getCompanySubscriptions/:companyId', subscriptionController.getCompanySubscriptions);

// @desc    Update subscription details
router.put('/updateSubscription/:id', validate(subscriptionSchema), subscriptionController.updateSubscription);

// @desc    Cancel or expire a subscription
router.delete('/cancelSubscription/:id', subscriptionController.cancelSubscription);

module.exports = router;
