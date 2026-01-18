#!/usr/bin/env node

/**
 * Full diagnostic and fix script for notification issues
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

async function runDiagnostics() {
    console.log('\n🔍 NOTIFICATION SYSTEM DIAGNOSTICS\n');
    console.log('=' .repeat(50));

    try {
        // 1. Check push token registration
        console.log('\n1️⃣ Checking push token registrations...');
        try {
            const res = await axios.get(`${BASE_URL}/debug/push-tokens`);
            console.log(`   ✅ ${res.data.count} users found`);
            res.data.status.forEach(u => {
                const status = u.tokenValid ? '✅' : '❌';
                console.log(`   ${status} ${u.email}: ${u.hasToken ? 'registered' : 'NOT registered'}`);
            });
        } catch (e) {
            console.error('   ❌ Failed to check push tokens:', e.message);
        }

        // 2. Trigger manual check
        console.log('\n2️⃣ Running manual repository check...');
        try {
            const res = await axios.post(`${BASE_URL}/debug/check`);
            console.log(`   ✅ Check triggered`);
        } catch (e) {
            console.error('   ❌ Failed to trigger check:', e.message);
        }

        // 3. Info
        console.log('\n3️⃣ Configuration info:');
        console.log(`   📍 BASE_URL: ${BASE_URL}`);
        console.log(`   🔐 ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? 'Set (' + process.env.ENCRYPTION_KEY.length + ' chars)' : 'NOT SET'}`);
        console.log(`   📊 MONGO_URI: ${process.env.MONGO_URI ? 'Connected' : 'NOT SET'}`);

        console.log('\n' + '=' .repeat(50));
        console.log('\n✅ Diagnostics complete!\n');

    } catch (error) {
        console.error('\n❌ Diagnostic error:', error.message);
    }
}

// Run diagnostics
runDiagnostics();
