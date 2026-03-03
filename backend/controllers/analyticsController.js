const File = require("../models/File");
const { getUserStats } = require("../utils/storageStats");
const { calculateSecurityScore } = require("../utils/securityScore");

const getSummary = async (req, res, next) => {
  try {
    const stats = await getUserStats(req.user.id);
    const privateCount = await File.countDocuments({
      userId: req.user.id,
      privacy: "private",
    });

    const cloudCount = stats.byCloud.length;
    const securityScore = calculateSecurityScore({
      fileCount: stats.fileCount,
      privateCount,
      cloudCount,
    });

    const storageUsedMB = Math.round((stats.storageUsedBytes / (1024 * 1024)) * 100) / 100;

    return res.json({
      fileCount: stats.fileCount,
      storageUsedBytes: stats.storageUsedBytes,
      storageUsedMB,
      byCloud: stats.byCloud,
      privateCount,
      securityScore,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getSummary };
