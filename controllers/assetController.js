const Asset = require("../models/Asset");
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

        const newAsset = await Asset.create({
            assetName,
            serialCode,
            category,
            quantity: quantity || 1,
            approxCost: approxCost || 0,
            assignedTo: assignedTo || null,
            company: companyId,
            status: status || "Active"
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
 * @desc    Get all assets for a company with dashboard stats
 * @route   GET /api/assets/company/:companyId
 * @access  Private
 */
exports.getAssets = async (req, res, next) => {
    try {
        const { companyId } = req.params;

        const assets = await Asset.find({ company: companyId })
            .populate("assignedTo", "fullName email employeeId")
            .sort({ createdAt: -1 });

        let totalAssets = 0;
        let issuedAssets = 0;
        let totalValue = 0;

        // Calculate statistics
        assets.forEach(asset => {
            totalAssets += asset.quantity;
            totalValue += (asset.approxCost * asset.quantity);
            if (asset.assignedTo) {
                // If it's assigned, we consider all of its quantity as issued
                issuedAssets += asset.quantity;
            }
        });

        const availableAssets = totalAssets - issuedAssets;

        res.status(200).json({
            success: true,
            data: {
                assets,
                stats: {
                    totalAssets,
                    issuedAssets,
                    available: availableAssets,
                    totalValue
                }
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
