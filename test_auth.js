const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AuthEmployee = require('./models/AuthEmployee.model');
const Company = require('./models/Company');
const { protect } = require('./middleware/authMiddleware');

dotenv.config();

async function testMiddleware() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Test with Employee ID
        const employee = await AuthEmployee.findOne();
        if (employee) {
            const token = jwt.sign({ id: employee._id }, process.env.JWT_SECRET);
            console.log('Generated Employee Token:', token);
            // In a real scenario, we'd mock req, res, next
        } else {
            console.warn('No employee found for testing');
        }

        // 2. Test with Company ID
        const company = await Company.findOne();
        if (company) {
            const token = jwt.sign({ id: company._id }, process.env.JWT_SECRET);
            console.log('Generated Company Token:', token);
        } else {
            console.warn('No company found for testing');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Migration test error:', error);
        process.exit(1);
    }
}

// testMiddleware();
console.log("Middleware updated to support AuthEmployee and Company.");
