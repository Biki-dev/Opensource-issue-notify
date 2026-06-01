const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    githubCommentId: { type: Number, required: true },
    author: { type: String, required: true },
    authorAvatar: { type: String, default: null },
    body: { type: String, required: true },
    bodyPreview: { type: String, default: null },
    createdAt: { type: Date, required: true },
    isAuthor: { type: Boolean, default: false },
    reactions: {
        thumbsUp: { type: Number, default: 0 },
        thumbsDown: { type: Number, default: 0 },
        laugh: { type: Number, default: 0 },
        hooray: { type: Number, default: 0 },
        confused: { type: Number, default: 0 },
        heart: { type: Number, default: 0 },
        rocket: { type: Number, default: 0 },
        eyes: { type: Number, default: 0 }
    }
}, { _id: false });

const IssueTrackerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true },

    issueNumber: { type: Number, required: true },
    issueTitle: { type: String, required: true },
    issueUrl: { type: String, required: true },
    issueState: { type: String, enum: ['open', 'closed'], default: 'open' },
    issueBody: { type: String, default: null },
    issueBodyPreview: { type: String, default: null },
    issueAuthor: { type: String, default: null },
    issueAuthorAvatar: { type: String, default: null },

    comments: { type: [CommentSchema], default: [] },
    lastCommentId: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    newCommentCount: { type: Number, default: 0 },
    lastChecked: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },

    notifyOnAnyComment: { type: Boolean, default: true },
    notifyOnClose: { type: Boolean, default: true },
    notifyOnMaintainerOnly: { type: Boolean, default: false },

    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

IssueTrackerSchema.index({ user: 1, issueUrl: 1 }, { unique: true });
IssueTrackerSchema.index({ user: 1, active: 1 });
IssueTrackerSchema.index({ lastChecked: 1, active: 1 });

module.exports = mongoose.model('IssueTracker', IssueTrackerSchema);