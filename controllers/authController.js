const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { formatResponse } = require('../utils/helpers');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password,
        });

        if (user) {
            const token = generateToken(user._id);

            // Save token to DB as requested
            user.token = token;
            await user.save();

            res.status(201).json(formatResponse(true, 'User registered successfully', {
                _id: user.id,
                username: user.username,
                email: user.email,
                token: token,
            }));
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            // Update token in DB
            user.token = token;
            await user.save();

            res.json(formatResponse(true, 'Login successful', {
                _id: user.id,
                username: user.username,
                email: user.email,
                token: token,
            }));
        } else {
            res.status(401);
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

module.exports = {
    registerUser,
    loginUser,
    generateToken,
};
