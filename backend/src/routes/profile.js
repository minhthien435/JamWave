const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authMiddleware = require("../middlewares/auth");
const { uploadAvatar, uploadSingle } = require("../middlewares/upload");

router.get("/", authMiddleware, profileController.getProfile);
router.patch("/", authMiddleware, profileController.updateProfile);
router.post("/avatar", authMiddleware, uploadSingle(uploadAvatar, "avatar"), profileController.uploadAvatar);

module.exports = router;