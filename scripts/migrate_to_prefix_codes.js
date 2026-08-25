const mongoose = require('mongoose');
const Company = require('../models/Company');
const AuthEmployee = require('../models/AuthEmployee.model');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Successfully connected to MongoDB');

        // 1. Ensure all companies have a companyCode
        console.log('--- Checking/Migrating Company Codes ---');
        const companies = await Company.find();
        for (const company of companies) {
            if (!company.companyCode) {
                const { generateCompanyCode } = require('../utils/helpers');
                const code = await generateCompanyCode(company.companyName);
                company.companyCode = code;
                await company.save();
                console.log(`Assigned code ${code} to Company: ${company.companyName}`);
            } else {
                console.log(`Company ${company.companyName} already has code: ${company.companyCode}`);
            }
        }

        // 2. Migrate Employees to the new prefix format
        console.log('\n--- Migrating Employee Codes to Prefix Format ---');
        const employees = await AuthEmployee.find();
        for (const employee of employees) {
            const companyDoc = await Company.findById(employee.company);
            if (!companyDoc) {
                console.warn(`Warning: Company not found for employee ${employee.fullName} (${employee._id})`);
                continue;
            }

            const companyCode = companyDoc.companyCode || 'EMP';
            const companyCodePrefix = companyCode.charAt(0).toUpperCase() + companyCode.slice(1).toLowerCase();

            let targetCode = '';

            if (employee.employeeCode) {
                // If it already has the hyphen and matches the company prefix, it is already migrated
                if (employee.employeeCode.includes('-') && employee.employeeCode.toUpperCase().startsWith(`${companyCode.toUpperCase()}-`)) {
                    console.log(`Employee ${employee.fullName} already has prefix code: ${employee.employeeCode}`);
                    continue;
                }
                
                // If it has a code but no prefix, prepend the prefix
                targetCode = `${companyCodePrefix}-${employee.employeeCode.toUpperCase()}`;
            } else {
                // If no code, generate from firstName
                const cleanFirstName = employee.firstName
                    .replace(/[^a-zA-Z]/g, '')
                    .toUpperCase() || 'EMP';
                targetCode = `${companyCodePrefix}-${cleanFirstName}`;
            }

            // Ensure uniqueness check (if duplicate targetCode exists, append numbers)
            const baseCode = targetCode;
            const regex = new RegExp(`^${baseCode}(\\d+)?$`);
            const siblings = await AuthEmployee.find({
                company: employee.company,
                employeeCode: regex,
                _id: { $ne: employee._id }
            });

            if (siblings.length > 0) {
                let maxNumber = 0;
                siblings.forEach(sib => {
                    if (sib.employeeCode) {
                        const match = sib.employeeCode.match(new RegExp(`^${baseCode}(\\d+)?$`));
                        if (match && match[1]) {
                            const num = parseInt(match[1]);
                            if (num > maxNumber) maxNumber = num;
                        }
                    }
                });
                const nextNum = maxNumber > 0 ? maxNumber + 1 : 1;
                const paddedNum = String(nextNum).padStart(2, '0');
                targetCode = `${baseCode}${paddedNum}`;
            }

            const oldCode = employee.employeeCode;
            employee.employeeCode = targetCode;
            await employee.save();
            console.log(`Updated Employee ${employee.fullName}: ${oldCode || 'none'} -> ${targetCode}`);
        }

        console.log('\nMigration successfully completed!');
        mongoose.connection.close();
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrate();
