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

// Add indexes for better query performance
RepositorySchema.index({ owner: 1, name: 1 });
RepositorySchema.index({ lastChecked: 1 });

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
// Index for finding active subscriptions by repo
SubscriptionSchema.index({ repository: 1, active: 1 });
// Index for finding user's subscriptions
SubscriptionSchema.index({ user: 1, active: 1 });

// 🆕 VALIDATION HOOK: Ensure repository exists before saving
SubscriptionSchema.pre('save', async function(next) {
    // Validate repository exists before saving
    if (this.isNew || this.isModified('repository')) {
        const Repository = mongoose.model('Repository');
        const repoExists = await Repository.exists({ _id: this.repository });
        
        if (!repoExists) {
            throw new Error(`Repository ${this.repository} does not exist`);
        }
    }
    next();
});

const Repository = mongoose.model('Repository', RepositorySchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = { Repository, Subscription };
