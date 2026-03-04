const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../controllers/subscriptionPlanController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// @desc    Create a new subscription plan
router.post('/createPlan', subscriptionPlanController.createPlan);

// @desc    Get all subscription plans
router.get('/getAllPlans', subscriptionPlanController.getAllPlans);

// @desc    Get single plan details
router.get('/getPlan/:id', subscriptionPlanController.getPlan);

// @desc    Update a subscription plan
router.put('/updatePlan/:id', subscriptionPlanController.updatePlan);

// @desc    Soft delete a subscription plan
router.delete('/deletePlan/:id', subscriptionPlanController.deletePlan);

module.exports = router;
