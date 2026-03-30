const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const AuthEmployee = require('../models/AuthEmployee.model');
const Company = require('../models/Company');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            console.log("req.headers.authorization", req.headers.authorization);
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attempt to find as Employee
            let user = await AuthEmployee.findById(decoded.id).select('-password');
            let role = 'employee';

            // If not found, attempt to find as Company
            if (!user) {
                user = await Company.findById(decoded.id).select('-password');
                role = 'company';
            }

            if (!user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            // Attach user and role to request
            req.user = user;
            req.role = role;

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

module.exports = { protect };
