const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');


// All visitor routes are protected
router.use(protect);

// @desc    Register a new visitor
router.post('/createVisitor', upload.single('image'), visitorController.createVisitor);


// @desc    Get all visitors
router.get('/getAllVisitors', visitorController.getVisitors);

// @desc    Get single visitor
router.get('/getVisitorById/:id', visitorController.getVisitorById);

// @desc    Update visitor details
router.put('/updateVisitor/:id', upload.single('image'), visitorController.updateVisitor);


// @desc    Update visitor status (Check-out)
router.patch('/updateStatus/:id', visitorController.updateStatus);

module.exports = router;
