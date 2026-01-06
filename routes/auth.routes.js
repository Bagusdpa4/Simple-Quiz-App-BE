const router = require("express").Router();
const {
  register,
  login,
  auth,
  googleOauth2,
} = require("../controllers/auth.controllers");
const { restrict } = require("../middlewares/auth.middlewares");
const passport = require("../libs/passport");

// API Auth Users
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", restrict, auth);

// Google OAuth
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google",
    session: false,
  }),
  googleOauth2
);

module.exports = router;
