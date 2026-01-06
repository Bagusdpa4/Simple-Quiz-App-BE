const multer = require("multer");

const storage = multer.memoryStorage();

const generateFileFilter = (allowedTypes) => {
  return (req, file, callback) => {
    const allowedMimetypes = {
      image: ["image/png", "image/jpg", "image/jpeg", "image/webp"],
    };

    const mimetypes = allowedTypes.flatMap((type) => allowedMimetypes[type]);

    if (!mimetypes.includes(file.mimetype)) {
      const err = new Error(
        `Hanya format ${mimetypes.join(", ")} yang diizinkan!`
      );
      err.status = 400;
      return callback(err, false);
    }
    callback(null, true);
  };
};

module.exports = {
  image: multer({
    storage: storage,
    fileFilter: generateFileFilter(["image"]),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
  }),
};
