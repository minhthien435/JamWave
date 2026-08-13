const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const requireAdmin = require("../middlewares/requireAdmin");

// Tất cả route admin đều yêu cầu quyền ADMIN
router.use(requireAdmin);

router.get("/stats", adminController.getStats);
router.get("/users", adminController.getUsers);
router.patch("/users/:id", adminController.updateUserRole);
router.delete("/users/:id", adminController.deleteUser);
router.get("/songs", adminController.getSongs);
router.delete("/songs/:id", adminController.deleteSong);

module.exports = router;
