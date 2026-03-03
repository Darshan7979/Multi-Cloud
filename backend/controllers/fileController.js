const { initFirebase } = require("../config/firebase");
const { initCloudinary } = require("../config/cloudinary");
const File = require("../models/File");
const Activity = require("../models/Activity");
const { v4: uuidv4 } = require("uuid");

const allowedClouds = ["firebase", "cloudinary"];
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
    } else {
      uploadResult = await uploadToCloudinary({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
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
    } else {
      const cloudinary = initCloudinary();
      await cloudinary.uploader.destroy(fileDoc.publicId, { resource_type: "raw" });
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
