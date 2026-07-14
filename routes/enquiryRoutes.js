const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const validateRequest = require('../middlewares/validateRequest');
const { enquirySchema } = require('../validations/hrmsValidation');
// const { protect } = require('../middleware/authMiddleware'); // JWT disabled

// @desc    List all enquiries (Admin only)
router.get('/getAllEnquiries', enquiryController.getAllEnquiries);

// @desc    Submit a new business enquiry (Public)
router.post('/createEnquiry', validateRequest(enquirySchema), enquiryController.createEnquiry); // Publicly accessible

// @desc    Get details of a specific enquiry
router.get('/getEnquiryById/:id', enquiryController.getEnquiryById);

// @desc    Log admin response to an enquiry
router.put('/respondToEnquiry/:id', enquiryController.respondToEnquiry);

// @desc    Transition a lead/enquiry to customer status
router.post('/convertToCustomer/:id', enquiryController.convertToCustomer);

// @desc    Delete/Reject an enquiry
router.delete('/deleteEnquiry/:id', enquiryController.deleteEnquiry);

module.exports = router;
