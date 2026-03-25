const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { sendEmail } = require("../utils/sendEmail");
const { buildWelcomeEmailTemplate, buildLoginNotificationEmailTemplate } = require("../utils/emailTemplates");

const sendNotificationToUserEmail = async({ toEmail, subject, text, html }) => {
    try {
        const emailResult = await sendEmail({
            to: toEmail,
            subject,
            text,
            html,
        });
        return { sent: true, messageId: emailResult.messageId };
    } catch (error) {
        const message = String(error.message || "");
        return {
            sent: false,
            reason: message.includes("not configured") ? "not-configured" : "send-failed",
            detail: error.message,
        };
    }
};

const registerUser = async(req, res, next) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "Name and email are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const trimmedName = String(name).trim();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: "User with this email already exists" });
        }

        // A synthetic local UID keeps compatibility with the existing schema.
        const user = await User.create({
            firebaseUid: `local-${uuidv4()}`,
            name: trimmedName,
            email: normalizedEmail,
            emailVerified: false,
            lastLoginAt: new Date(),
        });

        await Activity.create({
            userId: user._id,
            action: "register",
            detail: `User registered: ${user.email}`,
        });

        const { subject, text, html } = buildWelcomeEmailTemplate({
            name: user.name,
            appUrl: process.env.FRONTEND_URL || "http://localhost:5500",
        });

        const emailStatus = await sendNotificationToUserEmail({
            toEmail: user.email,
            subject,
            text,
            html,
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            emailStatus,
        });
    } catch (err) {
        return next(err);
    }
};

const syncUser = async(req, res, next) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: "Missing Firebase ID token" });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email, name, email_verified } = decodedToken;

        const loginEmail = email.toLowerCase();
        let user = await User.findOne({ firebaseUid: uid });
        let emailStatus = { sent: false, reason: "not-attempted" };

        if (!user) {
            user = await User.create({
                firebaseUid: uid,
                name: name || email.split("@")[0],
                email: loginEmail,
                emailVerified: email_verified || false,
            });

            await Activity.create({
                userId: user._id,
                action: "register",
                detail: `User registered: ${user.email}`,
            });

            const welcomeTemplate = buildWelcomeEmailTemplate({
                name: user.name,
                appUrl: process.env.FRONTEND_URL || "http://localhost:5500",
            });

            emailStatus = await sendNotificationToUserEmail({
                toEmail: user.email,
                subject: welcomeTemplate.subject,
                text: welcomeTemplate.text,
                html: welcomeTemplate.html,
            });
        } else {
            user.lastLoginAt = new Date();
            if (name && name !== user.name) {
                user.name = name;
            }
            if (user.email !== loginEmail) {
                user.email = loginEmail;
            }
            await user.save();

            await Activity.create({
                userId: user._id,
                action: "login",
                detail: "User logged in",
            });

            const loginTemplate = buildLoginNotificationEmailTemplate({
                name: user.name,
                appUrl: process.env.FRONTEND_URL || "http://localhost:5500",
            });

            emailStatus = await sendNotificationToUserEmail({
                toEmail: user.email,
                subject: loginTemplate.subject,
                text: loginTemplate.text,
                html: loginTemplate.html,
            });
        }

        return res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                firebaseUid: user.firebaseUid,
            },
            emailStatus,
        });
    } catch (err) {
        if (err.code === "auth/id-token-expired") {
            return res.status(401).json({ message: "Token expired" });
        }
        if (err.code === "auth/argument-error") {
            return res.status(401).json({ message: "Invalid token" });
        }
        return next(err);
    }
};

const saveFcmToken = async(req, res, next) => {
    try {
        const { token } = req.body;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ message: "FCM token required" });
        }
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { fcmTokens: token.slice(0, 500) },
        });
        return res.json({ ok: true });
    } catch (err) {
        return next(err);
    }
};

const sendTestEmail = async(req, res, next) => {
    try {
        const targetEmail = String((req.user && req.user.email) || "").trim().toLowerCase();

        if (!targetEmail) {
            return res.status(400).json({ message: "Logged-in user email is required" });
        }

        const subject = "CloudFusion email test";
        const text = "This is a test email from CloudFusion. SMTP setup is working.";
        const html = `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;"><h2 style="color:#111827;margin-bottom:8px;">Email test successful</h2><p style="font-size:15px;line-height:1.6;color:#374151;">Your SMTP integration is working correctly.</p><p style="font-size:14px;line-height:1.6;color:#6b7280;">Sent at: ${new Date().toLocaleString()}</p></div>`;

        try {
            const emailResult = await sendEmail({
                to: targetEmail,
                subject,
                text,
                html,
            });

            return res.json({
                message: "Test email sent",
                emailStatus: {
                    sent: true,
                    to: targetEmail,
                    messageId: emailResult.messageId,
                },
            });
        } catch (error) {
            const message = String(error.message || "");
            return res.status(502).json({
                message: "Test email failed",
                emailStatus: {
                    sent: false,
                    to: targetEmail,
                    reason: message.includes("not configured") ? "not-configured" : "send-failed",
                    detail: error.message,
                },
            });
        }
    } catch (err) {
        return next(err);
    }
};

module.exports = { registerUser, syncUser, saveFcmToken, sendTestEmail };