const mongoose = require('mongoose');
const Company = require('../models/Company');
const AuthEmployee = require('../models/AuthEmployee.model');
const { loginCompany } = require('../controllers/companyController');
const { employeeLogin } = require('../controllers/authEmployee.controller');
require('dotenv').config();

function mockResponse() {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.jsonData = data;
        return res;
    };
    return res;
}

async function runTests() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const company = await Company.findOne();
        if (!company) {
            console.error('No company found for testing!');
            process.exit(1);
        }

        const employee = await AuthEmployee.findOne({ company: company._id });
        if (!employee) {
            console.error('No employee found for testing!');
            process.exit(1);
        }

        console.log('\n--- Test Data ---');
        console.log(`Company: ${company.companyName} (Code: ${company.companyCode}, ObjectId: ${company._id})`);
        console.log(`Employee: ${employee.fullName} (Code: ${employee.employeeCode}, Email: ${employee.email}, ObjectId: ${employee._id})`);

        // Test 1: Company Login with companyCode
        console.log('\nTest 1: Company Login with companyCode...');
        const req1 = {
            body: {
                companyCode: company.companyCode,
                password: 'wrongpassword'
            }
        };
        const res1 = mockResponse();
        await loginCompany(req1, res1);
        console.log('Result Status:', res1.statusCode || 200);
        console.log('Result JSON Message:', res1.jsonData ? res1.jsonData.message : 'N/A');

        // Test 2: Employee Login with combined code
        console.log('\nTest 2: Employee Login with combined code...');
        const combinedCode = `${company.companyCode}-${employee.employeeCode}`;
        console.log(`Using combined code: ${combinedCode}`);
        const req2 = {
            body: {
                employeeId: combinedCode,
                password: 'wrongpassword'
            }
        };
        const res2 = mockResponse();
        await employeeLogin(req2, res2);
        console.log('Result Status:', res2.statusCode || 200);
        console.log('Result JSON Message:', res2.jsonData ? res2.jsonData.message : 'N/A');

        // Test 3: Employee Login with Email
        console.log('\nTest 3: Employee Login with Email...');
        const req3 = {
            body: {
                employeeId: employee.email,
                password: 'wrongpassword'
            }
        };
        const res3 = mockResponse();
        await employeeLogin(req3, res3);
        console.log('Result Status:', res3.statusCode || 200);
        console.log('Result JSON Message:', res3.jsonData ? res3.jsonData.message : 'N/A');

        // Test 4: Company Login with _id (ObjectId)
        console.log('\nTest 4: Company Login with _id...');
        const req4 = {
            body: {
                _id: company._id.toString(),
                password: 'wrongpassword'
            }
        };
        const res4 = mockResponse();
        await loginCompany(req4, res4);
        console.log('Result Status:', res4.statusCode || 200);
        console.log('Result JSON Message:', res4.jsonData ? res4.jsonData.message : 'N/A');

        // Test 5: Employee Login with _id (ObjectId)
        console.log('\nTest 5: Employee Login with _id...');
        const req5 = {
            body: {
                employeeId: employee._id.toString(),
                password: 'wrongpassword'
            }
        };
        const res5 = mockResponse();
        await employeeLogin(req5, res5);
        console.log('Result Status:', res5.statusCode || 200);
        console.log('Result JSON Message:', res5.jsonData ? res5.jsonData.message : 'N/A');

        mongoose.connection.close();
    } catch (err) {
        console.error('Test run failed:', err);
    }
}

runTests();
