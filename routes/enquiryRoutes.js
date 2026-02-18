const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const validate = require('../middleware/validateMiddleware');
const { enquirySchema } = require('../validations/hrmsValidation');
const { protect } = require('../middleware/authMiddleware');

// @desc    List all enquiries (Admin only)
router.get('/getAllEnquiries', protect, enquiryController.getAllEnquiries);

// @desc    Submit a new business enquiry (Public)
router.post('/createEnquiry', validate(enquirySchema), enquiryController.createEnquiry); // Publicly accessible

// @desc    Get details of a specific enquiry
router.get('/getEnquiryById/:id', protect, enquiryController.getEnquiryById);

// @desc    Log admin response to an enquiry
router.put('/respondToEnquiry/:id', protect, enquiryController.respondToEnquiry);

// @desc    Transition a lead/enquiry to customer status
router.post('/convertToCustomer/:id', protect, enquiryController.convertToCustomer);

// @desc    Delete/Reject an enquiry
router.delete('/deleteEnquiry/:id', protect, enquiryController.deleteEnquiry);

module.exports = router;
