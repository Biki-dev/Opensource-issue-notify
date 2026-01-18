const mongoose = require('mongoose');
const { Subscription } = require('../models/Resources');
require('dotenv').config();

async function cleanupOrphanedSubscriptions() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all subscriptions
        const allSubs = await Subscription.find({}).populate('repository');
        
        let orphanedCount = 0;
        const orphanedIds = [];

        for (const sub of allSubs) {
            if (!sub.repository) {
                orphanedCount++;
                orphanedIds.push(sub._id);
                console.log(`❌ Orphaned subscription: ${sub._id}`);
            }
        }

        if (orphanedCount > 0) {
            console.log(`\n🗑️  Found ${orphanedCount} orphaned subscriptions`);
            console.log('Deleting...');
            
            const result = await Subscription.deleteMany({ _id: { $in: orphanedIds } });
            console.log(`✅ Deleted ${result.deletedCount} orphaned subscriptions`);
        } else {
            console.log('✅ No orphaned subscriptions found');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupOrphanedSubscriptions();
