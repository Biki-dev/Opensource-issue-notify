/**
 * Migrate script to fix old encrypted tokens
 * Run once to clean up database
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from server folder
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const connectDB = require('../utils/db');

async function migrateTokens() {
    try {
        console.log('🔄 Starting token migration...');
        await connectDB();

        // Find all users with personalGitHubToken
        const users = await User.find({ personalGitHubToken: { $exists: true, $ne: null } });
        console.log(`Found ${users.length} users with tokens`);

        let fixedCount = 0;
        let deletedCount = 0;

        for (const user of users) {
            try {
                // Try to decrypt the token
                const decrypted = user.getPersonalGitHubToken();
                console.log(`✅ Token valid for user ${user.email}`);
                fixedCount++;
            } catch (error) {
                // Token is bad - delete it
                console.log(`❌ Deleting bad token for user ${user.email}: ${error.message}`);
                user.personalGitHubToken = null;
                user.tokenIsValid = false;
                user.rateLimitTier = 'default';
                user.tokenAddedAt = null;
                user.tokenLastVerified = null;
                await user.save();
                deletedCount++;
            }
        }

        console.log(`\n📊 Migration complete!`);
        console.log(`   ✅ Valid tokens: ${fixedCount}`);
        console.log(`   ❌ Bad tokens deleted: ${deletedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateTokens();
