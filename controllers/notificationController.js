const asyncHandler = require('express-async-handler');
const NotificationBanner = require('../models/NotificationBanner');
const { formatResponse } = require('../utils/helpers');

// @desc    Create notification banner
// @route   POST /api/notifications/createBanner
// @access  Private/Admin
exports.createBanner = asyncHandler(async (req, res) => {
    try {
        const banner = await NotificationBanner.create(req.body);
        res.status(201).json(formatResponse(true, 'Banner created successfully', banner));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    List all banners
// @route   GET /api/notifications/getAllBanners
// @access  Private/Admin
exports.getAllBanners = asyncHandler(async (req, res) => {
    try {
        const banners = await NotificationBanner.find().populate('company', 'companyName').sort({ createdAt: -1 });
        res.json(formatResponse(true, 'Banners retrieved successfully', banners));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Update banner
// @route   PUT /api/notifications/updateBanner/:id
// @access  Private/Admin
exports.updateBanner = asyncHandler(async (req, res) => {
    try {
        const banner = await NotificationBanner.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!banner) {
            res.status(404);
            throw new Error('Banner not found');
        }
        res.json(formatResponse(true, 'Banner updated successfully', banner));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Delete banner
// @route   DELETE /api/notifications/deleteBanner/:id
// @access  Private/Admin
exports.deleteBanner = asyncHandler(async (req, res) => {
    try {
        const banner = await NotificationBanner.findById(req.params.id);
        if (!banner) {
            res.status(404);
            throw new Error('Banner not found');
        }
        await banner.deleteOne();
        res.json(formatResponse(true, 'Banner deleted successfully'));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Upload banner image
// @route   POST /api/notifications/uploadBannerImage
// @access  Private/Admin
exports.uploadBannerImage = asyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            res.status(400);
            throw new Error('No image uploaded');
        }
        const filePath = `/uploads/banners/${req.file.filename}`;
        res.json(formatResponse(true, 'Image uploaded successfully', { imageUrl: filePath }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});
