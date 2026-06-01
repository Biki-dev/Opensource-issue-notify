const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const connectDB = require('./utils/db');
const { startScheduler, checkIssues } = require('./services/scheduler');
const { startCleanupJob } = require('./services/cleanup');
const { startPushReceiptVerificationJob } = require('./services/pushNotifications');
const { startCommentPoller } = require('./services/commentPoller');
const { mergeExpoPushTokens } = require('./utils/expoPushTokens');

dotenv.config();
connectDB();

console.log(`🔐 GitHub token configured: ${process.env.GITHUB_TOKEN ? 'yes' : 'no'}`);

const app = express();
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/repos', require('./routes/repo'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/issue-tracker', require('./routes/issueTracker'));
app.use('/api/user/token', require('./routes/token'));
app.use('/api/health', require('./routes/health'));

// Debug routes moved to dedicated router
app.use('/api/debug', require('./routes/debug'));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    // 🆕 CLEANUP: Remove orphaned subscriptions on startup
    console.log('🧹 Running cleanup tasks...');
    try {
        const { Subscription } = require('./models/Resources');
        
        const allSubs = await Subscription.find({}).populate('repository');
        const orphanedIds = allSubs
            .filter(sub => !sub.repository)
            .map(sub => sub._id);

        if (orphanedIds.length > 0) {
            const result = await Subscription.deleteMany({ _id: { $in: orphanedIds } });
            console.log(`   ✅ Cleaned ${result.deletedCount} orphaned subscriptions`);
        } else {
            console.log('   ✅ No orphaned subscriptions found');
        }
    } catch (error) {
        console.error('   ⚠️  Cleanup failed:', error.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Local: http://localhost:${PORT}`);
        console.log(`Network: http://10.36.220.78:${PORT}`);
        startScheduler();
        startCleanupJob(); // 🆕 Add this
        startPushReceiptVerificationJob();
        startCommentPoller();
    });
};

startServer();

