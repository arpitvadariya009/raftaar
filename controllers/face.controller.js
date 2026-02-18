const faceService = require('../utils/face.service');
const Face = require('../models/Face.model');
const User = require('../models/User');
const { generateToken } = require('./authController');
const fs = require('fs');
const { formatResponse } = require('../utils/helpers');

exports.registerFace = async (req, res) => {
    try {
        const { userId } = req.body;
        const imageFile = req.file;

        console.log(`Register Face requested. userId: ${userId}, file: ${imageFile ? imageFile.originalname : 'none'}, size: ${imageFile ? imageFile.size : 0} bytes`);

        if (!userId) {
            if (imageFile) fs.unlinkSync(imageFile.path);
            return res.status(400).json(formatResponse(false, 'userId is required'));
        }

        if (!imageFile) {
            return res.status(400).json(formatResponse(false, 'Image file is required'));
        }

        // Check if user already exists
        const existingFace = await Face.findOne({ userId });
        if (existingFace) {
            // Clean up uploaded file
            fs.unlinkSync(imageFile.path);
            return res.status(409).json(formatResponse(false, 'User already registered with a face'));
        }

        // Generate descriptor
        const descriptor = await faceService.getFaceDescriptor(imageFile.path);

        // Clean up uploaded file
        if (fs.existsSync(imageFile.path)) {
            try {
                fs.unlinkSync(imageFile.path);
            } catch (err) {
                console.warn(`Could not delete original file: ${err.message}`);
            }
        }

        if (!descriptor) {
            return res.status(400).json(formatResponse(false, 'No face detected or multiple faces found'));
        }

        // Save to DB
        const faceData = new Face({
            userId,
            descriptor: Array.from(descriptor),
        });

        await faceData.save();

        res.status(201).json(formatResponse(true, 'Face registered successfully'));

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error('Register Face Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};

exports.verifyFace = async (req, res) => {
    try {
        const { userId } = req.body;
        const imageFile = req.file;

        if (!userId) {
            if (imageFile) fs.unlinkSync(imageFile.path);
            return res.status(400).json(formatResponse(false, 'userId is required'));
        }

        if (!imageFile) {
            return res.status(400).json(formatResponse(false, 'Image file is required'));
        }

        // Fetch stored descriptor
        const storedFace = await Face.findOne({ userId });
        if (!storedFace) {
            // Clean up uploaded file
            fs.unlinkSync(imageFile.path);
            return res.status(404).json(formatResponse(false, 'User not found'));
        }

        // Generate descriptor for uploaded image
        const queryDescriptor = await faceService.getFaceDescriptor(imageFile.path);

        // Clean up uploaded file
        if (fs.existsSync(imageFile.path)) {
            try {
                fs.unlinkSync(imageFile.path);
            } catch (err) {
                console.warn(`Could not delete original file: ${err.message}`);
            }
        }

        if (!queryDescriptor) {
            return res.status(400).json(formatResponse(false, 'No face detected in the uploaded image'));
        }

        // Compare
        const storedDescriptor = new Float32Array(storedFace.descriptor);
        const distance = faceService.getEuclideanDistance(queryDescriptor, storedDescriptor);

        // Define threshold
        const threshold = process.env.FACE_SIMILARITY_THRESHOLD || 0.6;
        const matched = distance < threshold;

        // Calculate confidence
        const confidence = Math.max(0, (1 - distance) * 100);

        res.json(formatResponse(true, 'Face verification completed', {
            matched,
            confidence: parseFloat(confidence.toFixed(2)),
            distance: parseFloat(distance.toFixed(4)),
            name: 'Urvi',
            userId: '123456789',
            email: 'Urvi@ate.com',
            phone: '1234567890',
            role: 'admin',
            company: 'ATE',
        }));

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error('Verify Face Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};

exports.faceLogin = async (req, res) => {
    try {
        const imageFile = req.file;

        console.log(`Face Login requested. file: ${imageFile ? imageFile.originalname : 'none'}, size: ${imageFile ? imageFile.size : 0} bytes`);

        if (!imageFile) {
            return res.status(400).json(formatResponse(false, 'Image file is required'));
        }

        // Generate descriptor for the uploaded image
        const queryDescriptor = await faceService.getFaceDescriptor(imageFile.path);

        // Clean up uploaded file
        if (fs.existsSync(imageFile.path)) {
            try {
                fs.unlinkSync(imageFile.path);
            } catch (err) {
                console.warn(`Could not delete original file: ${err.message}`);
            }
        }

        if (!queryDescriptor) {
            return res.status(400).json(formatResponse(false, 'No face detected in the uploaded image'));
        }

        // Fetch all registered faces for 1:N match
        const allFaces = await Face.find({});

        if (allFaces.length === 0) {
            return res.status(404).json(formatResponse(false, 'No faces registered in the system'));
        }

        let bestMatch = null;
        let minDistance = Infinity;
        const threshold = process.env.FACE_SIMILARITY_THRESHOLD || 0.6;

        for (const face of allFaces) {
            const storedDescriptor = new Float32Array(face.descriptor);
            const distance = faceService.getEuclideanDistance(queryDescriptor, storedDescriptor);

            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = face;
            }
        }

        if (bestMatch && minDistance < threshold) {
            // Found a match, get user data
            const user = await User.findById(bestMatch.userId);

            if (!user) {
                return res.status(404).json(formatResponse(false, 'User matching this face no longer exists'));
            }

            const token = generateToken(user._id);

            // Update token in DB
            user.token = token;
            await user.save();

            const confidence = Math.max(0, (1 - minDistance) * 100);

            return res.json(formatResponse(true, 'Face login successful', {
                user: {
                    _id: user.id,
                    username: user.username,
                    email: user.email,
                    token: token,
                },
                confidence: parseFloat(confidence.toFixed(2)),
                distance: parseFloat(minDistance.toFixed(4)),
            }));
        } else {
            return res.status(401).json(formatResponse(false, 'Face not recognized'));
        }

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Face Login Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};
