const { S3Client } = require("@aws-sdk/client-s3");

let s3Client;

const initAWS = () => {
    if (s3Client) return s3Client;

    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error("AWS credentials are required");
    }

    s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    console.log('✓ AWS S3 client initialized');
    return s3Client;
};

module.exports = { initAWS };
