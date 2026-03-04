const faceService = require('../utils/face.service');
const AuthEmployee = require('../models/AuthEmployee.model');
const fs = require('fs');
const { formatResponse } = require('../utils/helpers');

/**
 * Register a new employee with face recognition
 * POST /api/auth-employee/register
 * Body: { username, email }
 * File: image (multipart/form-data)
 */
exports.registerEmployee = async (req, res) => {
    try {
        const { username, email } = req.body;
        const imageFile = req.file;

        console.log(`Register Employee requested. username: ${username}, email: ${email}, file: ${imageFile ? imageFile.originalname : 'none'}`);

        // Validation
        if (!username || !email) {
            if (imageFile) fs.unlinkSync(imageFile.path);
            return res.status(400).json(formatResponse(false, 'Username and email are required'));
        }

        if (!imageFile) {
            return res.status(400).json(formatResponse(false, 'Image file is required'));
        }

        // Check if username already exists
        const existingUsername = await AuthEmployee.findOne({ username });
        if (existingUsername) {
            fs.unlinkSync(imageFile.path);
            return res.status(409).json(formatResponse(false, 'Username already exists'));
        }

        // Check if email already exists
        const existingEmail = await AuthEmployee.findOne({ email });
        if (existingEmail) {
            fs.unlinkSync(imageFile.path);
            return res.status(409).json(formatResponse(false, 'Email already exists'));
        }

        // Generate face descriptor
        const descriptor = await faceService.getFaceDescriptor(imageFile.path);

        if (!descriptor) {
            fs.unlinkSync(imageFile.path);
            return res.status(400).json(formatResponse(false, 'No face detected or multiple faces found in the image'));
        }

        // Check if face already exists (unique face validation)
        const allEmployees = await AuthEmployee.find({});
        const threshold = process.env.FACE_SIMILARITY_THRESHOLD || 0.6;

        for (const employee of allEmployees) {
            const storedDescriptor = new Float32Array(employee.descriptor);
            const distance = faceService.getEuclideanDistance(descriptor, storedDescriptor);

            if (distance < threshold) {
                fs.unlinkSync(imageFile.path);
                return res.status(409).json(formatResponse(false, `Face already registered for user: ${employee.username}`));
            }
        }

        // Save employee with descriptor
        const newEmployee = new AuthEmployee({
            username,
            email,
            descriptor: Array.from(descriptor),
        });

        await newEmployee.save();

        // Clean up uploaded file (optional - remove if you want to keep images)
        // if (fs.existsSync(imageFile.path)) {
        //     fs.unlinkSync(imageFile.path);
        // }

        res.status(201).json(formatResponse(true, 'Employee registered successfully', {
            employee: {
                _id: newEmployee._id,
                username: newEmployee.username,
                email: newEmployee.email,
                createdAt: newEmployee.createdAt
            }
        }));

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Register Employee Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};

/**
 * Get all employees with pagination
 * GET /api/auth-employee/all
 * Query params: page (default: 1), limit (default: 10)
 */
exports.getAllEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get total count
        const totalCount = await AuthEmployee.countDocuments({ isActive: true });

        // Get paginated employees (excluding descriptor for performance)
        const employees = await AuthEmployee.find({ isActive: true })
            .select('-descriptor') // Exclude descriptor from response
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalPages = Math.ceil(totalCount / limit);

        res.json(formatResponse(true, 'Employees retrieved successfully', {
            employees,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        }));

    } catch (error) {
        console.error('Get All Employees Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};

/**
 * Get employee data by face image (Face Login)
 * POST /api/auth-employee/face-login
 * File: image (multipart/form-data)
 */
exports.getFaceData = async (req, res) => {
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
                console.warn(`Could not delete file: ${err.message}`);
            }
        }

        if (!queryDescriptor) {
            return res.status(400).json(formatResponse(false, 'No face detected in the uploaded image'));
        }

        // Fetch all registered employees for 1:N match
        const allEmployees = await AuthEmployee.find({ isActive: true });

        if (allEmployees.length === 0) {
            return res.status(404).json(formatResponse(false, 'No employees registered in the system'));
        }

        let bestMatch = null;
        let minDistance = Infinity;
        const threshold = process.env.FACE_SIMILARITY_THRESHOLD || 0.6;

        // Find the best matching face
        for (const employee of allEmployees) {
            const storedDescriptor = new Float32Array(employee.descriptor);
            const distance = faceService.getEuclideanDistance(queryDescriptor, storedDescriptor);

            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = employee;
            }
        }

        if (bestMatch && minDistance < threshold) {
            const confidence = Math.max(0, (1 - minDistance) * 100);

            return res.json(formatResponse(true, 'Face recognized successfully', {
                employee: {
                    _id: bestMatch._id,
                    username: bestMatch.username,
                    email: bestMatch.email,
                    createdAt: bestMatch.createdAt
                },
                confidence: parseFloat(confidence.toFixed(2)),
                distance: parseFloat(minDistance.toFixed(4))
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
