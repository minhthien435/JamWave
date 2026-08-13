const express = require("express");
const router = express.Router();
const songController = require("../controllers/songController");
const listenController = require("../controllers/listenController");
const authMiddleware = require("../middlewares/auth");

router.get("/", songController.getSongs);
router.get("/random", songController.getRandomSongs);
router.post("/:id/listen", authMiddleware, listenController.recordListen);

module.exports = router;
