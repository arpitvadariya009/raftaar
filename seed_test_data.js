const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const LeaveRequest = require('./models/LeaveRequest');
const GatePass = require('./models/GatePass');
const WeeklyOffTemplate = require('./models/WeeklyOffTemplate');
const WeeklyOffAssignment = require('./models/WeeklyOffAssignment');
const AuthEmployee = require('./models/AuthEmployee.model');
require('dotenv').config();

const employeeId = '69c422089c5cbdd48f25bbcd';

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        let employee = await AuthEmployee.findById(employeeId);
        if (!employee) {
            console.log('Hardcoded employee ID not found, finding any employee...');
            employee = await AuthEmployee.findOne();
        }

        if (!employee) {
            console.error('No employee found in database at all');
            process.exit(1);
        }

        const employeeIdToUse = employee._id;
        const companyId = employee.company;

        // 1. Attendance Data (Past 3 days)
        const attendances = [];
        for (let i = 0; i < 3; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            attendances.push({
                employee: employeeIdToUse,
                company: companyId,
                date: date,
                inTime: new Date(date).setHours(9, 0, 0),
                outTime: new Date(date).setHours(18, 0, 0),
                workingHours: 9,
                status: 'Present'
            });
        }
        await Attendance.insertMany(attendances);
        console.log('Added 3 Attendance records');

        // 2. Leave Request
        await LeaveRequest.create({
            employee: employeeIdToUse,
            company: companyId,
            leaveType: 'Personal',
            fromDate: new Date(new Date().setDate(new Date().getDate() + 5)),
            toDate: new Date(new Date().setDate(new Date().getDate() + 7)),
            reason: 'Family function',
            status: 0 // Pending
        });
        console.log('Added 1 Pending Leave Request');

        // 3. Gate Pass
        await GatePass.create({
            employee: employeeIdToUse,
            company: companyId,
            gatePassType: 'Medical',
            date: new Date(),
            startTime: new Date(new Date().setHours(14, 0, 0, 0)),
            endTime: new Date(new Date().setHours(16, 0, 0, 0)),
            reason: 'Doctor checkup',
            status: 0 // Pending
        });
        await GatePass.create({
            employee: employeeIdToUse,
            company: companyId,
            gatePassType: 'Official',
            date: new Date(new Date().setDate(new Date().getDate() - 1)),
            startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(11, 0, 0, 0)),
            endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(13, 0, 0, 0)),
            reason: 'Client meeting',
            status: 1 // Approved
        });
        console.log('Added 2 Gate Pass records (1 Pending, 1 Approved)');

        // 4. Weekly Off Template
        let template = await WeeklyOffTemplate.findOne({ company: companyId, name: 'Standard Weekly Off (Sunday)' });
        if (!template) {
            template = await WeeklyOffTemplate.create({
                name: 'Standard Weekly Off (Sunday)',
                offDays: [0], // Sunday
                company: companyId
            });
            console.log('Added 1 Weekly Off Template');
        }

        // 5. Weekly Off Assignment
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const existingAssignment = await WeeklyOffAssignment.findOne({
            employee: employeeIdToUse,
            month: currentMonth,
            year: currentYear
        });

        if (!existingAssignment) {
            await WeeklyOffAssignment.create({
                employee: employeeIdToUse,
                template: template._id,
                month: currentMonth,
                year: currentYear,
                company: companyId
            });
            console.log(`Added Weekly Off Assignment for ${currentMonth}/${currentYear}`);
        } else {
            console.log(`Weekly Off Assignment for ${currentMonth}/${currentYear} already exists`);
        }

        console.log('Seed data process completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        if (error.code === 11000) {
            console.error('Duplicate key error details:', error.keyValue);
        }
        process.exit(1);
    }
}

seedData();
