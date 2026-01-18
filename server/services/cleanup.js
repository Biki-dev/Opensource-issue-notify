const cron = require('node-cron');
const { Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');

/**
 * Daily cleanup job
 * Runs at 2 AM every day
 */
const startCleanupJob = () => {
    cron.schedule('0 2 * * *', async () => {
        console.log('🧹 Running daily cleanup job...');
        
        try {
            // 1. Clean orphaned subscriptions
            const allSubs = await Subscription.find({}).populate('repository');
            const orphanedIds = allSubs
                .filter(sub => !sub.repository)
                .map(sub => sub._id);

            if (orphanedIds.length > 0) {
                const result = await Subscription.deleteMany({ _id: { $in: orphanedIds } });
                console.log(`   ✅ Deleted ${result.deletedCount} orphaned subscriptions`);
            }

            // 2. Clean old read notifications (older than 30 days)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const oldNotifs = await Notification.deleteMany({
                isRead: true,
                createdAt: { $lt: thirtyDaysAgo }
            });
            console.log(`   ✅ Deleted ${oldNotifs.deletedCount} old read notifications`);

            console.log('✅ Daily cleanup complete');
        } catch (error) {
            console.error('❌ Cleanup job failed:', error.message);
        }
    });

    console.log('📅 Daily cleanup job scheduled (2 AM)');
};

module.exports = { startCleanupJob };
