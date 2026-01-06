const prisma = require("../libs/db");
const imageKit = require("../libs/imagekit");
const { formatDateOnly } = require("../utils/formattedDate");
const multer = require("../libs/multer").image;
const bcrypt = require("bcrypt");

module.exports = {
  getDetail: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const userWithProfile = await prisma.user.findUnique({
        where: {
          id: parseInt(userId),
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

      if (!userWithProfile) {
        return res.status(404).json({
          status: false,
          message: "User not found!",
          data: null,
        });
      }

      // Remove sensitive data
      delete userWithProfile.password;

      // Format dates
      if (userWithProfile.profile?.birth_date) {
        userWithProfile.profile.birth_date = formatDateOnly(
          userWithProfile.profile.birth_date
        );
      }

      res.status(200).json({
        status: true,
        message: "OK",
        data: userWithProfile,
      });
    } catch (err) {
      next(err);
    }
  },
  updateProfile: async (req, res, next) => {
    multer.single("avatar_url")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: err.message || "File upload error",
          data: null,
        });
      }

      try {
        // Check if user is authenticated
        const userId = parseInt(req.user.id);
        const { fullname, birth_date, city } = req.body;

        // Prepare user update data
        let userUpdateData = {};
        if (fullname) userUpdateData.fullname = fullname;

        // Prepare profile update data
        let profileUpdateData = {};
        if (birth_date) {
          // Pastikan format tanggal valid
          const birthDate = new Date(birth_date);
          if (isNaN(birthDate.getTime())) {
            return res.status(400).json({
              status: false,
              message: "Invalid birth date format. Use YYYY-MM-DD",
              data: null,
            });
          }
          profileUpdateData.birth_date = birthDate;
        }
        if (city) profileUpdateData.city = city;

        // Handle avatar upload
        if (req.file) {
          const uploadResult = await imageKit.upload({
            file: req.file.buffer.toString("base64"),
            fileName: `avatar_${userId}_${Date.now()}`,
            folder: "/profile-cust",
          });

          if (uploadResult.url) {
            profileUpdateData.avatar_url = uploadResult.url;
          }
        }

        // Check if there's any data to update
        if (
          Object.keys(userUpdateData).length === 0 &&
          Object.keys(profileUpdateData).length === 0
        ) {
          return res.status(400).json({
            status: false,
            message: "At least one field must be updated",
            data: null,
          });
        }

        // Update user and profile in a transaction
        const updatedUser = await prisma.$transaction(async (tx) => {
          if (Object.keys(userUpdateData).length > 0) {
            await tx.user.update({
              where: { id: userId },
              data: userUpdateData,
            });
          }

          await tx.profile.upsert({
            where: { user_id: userId },
            create: { user_id: userId, city: city || "", ...profileUpdateData },
            update: profileUpdateData,
          });

          return tx.user.findUnique({
            where: { id: userId },
            include: { profile: true },
          });
        });

        // Remove sensitive data
        delete updatedUser.password;

        // Format dates
        if (updatedUser.profile?.birth_date) {
          updatedUser.profile.birth_date = formatDateOnly(
            updatedUser.profile.birth_date
          );
        }

        res.status(200).json({
          status: true,
          message: "Profile updated successfully",
          data: updatedUser,
        });
      } catch (err) {
        next(err);
      }
    });
  },
  updatePass: async (req, res, next) => {
    try {
      const { oldPassword, newPassword, newPasswordConfirmation } = req.body;

      // Check if required parameters are provided
      if (!oldPassword || !newPassword || !newPasswordConfirmation) {
        return res.status(400).json({
          status: false,
          message: "Input must be required",
          data: null,
        });
      }

      const userId = req.user.id;

      // Fetch the current user with profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      // Check if the old password provided matches the user's current hashed password
      let isOldPasswordCorrect = await bcrypt.compare(
        oldPassword,
        user.password
      );
      if (!isOldPasswordCorrect) {
        return res.status(401).json({
          status: false,
          message: "Incorrect old password",
          data: null,
        });
      }

      // Check if user exists and has password (not Google OAuth user)
      if (!user || !user.password) {
        return res.status(400).json({
          status: false,
          message: user.google_id
            ? `"Password update failed, because you are logged in with google. You can update in page "Forget Password"`
            : "User not found",
          data: null,
        });
      }

      // Check if the new password matches the password confirmation
      if (newPassword !== newPasswordConfirmation) {
        return res.status(400).json({
          status: false,
          message: "New password and password confirmation do not match",
          data: null,
        });
      }

      // Check if new password is different from old password
      if (oldPassword === newPassword) {
        return res.status(400).json({
          status: false,
          message: "New password must be different from old password",
          data: null,
        });
      }

      // Hash the new password
      let encryptedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update user's password in the database and get updated user with profile
      const updatedUser = await prisma.$transaction(async (prisma) => {
        // Update password
        await prisma.user.update({
          where: { id: userId },
          data: { password: encryptedNewPassword },
        });

        // Get updated user with profile
        return prisma.user.findUnique({
          where: { id: userId },
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
      });

      // Remove sensitive data
      delete updatedUser.password;

      // Format dates
      if (updatedUser.profile?.birth_date) {
        updatedUser.profile.birth_date = formatDateOnly(
          updatedUser.profile.birth_date
        );
      }

      res.status(200).json({
        status: true,
        message: "Your password has been successfully updated!",
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  },
};
