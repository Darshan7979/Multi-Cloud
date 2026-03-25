const { initFirebase } = require("../config/firebase");
const { initCloudinary } = require("../config/cloudinary");
const { initS3 } = require("../config/s3");
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { initSupabase } = require("../config/supabase");
const File = require("../models/File");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { v4: uuidv4 } = require("uuid");
const { sendUploadSuccessEmail } = require("../utils/emailService");
const { scanUploadForMalware } = require("../utils/malwareScanner");

const allowedClouds = ["firebase", "cloudinary", "aws", "supabase"];
const allowedPrivacy = ["public", "private"];

const isFirebaseBillingDisabledError = (uploadErr) => {
    const msg = uploadErr.message || "";
    return (
        (uploadErr.code === 403 || (uploadErr.errors && uploadErr.errors[0] && uploadErr.errors[0].reason === "accountDisabled")) ||
        msg.includes("billing account") ||
        msg.includes("accountDisabled")
    );
};

const uploadByProvider = async({ cloudService, buffer, originalName, mimeType, userId, privacy }) => {
    if (cloudService === "firebase") {
        return uploadToFirebase({ buffer, originalName, mimeType, userId, privacy });
    }
    if (cloudService === "cloudinary") {
        return uploadToCloudinary({ buffer, originalName, userId, privacy });
    }
    if (cloudService === "aws") {
        return uploadToS3({ buffer, originalName, mimeType, userId, privacy });
    }
    return uploadToSupabase({ buffer, originalName, mimeType, userId, privacy });
};

const uploadToFirebase = async({ buffer, originalName, mimeType, userId, privacy }) => {
    const bucket = initFirebase();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageName = `${userId}/${uuidv4()}-${safeName}`;
    const file = bucket.file(storageName);

    await file.save(buffer, { metadata: { contentType: mimeType } });

    if (privacy === "public") {
        await file.makePublic();
        const url = `https://storage.googleapis.com/${bucket.name}/${storageName}`;
        return { url, storageName, publicId: null };
    }

    const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    return { url: signedUrl, storageName, publicId: null };
};

const uploadToCloudinary = ({ buffer, originalName, userId }) =>
    new Promise((resolve, reject) => {
        const cloudinary = initCloudinary();
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const publicId = `${uuidv4()}-${safeName}`;

        const stream = cloudinary.uploader.upload_stream({
                folder: `multicloud/${userId}`,
                public_id: publicId,
                resource_type: "raw",
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                return resolve({
                    url: result.secure_url,
                    storageName: result.public_id,
                    publicId: result.public_id,
                });
            }
        );

        stream.end(buffer);
    });

const uploadToS3 = async({ buffer, originalName, mimeType, userId, privacy }) => {
    const s3Client = initS3();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageName = `${userId}/${uuidv4()}-${safeName}`;
    const bucket = process.env.AWS_S3_BUCKET;

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: storageName,
        Body: buffer,
        ContentType: mimeType,
    });

    await s3Client.send(command);

    let url;
    if (privacy === "public") {
        url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${storageName}`;
    } else {
        const getCommand = new GetObjectCommand({ Bucket: bucket, Key: storageName });
        url = await getSignedUrl(s3Client, getCommand, { expiresIn: 24 * 60 * 60 });
    }

    return { url, storageName, publicId: null };
};

const uploadToSupabase = async({ buffer, originalName, mimeType, userId, privacy }) => {
    const supabase = initSupabase();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageName = `${userId}/${uuidv4()}-${safeName}`;
    const bucketName = "multicloud";

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError && buckets) {
        const bucketExists = buckets.some(b => b.name === bucketName);
        if (!bucketExists) {
            await supabase.storage.createBucket(bucketName, { public: true });
        }
    }

    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storageName, buffer, { contentType: mimeType, upsert: false });

    if (error) throw error;

    if (privacy === "public") {
        const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(storageName);
        return { url: publicData.publicUrl, storageName, publicId: null };
    }

    const { data: signedData, error: signedError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storageName, 24 * 60 * 60);

    if (signedError) throw signedError;

    return { url: signedData.signedUrl, storageName, publicId: null };
};

const listFiles = async(req, res, next) => {
    try {
        const { search, cloud, bin } = req.query;
        const showRecycleBin = String(bin || "").toLowerCase() === "true";
        const filters = { userId: req.user.id };

        if (showRecycleBin) {
            filters.isDeleted = true;
        } else {
            filters.isDeleted = { $ne: true };
        }

        if (cloud && allowedClouds.includes(cloud)) {
            filters.cloudService = cloud;
        }

        if (search) {
            filters.originalName = { $regex: search, $options: "i" };
        }

        const files = await File.find(filters).sort({ createdAt: -1 });

        return res.json({ files, recycleBin: showRecycleBin });
    } catch (err) {
        return next(err);
    }
};

const uploadFile = async(req, res, next) => {
    try {
        const { cloudService, privacy } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        if (!allowedClouds.includes(cloudService)) {
            return res.status(400).json({ message: "Unsupported cloud service" });
        }

        if (!allowedPrivacy.includes(privacy)) {
            return res.status(400).json({ message: "Unsupported privacy option" });
        }

        const malwareScan = await scanUploadForMalware({
            buffer: req.file.buffer,
            originalName: req.file.originalname,
        });

        if (malwareScan.status === "infected") {
            await Activity.create({
                userId: req.user.id,
                action: "malware-blocked",
                detail: `Upload blocked for ${req.file.originalname}: ${malwareScan.signature || "malware detected"}`,
            });

            await User.findByIdAndUpdate(req.user.id, {
                $inc: { totalRequests: 1 }
            });

            return res.status(422).json({
                message: "Upload blocked: malware detected in file.",
                code: "MALWARE_DETECTED",
                malwareScan,
            });
        }

        if (malwareScan.status === "scanner-unavailable" && malwareScan.blocked) {
            await Activity.create({
                userId: req.user.id,
                action: "malware-scan-unavailable",
                detail: `Upload blocked for ${req.file.originalname}: malware scanner unavailable`,
            });

            await User.findByIdAndUpdate(req.user.id, {
                $inc: { totalRequests: 1 }
            });

            return res.status(503).json({
                message: "Upload blocked: malware scanner is unavailable.",
                code: "MALWARE_SCAN_UNAVAILABLE",
                malwareScan,
            });
        }

        let uploadResult;
        let effectiveCloudService = cloudService;
        let fallback = null;

        try {
            uploadResult = await uploadByProvider({
                cloudService,
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                userId: req.user.id,
                privacy,
            });
        } catch (uploadErr) {
            if (cloudService === "firebase" && isFirebaseBillingDisabledError(uploadErr)) {
                const fallbackProviders = ["cloudinary", "aws", "supabase"];
                const fallbackErrors = [];

                for (const provider of fallbackProviders) {
                    try {
                        uploadResult = await uploadByProvider({
                            cloudService: provider,
                            buffer: req.file.buffer,
                            originalName: req.file.originalname,
                            mimeType: req.file.mimetype,
                            userId: req.user.id,
                            privacy,
                        });
                        effectiveCloudService = provider;
                        fallback = {
                            requested: "firebase",
                            used: provider,
                            reason: "firebase-billing-disabled",
                        };
                        break;
                    } catch (fallbackErr) {
                        fallbackErrors.push(`${provider}: ${fallbackErr.message || "upload failed"}`);
                    }
                }

                if (!uploadResult) {
                    return res.status(503).json({
                        message: "Firebase Storage is unavailable (billing disabled) and fallback providers also failed. Please check provider credentials.",
                        code: "FIREBASE_BILLING_DISABLED",
                        fallbackAttempts: fallbackErrors,
                    });
                }
            } else if (isFirebaseBillingDisabledError(uploadErr)) {
                return res.status(503).json({
                    message: "Firebase Storage is unavailable: your Google Cloud billing account is closed or disabled. Please use Cloudinary, AWS S3, or Supabase instead.",
                    code: "FIREBASE_BILLING_DISABLED",
                });
            } else {
                throw uploadErr;
            }
        }

        const fileDoc = await File.create({
            userId: req.user.id,
            originalName: req.file.originalname,
            storageName: uploadResult.storageName,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            cloudService: effectiveCloudService,
            privacy,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
        });

        await Activity.create({
            userId: req.user.id,
            action: "upload",
            detail: `${effectiveCloudService} upload: ${fileDoc.originalName}`,
        });

        // Track bandwidth and requests
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { totalBandwidth: req.file.size, totalRequests: 1 }
        });

        // Send upload success email and include result in response
        let emailStatus = { sent: false, reason: "not-attempted" };
        try {
            emailStatus = await sendUploadSuccessEmail({
                toEmail: req.user.email,
                uploadDetails: {
                    cloudService: fileDoc.cloudService,
                    originalName: fileDoc.originalName,
                    mimeType: fileDoc.mimeType,
                    sizeBytes: fileDoc.sizeBytes,
                    privacy: fileDoc.privacy,
                    uploadTime: fileDoc.createdAt,
                    fileUrl: fileDoc.url,
                },
            });
        } catch (e) {
            emailStatus = { sent: false, reason: "send-error" };
        }

        return res.status(201).json({ file: fileDoc, emailStatus, fallback, malwareScan });
    } catch (err) {
        return next(err);
    }
};

const deleteFile = async(req, res, next) => {
    try {
        const fileDoc = await File.findOne({ _id: req.params.id, userId: req.user.id, isDeleted: { $ne: true } });

        if (!fileDoc) {
            return res.status(404).json({ message: "File not found" });
        }

        fileDoc.isDeleted = true;
        fileDoc.deletedAt = new Date();
        await fileDoc.save();

        await Activity.create({
            userId: req.user.id,
            action: "trash",
            detail: `${fileDoc.cloudService} moved to recycle bin: ${fileDoc.originalName}`,
        });

        // Track requests
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { totalRequests: 1 }
        });

        return res.json({ message: "File moved to recycle bin", file: fileDoc });
    } catch (err) {
        return next(err);
    }
};

const restoreFile = async(req, res, next) => {
    try {
        const fileDoc = await File.findOne({ _id: req.params.id, userId: req.user.id, isDeleted: true });

        if (!fileDoc) {
            return res.status(404).json({ message: "File not found in recycle bin" });
        }

        fileDoc.isDeleted = false;
        fileDoc.deletedAt = null;
        await fileDoc.save();

        await Activity.create({
            userId: req.user.id,
            action: "restore",
            detail: `${fileDoc.cloudService} restored from recycle bin: ${fileDoc.originalName}`,
        });

        await User.findByIdAndUpdate(req.user.id, {
            $inc: { totalRequests: 1 }
        });

        return res.json({ message: "File restored", file: fileDoc });
    } catch (err) {
        return next(err);
    }
};

const permanentDeleteFile = async(req, res, next) => {
    try {
        const fileDoc = await File.findOne({ _id: req.params.id, userId: req.user.id, isDeleted: true });

        if (!fileDoc) {
            return res.status(404).json({ message: "File not found in recycle bin" });
        }

        if (fileDoc.cloudService === "firebase") {
            const bucket = initFirebase();
            await bucket.file(fileDoc.storageName).delete();
        } else if (fileDoc.cloudService === "cloudinary") {
            const cloudinary = initCloudinary();
            await cloudinary.uploader.destroy(fileDoc.publicId, { resource_type: "raw" });
        } else if (fileDoc.cloudService === "aws") {
            const s3Client = initS3();
            const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: fileDoc.storageName,
            });
            await s3Client.send(command);
        } else if (fileDoc.cloudService === "supabase") {
            const supabase = initSupabase();
            const { error } = await supabase.storage.from("multicloud").remove([fileDoc.storageName]);
            if (error) throw error;
        }

        await File.deleteOne({ _id: fileDoc._id });

        await Activity.create({
            userId: req.user.id,
            action: "delete-permanent",
            detail: `${fileDoc.cloudService} permanently deleted: ${fileDoc.originalName}`,
        });

        await User.findByIdAndUpdate(req.user.id, {
            $inc: { totalRequests: 1 }
        });

        return res.json({ message: "File permanently deleted" });
    } catch (err) {
        return next(err);
    }
};

const renameFile = async(req, res, next) => {
    try {
        const { newName } = req.body;

        if (!newName || newName.trim() === '') {
            return res.status(400).json({ message: "New name is required" });
        }

        const fileDoc = await File.findOne({ _id: req.params.id, userId: req.user.id, isDeleted: { $ne: true } });

        if (!fileDoc) {
            return res.status(404).json({ message: "File not found" });
        }

        const oldName = fileDoc.originalName;
        fileDoc.originalName = newName.trim();
        await fileDoc.save();

        await Activity.create({
            userId: req.user.id,
            action: "rename",
            detail: `Renamed file from '${oldName}' to '${fileDoc.originalName}'`,
        });

        return res.json({ message: "File renamed successfully", file: fileDoc });
    } catch (err) {
        return next(err);
    }
};

module.exports = { listFiles, uploadFile, deleteFile, restoreFile, permanentDeleteFile, renameFile };