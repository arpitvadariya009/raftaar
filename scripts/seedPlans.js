/**
 * Seed default subscription plans (Basic & Pro)
 * Run: node scripts/seedPlans.js
 */
const mongoose = require('mongoose');
require('dotenv').config();
const SubscriptionPlan = require('../models/SubscriptionPlan');

const defaultPlans = [
    {
        planName: 'Basic',
        monthlyPrice: 1,
        yearlyPrice: 12,
        features: ['Basic Reports', 'Email Support'],
        isActive: true
    },
    {
        planName: 'Pro',
        monthlyPrice: 1.25,
        yearlyPrice: 15,
        features: ['Advanced Reports', 'Priority Support', 'Custom Dashboards'],
        isActive: true
    }
];

const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        for (const plan of defaultPlans) {
            const existing = await SubscriptionPlan.findOne({ planName: plan.planName });
            if (existing) {
                // Update existing plan prices
                existing.monthlyPrice = plan.monthlyPrice;
                existing.yearlyPrice = plan.yearlyPrice;
                existing.features = plan.features;
                await existing.save();
                console.log(`Updated plan: ${plan.planName}`);
            } else {
                await SubscriptionPlan.create(plan);
                console.log(`Created plan: ${plan.planName}`);
            }
        }

        console.log('Plans seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding plans:', error.message);
        process.exit(1);
    }
};

seedPlans();
