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
router.post("/users/register", register);
router.post("/users/login", login);
router.get("/users/authenticate", restrict, auth);

// Google OAuth
router.get(
  "/users/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/users/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/users/google",
    session: false,
  }),
  googleOauth2
);

module.exports = router;
