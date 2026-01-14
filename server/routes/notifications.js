const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const router = express.Router();

// Mark all notifications as read
router.post('/mark-all-read', auth, async (req, res) => {
    try {
        console.log(`Marking all read for user: ${req.user.id}`);
        const result = await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true }
        );
        console.log(`Updated ${result.modifiedCount} notifications`);
        res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Get all notifications for current user
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('repository', 'name owner');
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Mark a notification as read/unread
router.patch('/:id', auth, async (req, res) => {
    try {
        const updates = {};
        if (typeof req.body.isRead === 'boolean') {
            updates.isRead = req.body.isRead;
        }

        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updates,
            { new: true }
        );

        if (!notif) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notif);
    } catch (error) {
        console.error('Update notification error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Optional: keep delete route (not used by mobile now) for admin or cleanup
router.delete('/:id', auth, async (req, res) => {
    try {
        const deleted = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!deleted) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification removed' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
