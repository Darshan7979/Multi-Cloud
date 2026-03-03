const admin = require("firebase-admin");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const idToken = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!idToken) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const user = await User.findOne({
      firebaseUid: decoded.uid,
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { auth };