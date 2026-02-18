const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const companyRoutes = require('./companyRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const notificationRoutes = require('./notificationRoutes');
const enquiryRoutes = require('./enquiryRoutes');
const faceRoutes = require('./face.routes');
const authEmployeeRoutes = require('./authEmployee.routes');

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/faces', faceRoutes);
router.use('/auth-employee', authEmployeeRoutes);

module.exports = router;
