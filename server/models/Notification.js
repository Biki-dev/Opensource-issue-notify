const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true },
    issueTitle: { type: String, required: true },
    issueUrl: { type: String, required: true },
    matchedLabels: [{ type: String }],
    isRead: { type: Boolean, default: false },
    pushTicketId: { type: String, default: null },
    pushTicketStatus: {
        type: String,
        enum: ['pending', 'ok', 'error', null],
        default: null
    },
    pushTicketError: { type: String, default: null },
    pushTicketCheckedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
// Compound unique index to prevent duplicate notifications
NotificationSchema.index({ user: 1, repository: 1, issueUrl: 1 }, { unique: true });

// TTL index for auto-deletion of read notifications after 30 days
NotificationSchema.index(
    { createdAt: 1 }, 
    { 
        expireAfterSeconds: 2592000, // 30 days
        partialFilterExpression: { isRead: true }
    }
);

module.exports = mongoose.model('Notification', NotificationSchema);
