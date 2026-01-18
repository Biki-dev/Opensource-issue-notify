const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const { Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }
};

const clearAllUserData = async () => {
    await connectDB();

    try {
        console.log('🗑️  Starting cleanup of ALL user data...');

        // 1. Delete all Subscriptions (they depend on users)
        const subResult = await Subscription.deleteMany({});
        console.log(`   ✓ Deleted ${subResult.deletedCount} subscriptions`);

        // 2. Delete all Notifications (they depend on users)
        const notifResult = await Notification.deleteMany({});
        console.log(`   ✓ Deleted ${notifResult.deletedCount} notifications`);

        // 3. Delete all Users
        const userResult = await User.deleteMany({});
        console.log(`   ✓ Deleted ${userResult.deletedCount} users`);

        console.log('\n✅ Database cleanup complete! All users and related data removed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        process.exit(1);
    }
};

clearAllUserData();
