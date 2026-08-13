const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authMiddleware = require("../middlewares/auth");

router.get("/", authMiddleware, profileController.getProfile);

module.exports = router;
