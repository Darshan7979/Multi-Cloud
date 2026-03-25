const express = require("express");
const { registerUser, syncUser, saveFcmToken, sendTestEmail } = require("../controllers/authController");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", registerUser);
router.post("/sync", syncUser);
router.post("/fcm-token", auth, saveFcmToken);
router.post("/test-email", auth, sendTestEmail);

module.exports = router;