const express = require("express");
const router = express.Router();
const lyricController = require("../controllers/lyricController");

// Lời bài hát (công khai, có cache phía backend)
router.get("/:songId", lyricController.getLyrics);

module.exports = router;
