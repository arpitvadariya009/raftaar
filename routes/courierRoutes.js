const express = require('express');
const router = express.Router();
const courierController = require('../controllers/courierController');
// const { protect } = require('../middleware/authMiddleware'); // JWT disabled
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure Multer for storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp|jfif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (JPEG, JPG, PNG, WEBP, JFIF) are allowed'));
    }
});

// Courier routes are open (JWT disabled)

// @desc    Create a new courier entry
router.post('/createCourier', upload.single('image'), courierController.createCourier);

// @desc    Get all couriers
router.get('/getAllCouriers', courierController.getCouriers);

// @desc    Get single courier
router.get('/getCourierById/:id', courierController.getCourierById);

// @desc    Update courier details
router.put('/updateCourier/:id', upload.single('image'), courierController.updateCourier);

module.exports = router;
