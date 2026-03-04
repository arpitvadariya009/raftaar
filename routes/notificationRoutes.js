const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const upload = require('../middleware/upload');
const validateRequest = require('../middlewares/validateRequest');
const { bannerSchema } = require('../validations/hrmsValidation');
const { protect } = require('../middleware/authMiddleware');

// Protect all notification routes
router.use(protect);

// @desc    Setup a new advertisement banner
router.post('/createBanner', validateRequest(bannerSchema), notificationController.createBanner);

// @desc    Get all scheduled banners
router.get('/getAllBanners', notificationController.getAllBanners);

// @desc    Edit banner details or toggle status
router.put('/updateBanner/:id', validateRequest(bannerSchema), notificationController.updateBanner);

// @desc    Remove a banner
router.delete('/deleteBanner/:id', notificationController.deleteBanner);

// @desc    Upload banner image using Multer
router.post('/uploadBannerImage', upload.single('image'), notificationController.uploadBannerImage);

module.exports = router;
