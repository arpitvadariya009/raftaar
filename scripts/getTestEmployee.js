require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AuthEmployee = require('../models/AuthEmployee.model');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const emp = await AuthEmployee.findOne({ isActive: true }).select('_id email fullName');

    // Reset password to Test@1234 for testing
    const hash = await bcrypt.hash('Test@1234', 10);
    await AuthEmployee.updateOne({ _id: emp._id }, { $set: { password: hash } });

    console.log('==============================');
    console.log('Employee ID :', emp._id.toString());
    console.log('Email       :', emp.email);
    console.log('Name        :', emp.fullName);
    console.log('Password    : Test@1234');
    console.log('==============================');
    await mongoose.disconnect();
    process.exit(0);
});
