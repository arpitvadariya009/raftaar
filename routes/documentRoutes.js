const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
// const { protect } = require('../middleware/authMiddleware'); // JWT disabled
const upload = require('../middleware/upload');

// Document routes are open (JWT disabled)

// @desc    Create a new document
router.post('/createDocument', upload.single('image'), documentController.createDocument);

// @desc    Get all documents
router.get('/getAllDocuments', documentController.getDocuments);

// @desc    Get single document
router.get('/getDocumentById/:id', documentController.getDocumentById);

// @desc    Update document details
router.put('/updateDocument/:id', upload.single('image'), documentController.updateDocument);

module.exports = router;
