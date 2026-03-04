const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const validateRequest = require('../middlewares/validateRequest');
const { subscriptionSchema } = require('../validations/hrmsValidation');
const { protect } = require('../middleware/authMiddleware');

// Protect all subscription routes
router.use(protect);

// @desc    Create a new subscription (auto-expires old active subscription for renewal)
router.post('/createSubscription', validateRequest(subscriptionSchema), subscriptionController.createSubscription);

// @desc    Get all subscriptions across all companies
router.get('/getAllSubscriptions', subscriptionController.getAllSubscriptions);

// @desc    Get subscriptions expiring within 1 month
router.get('/getExpiringSubscriptions', subscriptionController.getExpiringSubscriptions);

// @desc    Get subscription history for a specific company
router.get('/getCompanySubscriptions/:companyId', subscriptionController.getCompanySubscriptions);

// @desc    Get change history for a specific subscription (upgrade/downgrade log)
router.get('/getHistory/:subscriptionId', subscriptionController.getSubscriptionHistory);

// @desc    Get all subscription change history for a company
router.get('/getCompanyHistory/:companyId', subscriptionController.getCompanyHistory);

// @desc    Update subscription details (upgrade/downgrade — logs history)
router.put('/updateSubscription/:id', validateRequest(subscriptionSchema), subscriptionController.updateSubscription);

// @desc    Cancel or expire a subscription (logs history)
router.delete('/cancelSubscription/:id', subscriptionController.cancelSubscription);

module.exports = router;
