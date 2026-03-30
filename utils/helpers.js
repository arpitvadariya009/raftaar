const Company = require('../models/Company');

// Generate unique company code: AB-001, TT-002, etc.
exports.generateCompanyCode = async (companyName) => {
    // Extract first 2 letters from company name
    const prefix = companyName
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 2)
        .toUpperCase() || 'CP';

    // Find the latest company with this prefix
    const lastCompany = await Company.findOne({
        companyCode: new RegExp(`^${prefix}-`)
    }).sort({ companyCode: -1 });

    let number = 1;
    if (lastCompany) {
        const lastCode = lastCompany.companyCode;
        const lastNumber = parseInt(lastCode.split('-')[1]);
        if (!isNaN(lastNumber)) {
            number = lastNumber + 1;
        }
    }

    return `${prefix}-${String(number).padStart(3, '0')}`;
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
