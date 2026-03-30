const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const AssetCategory = require("../models/AssetCategory");
const AuthEmployee = require("../models/AuthEmployee.model");

/**
 * @desc    Add a new asset
 * @route   POST /api/assets/add
 * @access  Private
 */
exports.addAsset = async (req, res, next) => {
    try {
        const { assetName, serialCode, category, quantity, approxCost, assignedTo, companyId, status } = req.body;

        if (!assetName || !serialCode || !category || !companyId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Verify if assigned employee exists (if assignedTo is provided)
        if (assignedTo) {
            const employee = await AuthEmployee.findById(assignedTo);
            if (!employee) {
                return res.status(404).json({ success: false, message: "Assigned employee not found" });
            }
        }

        // Ensure category exists in AssetCategory
        let categoryId = null;
        if (category) {
            let existingCategory = await AssetCategory.findOne({
                name: { $regex: new RegExp(`^${category}$`, 'i') },
                company: companyId
            });

            if (!existingCategory) {
                existingCategory = await AssetCategory.create({
                    name: category,
                    company: companyId
                });
            }
            categoryId = existingCategory._id;
        }

        const newAsset = await Asset.create({
            assetName,
            serialCode,
            category: categoryId,
            quantity: quantity || 1,
            approxCost: approxCost || 0,
            assignedTo: assignedTo || null,
            company: companyId,
            status: status !== undefined ? status : true
        });

        res.status(201).json({
            success: true,
            message: "Asset added successfully",
            data: newAsset
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Serial Code must be unique" });
        }
        next(error);
    }
};

/**
 * @desc    Get dashboard stats for a company's assets
 * @route   GET /api/assets/stats/:companyId
 * @access  Private
 */
exports.getAssetStats = async (req, res, next) => {
    try {
        const { companyId } = req.params;

        // Perform count check first to see if data exists for this company
        const documentCount = await Asset.countDocuments({ company: companyId });
        
        if (documentCount === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalAssets: 0,
                    issuedAssets: 0,
                    available: 0,
                    totalValue: 0
                }
            });
        }

        const stats = await Asset.aggregate([
            { 
                $match: { 
                    company: new mongoose.Types.ObjectId(companyId) 
                } 
            },
            {
                $group: {
                    _id: null,
                    totalAssets: { $sum: { $ifNull: ["$quantity", 0] } },
                    totalValue: { 
                        $sum: { 
                            $multiply: [
                                { $ifNull: ["$approxCost", 0] }, 
                                { $ifNull: ["$quantity", 0] }
                            ] 
                        } 
                    },
                    issuedAssets: {
                        $sum: {
                            $cond: [
                                { $ne: [{ $ifNull: ["$assignedTo", null] }, null] },
                                { $ifNull: ["$quantity", 0] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const result = stats[0] || {
            totalAssets: 0,
            issuedAssets: 0,
            totalValue: 0
        };

        res.status(200).json({
            success: true,
            data: {
                totalAssets: result.totalAssets,
                issuedAssets: result.issuedAssets,
                available: result.totalAssets - result.issuedAssets,
                totalValue: result.totalValue
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all assets for a company
 * @route   GET /api/assets/company/:companyId
 * @access  Private
 */
exports.getAssets = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 10, search, category, status, sortBy = 'createdAt', order = 'desc', isExport } = req.query;

        const query = { company: companyId };

        // Search: assetName or serialCode
        if (search) {
            query.$or = [
                { assetName: { $regex: search, $options: 'i' } },
                { serialCode: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter: category (ObjectId)
        if (category) {
            query.category = category;
        }

        // Filter: status (Boolean)
        if (status) {
            query.status = status;
        }

        const sortOrder = order === 'desc' ? -1 : 1;

        let assetsQuery = Asset.find(query)
            .populate("assignedTo", "fullName email employeeId")
            .populate("category", "name")
            .sort({ [sortBy]: sortOrder });

        // Apply pagination only if not exporting
        if (isExport !== 'true' && isExport !== true) {
            const skip = (parseInt(page) - 1) * parseInt(limit);
            assetsQuery = assetsQuery.skip(skip).limit(parseInt(limit));
        }

        const assets = await assetsQuery;

        const totalRecords = await Asset.countDocuments(query);

        res.status(200).json({
            success: true,
            data: assets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update an asset (Re-assign, change status, etc.)
 * @route   PUT /api/assets/update/:id
 * @access  Private
 */
exports.updateAsset = async (req, res, next) => {
    try {
        const assetId = req.params.id;
        const updates = req.body;

        // Verify if assigned employee exists (if assignedTo is provided)
        if (updates.assignedTo) {
            const employee = await AuthEmployee.findById(updates.assignedTo);
            if (!employee) {
                return res.status(404).json({ success: false, message: "Assigned employee not found" });
            }
        }

        const updatedAsset = await Asset.findByIdAndUpdate(
            assetId,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate("assignedTo", "fullName email employeeId");

        if (!updatedAsset) {
            return res.status(404).json({ success: false, message: "Asset not found" });
        }

        res.status(200).json({
            success: true,
            message: "Asset updated successfully",
            data: updatedAsset
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Serial Code must be unique" });
        }
        next(error);
    }
};

/**
 * @desc    Delete an asset
 * @route   DELETE /api/assets/delete/:id
 * @access  Private
 */
exports.deleteAsset = async (req, res, next) => {
    try {
        const assetId = req.params.id;

        const deletedAsset = await Asset.findByIdAndDelete(assetId);

        if (!deletedAsset) {
            return res.status(404).json({ success: false, message: "Asset not found" });
        }

        res.status(200).json({
            success: true,
            message: "Asset deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all unique asset categories for a company
 * @route   GET /api/assets/categories/:companyId
 * @access  Private
 */
exports.getAssetCategories = async (req, res, next) => {
    try {
        const { companyId } = req.params;

        const categories = await AssetCategory.find({ company: companyId, status: true })
            .select("name")
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};
