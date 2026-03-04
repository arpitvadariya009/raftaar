const cron = require('node-cron');
const Subscription = require('../models/Subscription');

// Run daily at 9:00 AM
const initCronJobs = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily subscription expiry check...');
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);

        // Find active subscriptions expiring in the next 7 days
        const expiringSubscriptions = await Subscription.find({
            validTill: { $gte: today, $lte: sevenDaysFromNow },
            status: 'Active'
        }).populate('company');

        for (const sub of expiringSubscriptions) {
            console.log(`Alert: Subscription for ${sub.company.companyName} is expiring on ${sub.validTill}`);
            // In a real app, you would call an email service here:
            // await sendEmail(sub.company.hrEmail, 'Subscription Expiring', '...');
        }
    });

    // Another job to mark subscriptions as expired
    cron.schedule('0 0 * * *', async () => {
        const result = await Subscription.updateMany(
            { validTill: { $lt: new Date() }, status: 'Active' },
            { $set: { status: 'Expired' } }
        );
        console.log(`Auto-expired ${result.modifiedCount} subscriptions`);
    });
};

module.exports = initCronJobs;
