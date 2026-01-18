const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { Repository, Subscription } = require('../models/Resources');
const Notification = require('../models/Notification');
const router = express.Router();

/**
 * Basic health check
 * GET /api/health
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

/**
 * Detailed health check with statistics
 * GET /api/health/detailed
 */
router.get('/detailed', async (req, res) => {
    try {
        const [userCount, repoCount, subscriptionCount, unreadNotifications, tokenUsers] = await Promise.all([
            User.countDocuments(),
            Repository.countDocuments(),
            Subscription.countDocuments(),
            Notification.countDocuments({ isRead: false }),
            User.countDocuments({ 
                personalGitHubToken: { $exists: true, $ne: null } 
            })
        ]);

        res.json({
            status: 'ok',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            stats: {
                users: userCount,
                repos: repoCount,
                subscriptions: subscriptionCount,
                unreadNotifications: unreadNotifications
            },
            tokenStats: {
                usersWithToken: tokenUsers,
                tokenAdoptionRate: userCount > 0 ? ((tokenUsers / userCount) * 100).toFixed(2) + '%' : '0%'
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
