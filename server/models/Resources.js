const mongoose = require('mongoose');

// Repository Schema: Tracks the Repo state and latest check info
const RepositorySchema = new mongoose.Schema({
    githubUrl: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    name: { type: String, required: true },
    ownerAvatarUrl: { type: String },
    lastChecked: { type: Date, default: null },
    latestIssueNumber: { type: Number, default: 0 }, // Track the latest issue number we've seen
    createdAt: { type: Date, default: Date.now }
});

// Subscription Schema: Links User to Repo with specific Labels
const SubscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true },
    labels: [{ type: String }], // e.g. ['bug', 'enhancement']
    active: { type: Boolean, default: true },
    // Controls whether this subscription appears in UI lists like Repository Privacy
    visible: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate subscriptions for same user/repo
SubscriptionSchema.index({ user: 1, repository: 1 }, { unique: true });

const Repository = mongoose.model('Repository', RepositorySchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = { Repository, Subscription };
