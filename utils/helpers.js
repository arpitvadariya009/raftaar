const mongoose = require('mongoose');

exports.generateCompanyCode = async (companyName) => {
    // Extract first 5 letters from company name (letters only)
    const baseCode = companyName
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 5)
        .toUpperCase() || 'COMP';

    const Company = mongoose.model('Company');
    let isUnique = false;
    let finalCode = baseCode;
    let counter = 1;

    while (!isUnique) {
        const existing = await Company.findOne({ companyCode: finalCode });
        if (!existing) {
            isUnique = true;
        } else {
            counter++;
            finalCode = `${baseCode}${counter}`;
        }
    }

    return finalCode;
};

// Calculate valid-till date: startDate + durationMonths
exports.calculateValidTill = (startDate, durationMonths) => {
    const validTill = new Date(startDate);
    validTill.setMonth(validTill.getMonth() + durationMonths);
    return validTill;
};

// Check subscription status
exports.getSubscriptionStatus = (validTill) => {
    const today = new Date();
    const diffTime = validTill - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { status: 'Expired', colorCode: 'red', daysRemaining: 0 };
    } else if (diffDays < 30) {
        return { status: 'Expiring Soon', colorCode: 'yellow', daysRemaining: diffDays };
    } else {
        return { status: 'Active', colorCode: 'green', daysRemaining: diffDays };
    }
};

// Standard response formatter
exports.formatResponse = (success, message, data = null, pagination = null) => {
    const res = { success, message };
    if (data) res.data = data;
    if (pagination) res.pagination = pagination;
    return res;
};

// Generate random password
exports.generatePassword = (length = 8) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};
