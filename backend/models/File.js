const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    storageName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    cloudService: { type: String, required: true, enum: ["firebase", "cloudinary", "supabase"] },
    privacy: { type: String, required: true, enum: ["public", "private"] },
    url: { type: String, required: true },
    publicId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", FileSchema);
