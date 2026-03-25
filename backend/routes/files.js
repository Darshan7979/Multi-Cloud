const express = require("express");
const multer = require("multer");
const { auth } = require("../middleware/auth");
const {
    listFiles,
    uploadFile,
    deleteFile,
    restoreFile,
    permanentDeleteFile,
    renameFile,
} = require("../controllers/fileController");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
});

router.get("/", auth, listFiles);
router.post("/upload", auth, upload.single("file"), uploadFile);
router.delete("/:id", auth, deleteFile);
router.post("/:id/restore", auth, restoreFile);
router.delete("/:id/permanent", auth, permanentDeleteFile);
router.put("/:id/rename", auth, renameFile);

module.exports = router;