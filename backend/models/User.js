const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    emailVerified: { type: Boolean, default: false },
    totalBandwidth: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    fcmTokens: [{ type: String }],
});

module.exports = mongoose.model("User", UserSchema);