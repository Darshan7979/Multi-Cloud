const admin = require("firebase-admin");
const User = require("../models/User");
const Activity = require("../models/Activity");

const syncUser = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Missing Firebase ID token" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, email_verified } = decodedToken;

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        emailVerified: email_verified || false,
      });

      await Activity.create({
        userId: user._id,
        action: "register",
        detail: `User registered: ${user.email}`,
      });
    } else {
      user.lastLoginAt = new Date();
      if (name && name !== user.name) {
        user.name = name;
      }
      await user.save();

      await Activity.create({
        userId: user._id,
        action: "login",
        detail: "User logged in",
      });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        firebaseUid: user.firebaseUid,
      },
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

module.exports = { syncUser };
