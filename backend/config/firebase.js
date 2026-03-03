const admin = require("firebase-admin");
const path = require("path");

let bucket;

const initFirebase = () => {
  if (admin.apps.length) {
    bucket = admin.storage().bucket();
    return bucket;
  }

  let serviceAccount;
  const jsonPath = path.join(__dirname, "..", "firebase-service-account.json");

  try {
    serviceAccount = require(jsonPath);
    console.log("✓ Firebase service account loaded from JSON");
  } catch (err) {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64) {
      throw new Error("Firebase credentials missing");
    }
    serviceAccount = JSON.parse(
      Buffer.from(base64, "base64").toString("utf8")
    );
    console.log("✓ Firebase service account loaded from ENV");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  bucket = admin.storage().bucket();
  return bucket;
};

module.exports = { initFirebase };