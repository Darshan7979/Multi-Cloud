const express = require("express");
const { auth } = require("../middleware/auth");
const { getSummary } = require("../controllers/analyticsController");

const router = express.Router();

router.get("/summary", auth, getSummary);

module.exports = router;
