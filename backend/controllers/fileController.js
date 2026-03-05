const { initFirebase } = require("../config/firebase");
const { initCloudinary } = require("../config/cloudinary");
const { initS3 } = require("../config/s3");
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const File = require("../models/File");
const Activity = require("../models/Activity");
const { v4: uuidv4 } = require("uuid");

const allowedClouds = ["firebase", "cloudinary", "aws"];
const allowedPrivacy = ["public", "private"];

const uploadToFirebase = async ({ buffer, originalName, mimeType, userId, privacy }) => {
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

    const stream = cloudinary.uploader.upload_stream(
      {
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

const uploadToS3 = async ({ buffer, originalName, mimeType, userId, privacy }) => {
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
    // Generate a secure signed URL valid for 24 hours
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: storageName });
    url = await getSignedUrl(s3Client, getCommand, { expiresIn: 24 * 60 * 60 });
  }

  return { url, storageName, publicId: null };
};

const listFiles = async (req, res, next) => {
  try {
    const { search, cloud } = req.query;
    const filters = { userId: req.user.id };

    if (cloud && allowedClouds.includes(cloud)) {
      filters.cloudService = cloud;
    }

    if (search) {
      filters.originalName = { $regex: search, $options: "i" };
    }

    const files = await File.find(filters).sort({ createdAt: -1 });

    return res.json({ files });
  } catch (err) {
    return next(err);
  }
};

const uploadFile = async (req, res, next) => {
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

    let uploadResult;

    if (cloudService === "firebase") {
      uploadResult = await uploadToFirebase({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: req.user.id,
        privacy,
      });
    } else if (cloudService === "cloudinary") {
      uploadResult = await uploadToCloudinary({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        userId: req.user.id,
        privacy,
      });
    } else if (cloudService === "aws") {
      uploadResult = await uploadToS3({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: req.user.id,
        privacy,
      });
    }

    const fileDoc = await File.create({
      userId: req.user.id,
      originalName: req.file.originalname,
      storageName: uploadResult.storageName,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      cloudService,
      privacy,
      url: uploadResult.url,
      publicId: uploadResult.publicId,
    });

    await Activity.create({
      userId: req.user.id,
      action: "upload",
      detail: `${cloudService} upload: ${fileDoc.originalName}`,
    });

    return res.status(201).json({ file: fileDoc });
  } catch (err) {
    return next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const fileDoc = await File.findOne({ _id: req.params.id, userId: req.user.id });

    if (!fileDoc) {
      return res.status(404).json({ message: "File not found" });
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
    }

    await File.deleteOne({ _id: fileDoc._id });

    await Activity.create({
      userId: req.user.id,
      action: "delete",
      detail: `${fileDoc.cloudService} delete: ${fileDoc.originalName}`,
    });

    return res.json({ message: "File deleted" });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listFiles, uploadFile, deleteFile };
