const prisma = require("../libs/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { formatDateOnly } = require("../utils/formattedDate");
const { FRONT_END_URL } = process.env;

module.exports = {
  register: async (req, res, next) => {
    try {
      const { username, email, password, confirmPassword } = req.body;
      const emailValidator = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Check for existing user with the same emailh
      const exist = await prisma.user.findUnique({
        where: { email },
      });
      // Validate required fields
      if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({
          status: false,
          message: "Input must be required",
          data: null,
        });
      } else if (exist) {
        return res.status(401).json({
          status: false,
          message: "Email already used!",
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          status: false,
          message: "Password and confirm password doesn't match!",
          data: null,
        });
      }

      // Validate email format
      if (!emailValidator.test(email)) {
        return res.status(400).json({
          status: false,
          message: "Invalid email format.",
          data: null,
        });
      }

      // Encrypt user password
      const encryptedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          fullname: username,
          email,
          password: encryptedPassword,
          profile: {
            create: {
              city: "", // Default value
            },
          },
        },
        include: { profile: true },
      });
      delete user.password;

      res.status(201).json({
        status: true,
        message: "User Created Successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: false,
          message: "Input must be required",
          data: null,
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });

      // Return error if user not found
      if (!user) {
        return res.status(400).json({
          status: false,
          message: "invalid email or password",
          data: null,
        });
      }

      // Validate only login google
      if (!user.password && user.google_id) {
        return res.status(401).json({
          status: false,
          message: "Authentication failed. Please use Google OAuth to log in",
          data: null,
        });
      }

      let isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: "invalid email or password",
          data: null,
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );

      delete user.password;

      return res.status(201).json({
        status: true,
        message: "success",
        data: { ...user, token },
      });
    } catch (error) {
      next(error);
    }
  },
  auth: async (req, res, next) => {
    try {
      const ProfileUser = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
        include: {
          profile: {
            select: {
              id: true,
              avatar_url: true,
              birth_date: true,
              city: true,
            },
          },
        },
      });

      if (!ProfileUser) {
        return res.status(404).json({
          status: false,
          message: "User not found",
          data: null,
        });
      }

      delete ProfileUser.password;

      if (ProfileUser.profile?.birth_date) {
        ProfileUser.profile.birth_date = formatDateOnly(
          ProfileUser.profile.birth_date
        );
      }

      res.status(200).json({
        status: true,
        message: "User authenticated successfully",
        data: ProfileUser,
      });
    } catch (error) {
      next(error);
    }
  },
  googleOauth2: async (req, res, next) => {
    try {
      const user = req.user;
      let token = jwt.sign(
        { id: req.user.id, password: null },
        process.env.JWT_SECRET_KEY
      );

      // Cek apakah pengguna sudah ada di database
      const userExist = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!userExist) {
        const newUser = await prisma.user.create({
          data: {
            id: req.user.id,
            email: user.email,
            fullname: user.fullname,
            google_id: user.id,
            profile: {
              create: {
                city: "",
                birth_date: "",
                avatar_url: user.picture || null,
              },
            },
          },
        });
      }

      const redirectUrl = `${FRONT_END_URL}/?token=${token}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  },
};
