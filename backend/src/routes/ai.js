const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { aiLimiter } = require("../middlewares/rateLimit");

router.post("/chat", aiLimiter, aiController.chat);

module.exports = router;
