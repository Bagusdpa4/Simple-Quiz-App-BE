const router = require("express").Router();
const {
  getDetail,
  updateProfile,
  updatePass,
} = require("../controllers/profile.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Profile Users
router.get("/profiles/detail", restrict, getDetail);
router.put("/profiles/update", restrict, updateProfile);
router.put("/profiles/update-password", restrict, updatePass);

module.exports = router;
