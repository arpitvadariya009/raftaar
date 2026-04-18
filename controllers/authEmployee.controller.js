const faceService = require('../utils/face.service');
const AuthEmployee = require('../models/AuthEmployee.model');
const mongoose = require('mongoose');
const fs = require('fs');
const { formatResponse } = require('../utils/helpers');
const mailService = require('../utils/mail.service');




/**
 * Create a new employee (Subscription-aware, image optional)
 * POST /api/auth-employee/create
 * Body: { company, employeeId, fullName, email, ...other employee details }
 * File: image (multipart/form-data) [optional]
 */
exports.createEmployee = async (req, res) => {
    try {
        const {
            company, firstName, lastName, fatherName, dateOfBirth, gender,
            email, contactNumber, countryCode, dialCode,
            emergencyContact, emergencyCountryCode, emergencyDialCode, emergencyRelation,
            address, dateOfJoining, department, designation, reportingHead,
            employmentType, employmentCategory, applicationPlanType,
            highestQualification, yearsOfExperience, skills,
            grossSalary, paymentMode, bankName, accountNumber, bloodGroup
        } = req.body;
        const imageFile = req.file;

        // Validation for required fields based on schema (marked with // *)
        if (
            !company || !firstName || !lastName || !email || !contactNumber ||
            !countryCode || !dialCode || !address || !dateOfBirth ||
            !dateOfJoining || !department || !designation || !reportingHead ||
            !employmentType || !employmentCategory || !grossSalary || !gender
        ) {
            if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
            return res.status(400).json(formatResponse(false, 'Required fields are missing'));
        }

        // Subscription Validation
        const Subscription = require('../models/Subscription');
        const activeSubscription = await Subscription.findOne({ company, status: 'Active' });

        if (!activeSubscription) {
            if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
            return res.status(403).json(formatResponse(false, 'No active subscription found for this company'));
        }

        const requestedPlan = Number(applicationPlanType) || 1;
        const basicLimit = activeSubscription.subscriptionType.subscriptionTypeBasic || 0;
        const proLimit = activeSubscription.subscriptionType.subscriptionTypePro || 0;

        // Count existing employees of the SAME plan type
        const currentPlanCount = await AuthEmployee.countDocuments({
            company,
            isActive: true,
            applicationPlanType: requestedPlan
        });

        const limit = requestedPlan === 2 ? proLimit : basicLimit;

        if (currentPlanCount >= limit) {
            if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
            return res.status(403).json(formatResponse(false, `Limit reached for plan ${requestedPlan} employees`));
        }

        // Check uniqueness of email
        const existingEmployee = await AuthEmployee.findOne({ email });
        if (existingEmployee) {
            if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
            return res.status(409).json(formatResponse(false, 'Email already exists'));
        }

        let descriptorArray = undefined;
        let imagePath = undefined;

        // Image/Face recognition ONLY for "Pro" plan (2)
        if (requestedPlan === 2 && imageFile) {
            const descriptor = await faceService.getFaceDescriptor(imageFile.path);
            if (!descriptor) {
                fs.unlinkSync(imageFile.path);
                return res.status(400).json(formatResponse(false, 'No face detected or multiple faces found in the image'));
            }

            // Face uniqueness check
            const allEmployees = await AuthEmployee.find({ descriptor: { $exists: true, $ne: [] } });
            const threshold = process.env.FACE_SIMILARITY_THRESHOLD || 0.6;

            for (const emp of allEmployees) {
                const storedDescriptor = new Float32Array(emp.descriptor);
                const distance = faceService.getEuclideanDistance(descriptor, storedDescriptor);
                if (distance < threshold) {
                    fs.unlinkSync(imageFile.path);
                    return res.status(409).json(formatResponse(false, `Face already registered for another employee`));
                }
            }
            descriptorArray = Array.from(descriptor);
            imagePath = imageFile.filename;
        } else if (imageFile) {
            // Unlink image if not a Pro plan or not needed
            fs.unlinkSync(imageFile.path);
        }

        // Auto-generate password
        const crypto = require('crypto');
        const autoPassword = crypto.randomBytes(4).toString('hex'); // Example: "a1b2c3d4"

        const newEmployee = new AuthEmployee({
            company, firstName, lastName, fatherName, dateOfBirth, gender,
            email, contactNumber, countryCode, dialCode,
            emergencyContact, emergencyCountryCode, emergencyDialCode, emergencyRelation,
            address, dateOfJoining, department, designation, reportingHead,
            employmentType, employmentCategory, applicationPlanType,
            highestQualification, yearsOfExperience, skills,
            grossSalary, paymentMode, bankName, accountNumber, bloodGroup,
            descriptor: descriptorArray,
            image: imagePath,
            password: autoPassword
        });

        await newEmployee.save();

        // Send credentials via email (asynchronous background task)
        mailService.sendEmail(
            email, 
            'Welcome to the Team! - Your Login Credentials', 
            'employee-welcome', 
            { fullName: `${newEmployee.firstName} ${newEmployee.lastName}`, employeeId: newEmployee._id, password: autoPassword, loginUrl: process.env.FRONTEND_URL || '#' }
        );

        res.status(201).json(formatResponse(true, 'Employee created successfully', newEmployee));

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Create Employee Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};

/**
 * Upload or update employee face image
 * POST /api/auth-employee/:id/image
 * File: image (multipart/form-data)
 */
exports.uploadEmployeeImage = async (req, res) => {
    try {
        const { id } = req.params;
        const imageFile = req.file;

        if (!imageFile) {
            return res.status(400).json(formatResponse(false, 'Image file is required'));
        }

        const employee = await AuthEmployee.findById(id);
        if (!employee) {
            fs.unlinkSync(imageFile.path);
            return res.status(404).json(formatResponse(false, 'Employee not found'));
        }

        // Only "Pro" plan (2) employees can have images
        if (employee.applicationPlanType !== 2 && employee.applicationPlanType !== '2') {
            fs.unlinkSync(imageFile.path);
            return res.status(403).json(formatResponse(false, 'Image upload is only allowed for Pro plan employees'));
        }

        const descriptor = await faceService.getFaceDescriptor(imageFile.path);
        if (!descriptor) {
            fs.unlinkSync(imageFile.path);
            return res.status(400).json(formatResponse(false, 'No face detected or multiple faces found in the image'));
        }

        // Face uniqueness check
        const allEmployees = await AuthEmployee.find({ _id: { $ne: id }, descriptor: { $exists: true, $ne: [] } });
        const threshold = process.env.FACE_SIMILARITY_THRESHOLD || 0.6;

        for (const emp of allEmployees) {
            const storedDescriptor = new Float32Array(emp.descriptor);
            const distance = faceService.getEuclideanDistance(descriptor, storedDescriptor);
            if (distance < threshold) {
                fs.unlinkSync(imageFile.path);
                return res.status(409).json(formatResponse(false, `Face already registered for another employee`));
            }
        }

        employee.descriptor = Array.from(descriptor);
        employee.image = imageFile.filename;
        await employee.save();

        res.json(formatResponse(true, 'Employee face image uploaded successfully', employee));

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Upload Employee Image Error:', error);
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
        const { company, search, isExport, page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', isActive } = req.query;

        // Base matching query
        const matchQuery = {};
        if (company) {
            matchQuery.company = new mongoose.Types.ObjectId(company);
        }

        if (isActive !== undefined && isActive !== '') {
            matchQuery.isActive = isActive === 'true';
        }

        // Search logic (optional, but good practice)
        if (search) {
            matchQuery.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
                { designation: { $regex: search, $options: 'i' } }
            ];
        }

        const pipeline = [
            { $match: matchQuery },
            { $sort: { [sortBy]: order === 'desc' ? -1 : 1 } }
        ];

        // Project data structure
        const projection = {
            _id: 1,
            firstName: 1,
            lastName: 1,
            fullName: 1,
            department: 1,
            designation: 1,
            reportingHead: 1,
            isActive: 1,
            joined: "$dateOfJoining",
            status: { $literal: null },
            image: 1
        };

        // If isExport is true, we get all data without pagination
        if (isExport === 'true' || isExport === true) {
            pipeline.push({ $project: projection });
            const employees = await AuthEmployee.aggregate(pipeline);
            return res.json(formatResponse(true, 'Employees exported successfully', { employees }));
        }

        // Pagination Logic
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Clone pipeline for count
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await AuthEmployee.aggregate(countPipeline);
        const totalCount = countResult.length > 0 ? countResult[0].total : 0;

        // Add pagination to main pipeline
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limitNum });
        pipeline.push({ $project: projection });

        const employees = await AuthEmployee.aggregate(pipeline);
        const totalPages = Math.ceil(totalCount / limitNum);

        res.json(formatResponse(true, 'Employees retrieved successfully', {
            employees,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                limit: limitNum,
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
                    firstName: bestMatch.firstName,
                    lastName: bestMatch.lastName,
                    fullName: bestMatch.fullName,
                    email: bestMatch.email,
                    company: bestMatch.company,
                    department: bestMatch.department,
                    designation: bestMatch.designation,
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

/**
 * Update employee details
 * PUT /api/auth-employee/:id
 * Body: { ...fields to update }
 */
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const employee = await AuthEmployee.findById(id);
        if (!employee) {
            return res.status(404).json(formatResponse(false, 'Employee not found'));
        }

        // If plan type is changing, check subscription slots
        if (updateData.applicationPlanType && updateData.applicationPlanType !== employee.applicationPlanType) {
            const Subscription = require('../models/Subscription');
            const activeSubscription = await Subscription.findOne({ company: employee.company, status: 'Active' });

            if (activeSubscription) {
                const newPlan = updateData.applicationPlanType;
                const basicLimit = activeSubscription.subscriptionType.subscriptionTypeBasic || 0;
                const proLimit = activeSubscription.subscriptionType.subscriptionTypePro || 0;

                const currentPlanCount = await AuthEmployee.countDocuments({
                    company: employee.company,
                    isActive: true,
                    applicationPlanType: newPlan
                });

                const limit = (newPlan === 2 || newPlan === '2') ? proLimit : basicLimit;

                if (currentPlanCount >= limit) {
                    return res.status(403).json(formatResponse(false, `Limit reached for plan ${newPlan} employees`));
                }
            }
        }

        // List of fields that can be updated
        const allowUpdates = [
            'firstName', 'lastName', 'fatherName', 'dateOfBirth', 'gender',
            'email', 'contactNumber', 'countryCode', 'dialCode',
            'emergencyContact', 'emergencyCountryCode', 'emergencyDialCode', 'emergencyRelation',
            'address', 'dateOfJoining', 'department', 'designation', 'reportingHead',
            'employmentType', 'employmentCategory', 'applicationPlanType',
            'highestQualification', 'yearsOfExperience', 'skills',
            'grossSalary', 'paymentMode', 'bankName', 'accountNumber', 'bloodGroup', 'isActive', 'password'
        ];

        // Apply updates
        Object.keys(updateData).forEach(key => {
            if (allowUpdates.includes(key)) {
                employee[key] = updateData[key];
            }
        });

        await employee.save();

        // If password was updated, send new credentials via email
        if (updateData.password) {
            mailService.sendEmail(
                employee.email, 
                'Security Alert: Password Updated Successfully', 
                'employee-password-reset', 
                { fullName: `${employee.firstName} ${employee.lastName}`, employeeId: employee._id, password: updateData.password }
            );
        }

        res.json(formatResponse(true, 'Employee updated successfully', employee));

    } catch (error) {
        console.error('Update Employee Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};
/**
 * Get single employee by ID
 * GET /api/auth-employee/getEmployee/:id
 */
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await AuthEmployee.findById(id).select('-descriptor');

        if (!employee) {
            return res.status(404).json(formatResponse(false, 'Employee not found'));
        }

        res.json(formatResponse(true, 'Employee retrieved successfully', employee));
    } catch (error) {
        console.error('Get Employee By ID Error:', error);
        res.status(500).json(formatResponse(false, error.message));
    }
};

/**
 * Employee Login (ID and Password)
 * POST /api/auth-employee/login
 */
exports.employeeLogin = async (req, res) => {
    try {
        const { employeeId, password } = req.body;

        if (!employeeId || !password) {
            return res.status(400).json(formatResponse(false, 'Employee ID and password are required'));
        }

        const employee = await AuthEmployee.findById(employeeId);
        if (!employee) {
            return res.status(401).json(formatResponse(false, 'Invalid credentials'));
        }

        if (employee.password !== password) {
             return res.status(401).json(formatResponse(false, 'Invalid credentials'));
        }

        if (!employee.isActive) {
            return res.status(403).json(formatResponse(false, 'Account is inactive'));
        }

        // Generate Token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: employee._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });

        res.json(formatResponse(true, 'Login successful', {
            token,
            employee: {
                _id: employee._id,
                fullName: employee.fullName,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                company: employee.company,
                department: employee.department,
                designation: employee.designation,
                image: employee.image
            }
        }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
};

/**
 * Forgot Password
 * POST /api/auth-employee/forgot-password
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const employee = await AuthEmployee.findOne({ email });

        if (!employee) {
            return res.status(404).json(formatResponse(false, 'Employee not found with this email'));
        }

        // Send existing password (simple version) or reset link
        await mailService.sendEmail(
            email,
            'Password Recovery - Raftaar HRMS',
            'employee-password-reset', // Reusing template
            { fullName: employee.fullName, employeeId: employee._id, password: employee.password }
        );

        res.json(formatResponse(true, 'Password sent to your email'));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
};
