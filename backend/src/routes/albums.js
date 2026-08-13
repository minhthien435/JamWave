const express = require("express");
const router = express.Router();
const albumController = require("../controllers/albumController");

router.get("/", albumController.getAlbums);
router.get("/:id", albumController.getAlbumById);

module.exports = router;
