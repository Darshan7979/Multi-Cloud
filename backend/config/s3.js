const { S3Client } = require("@aws-sdk/client-s3");

let s3Client = null;

const initS3 = () => {
    if (s3Client) return s3Client;

    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error("AWS S3 credentials missing in environment variables ❌");
    }

    s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    return s3Client;
};

module.exports = { initS3 };