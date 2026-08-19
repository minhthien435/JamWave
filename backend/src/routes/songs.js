const express = require("express");
const router = express.Router();
const songController = require("../controllers/songController");
const listenController = require("../controllers/listenController");
const authMiddleware = require("../middlewares/auth");

router.get("/", songController.getSongs);
router.get("/facets", songController.getFacets);
router.get("/mood", songController.getMoodSongs);
router.get("/random", songController.getRandomSongs);
router.get("/:id/download", songController.downloadSong);
router.get("/:id/radio", songController.getSongRadio);
router.post("/:id/listen", authMiddleware, listenController.recordListen);

module.exports = router;
