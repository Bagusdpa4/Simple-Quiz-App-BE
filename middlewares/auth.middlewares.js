const jwt = require("jsonwebtoken");
const prisma = require("../libs/db");

module.exports = {
  restrict: async (req, res, next) => {
    try {
      const { authorization } = req.headers;

      if (!authorization || !authorization.split(" ")[1]) {
        return res.status(403).json({
          status: false,
          message: "Token not provided!",
          data: null,
        });
      }

      if (!process.env.JWT_SECRET_KEY) {
        throw new Error("JWT_SECRET_KEY is not configured");
      }

      const token = authorization.split(" ")[1];

      const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

      const user = await prisma.user.findUnique({
        where: { id: decodedToken.id },
        select: {
          id: true,
          fullname: true,
          email: true,
          google_id: true,
          profile: {
            select: {
              avatar_url: true,
              city: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          status: false,
          message: "User not found",
          data: null,
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          status: false,
          message: "Invalid token",
          data: null,
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          status: false,
          message: "Expired Token",
          data: null,
        });
      }

      console.error("Middleware Error:", error.message);
      next(error);
    }
  },
};
