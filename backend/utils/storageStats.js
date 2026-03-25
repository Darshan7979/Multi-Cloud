const File = require("../models/File");

const getUserStats = async(userId) => {
    const aggregate = await File.aggregate([
        { $match: { userId, isDeleted: { $ne: true } } },
        {
            $group: {
                _id: "$cloudService",
                totalBytes: { $sum: "$sizeBytes" },
                count: { $sum: 1 },
            },
        },
    ]);

    const fileCount = aggregate.reduce((sum, item) => sum + item.count, 0);
    const storageUsedBytes = aggregate.reduce((sum, item) => sum + item.totalBytes, 0);
    const byCloud = aggregate.map((item) => ({
        cloudService: item._id,
        count: item.count,
        totalBytes: item.totalBytes,
    }));

    return { fileCount, storageUsedBytes, byCloud };
};

module.exports = { getUserStats };