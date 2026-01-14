const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Global notification preference (can be toggled from Settings)
    notificationsEnabled: { type: Boolean, default: true },
    // Simple plan flag for Billing screen ("free" | "pro")
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    createdAt: { type: Date, default: Date.now },
});

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
