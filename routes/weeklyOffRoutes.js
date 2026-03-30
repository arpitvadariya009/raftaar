const express = require('express');
const router = express.Router();
const weeklyOffController = require('../controllers/weeklyOffController');

// Template Routes
router.post('/template', weeklyOffController.createTemplate);
router.get('/templates/:companyId', weeklyOffController.getAllTemplates);
router.put('/template/:id', weeklyOffController.updateTemplate);
router.post('/template/duplicate/:id', weeklyOffController.duplicateTemplate);
router.delete('/template/:id', weeklyOffController.deleteTemplate);

// Assignment Routes
router.post('/assign', weeklyOffController.assignWeeklyOff);
router.get('/assignments/:companyId', weeklyOffController.getMonthWiseAssignments);
router.get('/employee-wise/:companyId', weeklyOffController.getEmployeeWiseAssignments);

// Stats Route
router.get('/stats/:companyId', weeklyOffController.getWeeklyOffStats);

module.exports = router;
