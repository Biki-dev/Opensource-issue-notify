const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

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

    // Personal GitHub Token for private repos & better rate limits
    // Stored encrypted in database (AES-256-GCM)
    personalGitHubToken: { 
        type: String, 
        select: false, // Don't return by default for security
        default: null 
    },

    // Token metadata
    tokenAddedAt: { type: Date, default: null },
    tokenLastVerified: { type: Date, default: null },
    tokenIsValid: { type: Boolean, default: true },

    // Rate limit tier (determines check frequency)
    rateLimitTier: {
        type: String,
        enum: ['default', 'personal', 'premium'], // default=60min, personal=30min, premium=15min
        default: 'default'
    },

     // Push notification token from Expo
    expoPushToken: { 
        type: String, 
        default: null 
    },

     // Device info for debugging
    deviceInfo: {
        platform: String, // 'ios' or 'android'
        model: String,
        osVersion: String
    },

    // Timestamps

    createdAt: { type: Date, default: Date.now },
    lastProfileUpdate: { type: Date, default: Date.now },
    githubAccessToken: { type: String, select: false }, // Store token for periodic updates
});

// Pre-save hook: Encrypt personalGitHubToken if it's been modified
UserSchema.pre('save', async function () {
    // Handle password hashing
    if (this.password && this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    
    // Handle token encryption
    if (this.personalGitHubToken && this.isModified('personalGitHubToken')) {
        try {
            // Only encrypt if it's not already encrypted (check for : separator)
            if (!this.personalGitHubToken.includes(':')) {
                const encryptedToken = encrypt(this.personalGitHubToken);
                if (!encryptedToken) {
                    throw new Error('Encryption returned null or empty value');
                }
                this.personalGitHubToken = encryptedToken;
                console.log('✅ Token encrypted and saved');
            }
        } catch (error) {
            console.error('❌ Token encryption error during save:', error.message);
            throw new Error('Failed to encrypt GitHub token. Ensure ENCRYPTION_KEY is configured.');
        }
    }
});

/**
 * Instance method: Get decrypted personal GitHub token
 * @returns {string|null} Decrypted token or null if not set
 */
UserSchema.methods.getPersonalGitHubToken = function () {
    if (!this.personalGitHubToken) return null;
    
    try {
        return decrypt(this.personalGitHubToken);
    } catch (error) {
        console.error('Token decryption error:', error.message);
        throw new Error('Failed to decrypt GitHub token. The encryption key may be invalid.');
    }
};

/**
 * Instance method: Verify password
 */
UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);