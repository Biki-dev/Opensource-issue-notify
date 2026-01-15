const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for GitHub OAuth users

    // Profile picture URL (from GitHub or uploaded)
    profilePicture: { type: String, default: null },

    // GitHub OAuth fields
    githubId: { type: String, unique: true, sparse: true },
    githubUsername: { type: String },

    // Authentication method
    authMethod: {
        type: String,
        enum: ['email', 'github'],
        default: 'email'
    },

    // Global notification preference
    notificationsEnabled: { type: Boolean, default: true },

    // Simple plan flag for Billing screen
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },

    createdAt: { type: Date, default: Date.now },
});

// Only hash password if it exists and is modified
UserSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);