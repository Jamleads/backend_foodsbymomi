const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const db = require("../config/db");
const Factory = require("../controller/handlerFactory");

// selected fields
const columns = "id, name, email, role, phone, profilePhotoUrl, active";

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

  // TODO
  //   // Check if profile photo is being updated and add to filterdBody
  //   if (req.imageName) {
  //     // Delete previous profile photo
  //     req.user.profilePhotoName && (await s3.deleteFile(req.user.profilePhotoName));

  //     // Set the profile photo expiration time
  //     const profilePhotoUrlExp = setProfilePhotoUrlExpTime.setProfilePhotoExp();

  //     // Add image name, profile photo url and progile photo expiration time to filterdBody
  //     filteredBody.profilePhotoName = req.imageName;
  //     filteredBody.profilePhotoUrl = req.imageUrl;
  //     filteredBody.profilePhotoUrlExp = profilePhotoUrlExp;
  //   }

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

exports.getAllUsers = Factory.getAll("users", columns);
exports.getUser = Factory.getOne("users", columns);
exports.deleteUser = Factory.deleteOne("users");
exports.updateUser = Factory.updateOne("users", columns);
