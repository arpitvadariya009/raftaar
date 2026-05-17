/**
 * One-time Migration Script
 * Converts all plain text passwords to bcrypt hashed passwords
 * Run: node scripts/migratePasswords.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AuthEmployee = require('../models/AuthEmployee.model');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

async function migratePasswords() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Fetch all employees who have a password
        const employees = await AuthEmployee.find({ password: { $exists: true, $ne: null } }).select('+password');

        console.log(`📋 Total employees with password: ${employees.length}`);

        let migrated = 0;
        let alreadyHashed = 0;
        let skipped = 0;

        for (const emp of employees) {
            // Bcrypt hashes always start with "$2b$" or "$2a$"
            const isAlreadyHashed = emp.password && emp.password.startsWith('$2');

            if (isAlreadyHashed) {
                alreadyHashed++;
                continue; // Already hashed, skip
            }

            if (!emp.password) {
                skipped++;
                continue;
            }

            // Hash the plain text password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(emp.password, salt);

            // Use updateOne to bypass pre-save hook (avoid double hashing)
            await AuthEmployee.updateOne(
                { _id: emp._id },
                { $set: { password: hashedPassword } }
            );

            migrated++;
            console.log(`  ✅ Migrated: ${emp.email || emp._id}`);
        }

        console.log('\n=============================');
        console.log(`✅ Migrated (plain → hashed) : ${migrated}`);
        console.log(`⏭️  Already hashed (skipped)  : ${alreadyHashed}`);
        console.log(`⚠️  Skipped (no password)     : ${skipped}`);
        console.log('=============================');
        console.log('\n🎉 Password migration complete!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

migratePasswords();
