const User = require("../models/User");
const admin = require("firebase-admin");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// @desc    Get current security status
// @route   GET /api/security/status
// @access  Private
const getSecurityStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // In a real production app, we would query a separate Sessions collection.
        // Since CloudFusion relies heavily on Firebase Auth for JWTs, we will simulate
        // active sessions for the UI demonstration, placing the current request as active.

        // We can fetch user metadata from Firebase to show last sign in
        const firebaseUser = await admin.auth().getUser(user.firebaseUid);

        const sessions = [
            {
                id: "current-session",
                device: "Current Device",
                os: "Windows", // Simulated
                browser: "Chrome", // Simulated
                ip: req.ip || req.connection.remoteAddress || "Unknown",
                lastActive: new Date().toISOString()
            }
        ];

        res.json({
            twoFactorEnabled: user.twoFactorEnabled || false,
            sessions: sessions
        });
    } catch (err) {
        console.error("Error fetching security status:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Setup 2FA (Generate Secret and QR Code)
// @route   POST /api/security/2fa/setup
// @access  Private
const setup2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is already enabled" });
        }

        // Generate a secure secret
        const secret = speakeasy.generateSecret({ name: "CloudFusion (" + user.email + ")" });
        console.log("Generated Secret:", secret.base32);

        // Create a URI for Google Authenticator/Authy
        const otpauth = secret.otpauth_url;
        console.log("Generated OTPAuth URI:", otpauth);

        // Generate QR Code data URL
        const qrCodeUrl = await qrcode.toDataURL(otpauth);
        console.log("Generated QR Code Data URL:", qrCodeUrl ? "Success (data attached)" : "Failed");

        res.json({
            secret: secret.base32,
            qrCodeUrl: qrCodeUrl
        });
    } catch (err) {
        console.error("Error setting up 2FA:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Verify 2FA Token and Enable
// @route   POST /api/security/2fa/verify
// @access  Private
const verify2FA = async (req, res) => {
    try {
        const { token, secret } = req.body;

        if (!token || !secret) {
            return res.status(400).json({ message: "Token and secret are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Verify the token against the secret
        const isValid = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (!isValid) {
            return res.status(400).json({ message: "Invalid 2FA code" });
        }

        // Save the secret and mark 2FA as enabled
        user.twoFactorEnabled = true;
        user.twoFactorSecret = secret;
        await user.save();

        res.json({ message: "2FA enabled successfully" });
    } catch (err) {
        console.error("Error verifying 2FA:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Disable 2FA
// @route   POST /api/security/2fa/disable
// @access  Private
const disable2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        await user.save();

        res.json({ message: "2FA disabled successfully" });
    } catch (err) {
        console.error("Error disabling 2FA:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Revoke all other sessions (using Firebase Auth)
// @route   POST /api/security/sessions/revoke
// @access  Private
const revokeSessions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Revoke all Firebase refresh tokens for the user
        // Note: The current session's ID token may still be valid for up to an hour,
        // but they will not be able to mint new tokens.
        await admin.auth().revokeRefreshTokens(user.firebaseUid);

        res.json({ message: "All other sessions have been revoked." });
    } catch (err) {
        console.error("Error revoking sessions:", err);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getSecurityStatus,
    setup2FA,
    verify2FA,
    disable2FA,
    revokeSessions
};
