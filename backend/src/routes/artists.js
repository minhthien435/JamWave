const express = require("express");
const router = express.Router();
const artistController = require("../controllers/artistController");
const authMiddleware = require("../middlewares/auth");

// Lưu ý: /followed phải đứng trước /:name để không bị hiểu nhầm
router.get("/followed", authMiddleware, artistController.getFollowedArtists);
router.get("/", artistController.getArtists);
router.get("/:name", artistController.getArtistSongs);
router.post("/:name/follow", authMiddleware, artistController.followArtist);
router.delete("/:name/follow", authMiddleware, artistController.unfollowArtist);

module.exports = router;
