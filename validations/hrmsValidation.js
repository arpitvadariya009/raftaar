const { z } = require('zod');

// Company/Customer Schema
const companySchema = z.object({
    companyName: z.string().min(3, 'Company name must be at least 3 characters'),
    address: z.string().optional(),
    location: z.string().optional(),
    gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format').optional(),
    contactNumber: z.string().regex(/^[0-9]{10}$/, 'Contact number must be 10 digits'),
    alternateContact: z.string().optional(),
    hrName: z.string().min(2, 'HR name is required'),
    hrEmail: z.string().email('Invalid HR email'),
    employeeStrength: z.number().optional(),
    status: z.enum(['Active', 'Inactive', 'Trial']).optional(),
    notificationEnabled: z.boolean().optional(),
});

// Subscription Schema
const subscriptionSchema = z.object({
    company: z.string().min(24, 'Invalid Company ID format'),
    subscriptionType: z.string().min(1, 'Subscription type is required'),
    billingType: z.enum(['One-Time', 'Monthly']),
    charge: z.number().positive('Charge must be a positive number'),
    startDate: z.string().or(z.date()),
    duration: z.number().int().positive('Duration must be at least 1 month'),
});

// Notification Banner Schema
const bannerSchema = z.object({
    company: z.string().min(24, 'Invalid Company ID format'),
    companyName: z.string().min(1, 'Company name is required'),
    message: z.string().min(1, 'Banner message is required'),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    isActive: z.boolean().optional(),
});

// Enquiry Schema
const enquirySchema = z.object({
    companyName: z.string().min(2, 'Company name is required'),
    enquiryType: z.enum(['New', 'Renewal', 'Custom', 'Demo']),
    description: z.string().min(5, 'Description is required'),
    contactPhone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
    contactEmail: z.string().email('Invalid email format'),
});

module.exports = {
    companySchema,
    subscriptionSchema,
    bannerSchema,
    enquirySchema,
};
