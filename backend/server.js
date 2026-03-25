require("dotenv").config();
const express = require("express");
const cors = require("cors");

const emailUser = String(process.env.EMAIL_USER || "").trim();
if (emailUser) {
    console.log(`[config] EMAIL_USER loaded: ${emailUser}`);
} else {
    console.warn("[config] EMAIL_USER is not set. Email sending will fail until configured.");
}

const connectDb = require("./config/db");
const { initFirebase } = require("./config/firebase");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const analyticsRoutes = require("./routes/analytics");
const paymentRoutes = require("./routes/payments");
const securityRoutes = require("./routes/security");

const { errorHandler } = require("./middleware/errorHandler");

connectDb();
initFirebase();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/security", securityRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`🚀 CloudFusion server running on port ${PORT}`);
});