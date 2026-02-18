const express = require('express');
const router = express.Router();
const faceController = require('../controllers/face.controller');
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

router.post('/register', upload.single('image'), faceController.registerFace);
router.post('/verify', upload.single('image'), faceController.verifyFace);
router.post('/login', upload.single('image'), faceController.faceLogin);

module.exports = router;
