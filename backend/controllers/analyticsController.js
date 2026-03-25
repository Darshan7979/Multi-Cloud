const File = require("../models/File");
const User = require("../models/User");
const { getUserStats } = require("../utils/storageStats");
const { calculateSecurityScore } = require("../utils/securityScore");

const getSummary = async(req, res, next) => {
    try {
        const stats = await getUserStats(req.user.id);
        const privateCount = await File.countDocuments({
            userId: req.user.id,
            privacy: "private",
            isDeleted: { $ne: true },
        });

        const user = await User.findById(req.user.id);

        const cloudCount = stats.byCloud.length;
        const securityScore = calculateSecurityScore({
            fileCount: stats.fileCount,
            privateCount,
            cloudCount,
            emailVerified: user ? user.emailVerified : false,
        });

        const storageUsedMB = Math.round((stats.storageUsedBytes / (1024 * 1024)) * 100) / 100;
        const storageQuotaMB = 2048; // Default 2GB quota
        const storageUsedPercent = Math.min(100, (storageUsedMB / storageQuotaMB) * 100);

        // Real bandwidth and requests from User model
        const totalBandwidthBytes = user ? user.totalBandwidth || 0 : 0;
        const totalBandwidthGB = Math.round((totalBandwidthBytes / (1024 * 1024 * 1024)) * 10000) / 10000;
        const totalRequests = user ? user.totalRequests || 0 : 0;

        return res.json({
            fileCount: stats.fileCount,
            storageUsedBytes: stats.storageUsedBytes,
            storageUsedMB,
            storageUsedPercent,
            byCloud: stats.byCloud,
            privateCount,
            securityScore,
            totalBandwidthGB,
            totalRequests,
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = { getSummary };