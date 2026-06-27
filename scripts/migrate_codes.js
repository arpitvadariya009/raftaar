const mongoose = require('mongoose');
const Company = require('../models/Company');
const AuthEmployee = require('../models/AuthEmployee.model');
const { generateCompanyCode } = require('../utils/helpers');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Successfully connected to MongoDB');

        // 1. Migrate Companies
        console.log('--- Migrating Companies ---');
        const companies = await Company.find();
        for (const company of companies) {
            if (!company.companyCode) {
                const code = await generateCompanyCode(company.companyName);
                company.companyCode = code;
                await company.save();
                console.log(`Assigned code ${code} to Company: ${company.companyName}`);
            } else {
                console.log(`Company ${company.companyName} already has code: ${company.companyCode}`);
            }
        }

        // 2. Migrate Employees
        console.log('\n--- Migrating Employees ---');
        const employees = await AuthEmployee.find();
        for (const employee of employees) {
            if (!employee.employeeCode) {
                // Get company code
                const companyDoc = await Company.findById(employee.company);
                const companyCode = companyDoc ? companyDoc.companyCode : 'EMP';

                const cleanFirstName = employee.firstName
                    .replace(/[^a-zA-Z]/g, '')
                    .toUpperCase() || 'EMP';

                // Find siblings under same company with same name prefix
                const regex = new RegExp(`^${cleanFirstName}(\\d+)?$`);
                const siblings = await AuthEmployee.find({
                    company: employee.company,
                    employeeCode: regex,
                    _id: { $ne: employee._id }
                });

                let maxNumber = 0;
                let exactMatchFound = false;

                siblings.forEach(sib => {
                    if (sib.employeeCode) {
                        const match = sib.employeeCode.match(new RegExp(`^${cleanFirstName}(\\d+)?$`));
                        if (match) {
                            if (match[1]) {
                                const num = parseInt(match[1]);
                                if (num > maxNumber) maxNumber = num;
                            } else {
                                exactMatchFound = true;
                            }
                        }
                    }
                });

                let codeToAssign;
                if (!exactMatchFound) {
                    codeToAssign = cleanFirstName;
                } else {
                    const nextNum = maxNumber > 0 ? maxNumber + 1 : 2;
                    codeToAssign = `${cleanFirstName}${nextNum}`;
                }

                employee.employeeCode = codeToAssign;
                await employee.save();
                console.log(`Assigned code ${companyCode}-${codeToAssign} to Employee: ${employee.fullName}`);
            } else {
                const companyDoc = await Company.findById(employee.company);
                const companyCode = companyDoc ? companyDoc.companyCode : 'EMP';
                console.log(`Employee ${employee.fullName} already has code: ${companyCode}-${employee.employeeCode}`);
            }
        }

        console.log('\nMigration successfully completed!');
        mongoose.connection.close();
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrate();
