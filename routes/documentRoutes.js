const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// All document routes are protected
router.use(protect);

// @desc    Create a new document
router.post('/createDocument', upload.single('image'), documentController.createDocument);

// @desc    Get all documents
router.get('/getAllDocuments', documentController.getDocuments);

// @desc    Get single document
router.get('/getDocumentById/:id', documentController.getDocumentById);

// @desc    Update document details
router.put('/updateDocument/:id', upload.single('image'), documentController.updateDocument);

module.exports = router;
