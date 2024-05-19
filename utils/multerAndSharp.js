const multer = require("multer");
const sharp = require("sharp");
const crypto = require("crypto");
// const s3 = require("./s3");
const catchAsync = require("./catchAsync");

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
exports.uploadUserPhoto = upload.single("photo");

// Random name generator
const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

// Resize phot before upload
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // Check if there is a file on requst object
  if (!req.file) return next();

  // store edited photo in data
  const data = await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  // Generate random Image name
  const imageName = randomImageName();

  // Send file to S3 bucket
  await s3.sendFile(data, req, imageName);

  // Get signed url for photo
  const imageUrl = await s3.getSignedUrl(imageName);

  // Attach image name and image url to req object
  req.imageName = imageName;
  req.imageUrl = imageUrl;

  next();
});
