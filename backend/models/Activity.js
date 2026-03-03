const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, required: true },
  detail: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Activity", ActivitySchema);
