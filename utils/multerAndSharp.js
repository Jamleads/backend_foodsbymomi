const multer = require("multer");
const sharp = require("sharp");
const catchAsync = require("./catchAsync");
const Cloudinary = require("./cloudinary");

// Handle multipart form data
const multerStorage = multer.memoryStorage();

// check if file is an image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, "true");
  } else {
    cb(new AppError("Not an image! Please upload only images", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

//
exports.uploadUserPhoto = upload.single("image");

// Resize phot before upload
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // Check if there is a file on requst object
  if (!req.file) return next();

  // store edited photo in data
  const data = await sharp(req.file.buffer)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  const imageInfo = await new Cloudinary().upload(data);

  // // Get url and name of photo
  const imageUrl = imageInfo.secure_url;
  const imageName = imageInfo.public_id;

  // // Attach image name and image url to req object
  req.imageName = imageName;
  req.imageUrl = imageUrl;

  next();
});
