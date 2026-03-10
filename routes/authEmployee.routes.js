const express = require('express');
const router = express.Router();
const authEmployeeController = require('../controllers/authEmployee.controller');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure Multer for temporary storage
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
        console.warn(`File rejected: mimetype=${file.mimetype}, extname=${path.extname(file.originalname)}`);
        cb(new Error('Only JPEG, JPG, PNG, WEBP and JFIF images are allowed'));
    }
});

/**
 * @route   POST /api/auth-employee/register
 * @desc    Register a new employee with face recognition
 * @access  Public
 * @body    { username, email }
 * @file    image (multipart/form-data)
 */
router.post('/register', upload.single('image'), authEmployeeController.registerEmployee);

/**
 * @route   POST /api/auth-employee/create
 * @desc    Create a new employee (Subscription-aware)
 * @access  Private/Public
 */
router.post('/create', upload.single('image'), authEmployeeController.createEmployee);

/**
 * @route   POST /api/auth-employee/:id/image
 * @desc    Upload or update employee face image
 * @access  Private/Public
 */
router.post('/:id/image', upload.single('image'), authEmployeeController.uploadEmployeeImage);

/**
 * @route   GET /api/auth-employee/all
 * @desc    Get all employees with pagination
 * @access  Public
 * @query   page (default: 1), limit (default: 10)
 */
router.get('/all', authEmployeeController.getAllEmployees);

/**
 * @route   POST /api/auth-employee/face-login
 * @desc    Get employee data by face image
 * @access  Public
 * @file    image (multipart/form-data)
 */
router.post('/face-login', upload.single('image'), authEmployeeController.getFaceData);

module.exports = router;
