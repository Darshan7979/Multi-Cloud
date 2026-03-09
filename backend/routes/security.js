const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    getSecurityStatus,
    setup2FA,
    verify2FA,
    disable2FA,
    revokeSessions
} = require("../controllers/securityController");

// TEST ROUTE
router.get("/test2fa", async (req, res) => {
    const speakeasy = require("speakeasy");
    const qrcode = require("qrcode");
    const secret = speakeasy.generateSecret({ name: "CloudFusion (Test)" });
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCodeUrl });
});

// Protect all security routes
router.use(auth);

// Get security dashboard status
router.get("/status", getSecurityStatus);

// 2FA Routes
router.post("/2fa/setup", setup2FA);
router.post("/2fa/verify", verify2FA);
router.post("/2fa/disable", disable2FA);

// Session Management
router.post("/sessions/revoke", revokeSessions);

module.exports = router;
