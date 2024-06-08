const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const db = require("../config/db");
const Factory = require("../controller/handlerFactory");
const Cloudinary = require("../utils/cloudinary");

// selected fields
const columns = "id, name, email, role, phone, imageUrl, active";

const filterObj = (obj, ...options) => {
  let newObj = {};
  Object.keys(obj).forEach((el) => {
    if (options.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

// Update user account
exports.updateMe = catchAsync(async (req, res, next) => {
  // Create error if user send password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password update, use /updatemypassword instead.",
        400
      )
    );
  }

  // Filter out fileds that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email", "phone");

  // Check if profile photo is being updated and add to filterdBody
  if (req.imageName) {
    // Delete previous profile photo
    req.user.imageName && (await new Cloudinary().delete(req.user.imageName));

    // Add image name and profile photo url to filterdBody
    filteredBody.imageName = req.imageName;
    filteredBody.imageUrl = req.imageUrl;
  }

  // Update user
  const sql = "UPDATE users SET ? WHERE id = ?";
  await db.query(sql, [filteredBody, req.user.id]);

  // Get updated user
  const user = (
    await db.query(`SELECT ${columns} FROM users WHERE id = ?`, [req.user.id])
  )[0][0];

  // send response
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const sql = "UPDATE users SET active = 'false' WHERE id = ?";
  await db.query(sql, req.user.id);

  res.status(204).json({
    status: "success",
  });
});

exports.getUserReferrals = catchAsync(async (req, res, next) => {
  const sql =
    "SELECT users.id, name, email, imageUrl FROM referrals JOIN users ON users.id = referrals.referee_id WHERE referrer_id = ?";

  const id = req.params.id || req.user.id;

  const referrals = (await db.query(sql, id))[0];

  res.status(200).json({
    status: "success",
    data: {
      referrals,
    },
  });
});

exports.getAllUsers = Factory.getAll("users", columns);
exports.getUser = Factory.getOne("users", columns);
exports.deleteUser = Factory.deleteOne("users");
exports.updateUser = Factory.updateOne("users", columns);
