const db = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const validator = require("validator");
const { promisify } = require("util");
const Email = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, req) => {
  const token = signToken(user.id.toString());

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  });

  //remove password
  delete user.password;

  res.status(statusCode).json({
    status: "success",
    token,
    data: user,
  });
};

const changedPasswordAfter = (JWTTimestamp, user) => {
  if (user.passwordChangedAt) {
    const changedPasswordTimestamp = new Date(user.passwordChangedAt).getTime() / 1000;

    return JWTTimestamp < changedPasswordTimestamp;
  }

  return false;
};

const comparePassword = (currentPassword, user) => {
  return bcrypt.compare(currentPassword, user.password);
};

const createPasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");

  const passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  return { resetToken, passwordResetToken, passwordResetExpires };
};

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.setAdminRole = (req, res, next) => {
  req.body.role = "admin";

  next();
};

exports.signUp = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role } = req.body;

  console.log(role);
  console.log(req.body);

  // check if first name and last name are empty strings
  if (name.trim() === "") return next(new AppError("Name is required", 400));

  // Check if email is valid
  if (!email || !validator.isEmail(email)) {
    return next(new AppError("Please enter a valid email!"));
  }

  // Check if email is already in use
  const result = (await db.query(`SELECT email FROM users WHERE email = ?`, email))[0];

  if (Array.isArray(result) && result.length) {
    return next(new AppError("Email is already in use!"), 400);
  }

  // Check if password is equal to confirm password
  if (password !== passwordConfirm) {
    return next(new AppError("Password and confirm password are not the same.", 400));
  }

  // Check if password is up to 8 characters
  if (!password || password.length < 8) {
    return next(new AppError("Please enter a password with at least 8 characters", 400));
  }

  //   Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  //    Insert new user
  const data1 = { name, email, password: hashedPassword };
  const data2 = { name, email, password: hashedPassword, role };
  const data = role ? data2 : data1;
  const sql = "INSERT INTO users SET ?";

  const newUserId = (await db.query(sql, data))[0].insertId;

  // Get current user
  const newUser = (
    await db.query(
      `SELECT id, name, email, role, phone, profilePhotoUrl FROM users WHERE id = ${newUserId} `
    )
  )[0][0];

  // send email
  await new Email(newUser).sendWelcome();

  //   create and send Token
  createSendToken(newUser, 201, res, req);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedOut", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: "success" });
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password is provided
  if (!email || !password) {
    return next(new AppError("Please provide a valid email and password!"), 400);
  }

  // Check if user exist and password is correct
  const user = (
    await db.query(
      "SELECT id, name, email, role, phone, profilePhotoUrl, password FROM users WHERE email = ?",
      email
    )
  )[0][0];

  if (!user || !(await comparePassword(password, user))) {
    return next(new AppError("Invalid email or password!", 401));
  }

  createSendToken(user, 200, res, req);
});

exports.protect = catchAsync(async (req, res, next) => {
  // Get token
  let token;
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("You are not logged in, please log in to get access!"), 401);
  }

  // Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if user still exist
  let user;

  user = (await db.query("SELECT * FROM users WHERE id = ?", decoded.id))[0][0];

  if (!user) {
    return next(new AppError("This user belonging to this token no longer exist", 401));
  }

  // Check user's active status
  if (user.active === "false") {
    return next(new AppError("This User is deactivated", 404));
  }

  // Check if user changed password after token was issued
  if (changedPasswordAfter(decoded.iat, user)) {
    return next(new AppError("Password changed recently, Login again", 401));
  }

  // TODO
  //   // Check if user has a profile photo and if the url has expired, get a new url
  //   if (user.profilePhotoUrlExp && Date.now() > new Date(user.profilePhotoUrlExp)) {
  //     // Get new signed url for profile photo
  //     const url = await s3.getSignedUrl(user.profilePhotoName);

  // const updateForm = {};

  // // Set the value of the profile photo url and expiration time in update form
  // updateForm.profilePhotoUrl = url;
  // updateForm.profilePhotoUrlExp = setProfilePhotoUrlExpTime.setProfilePhotoExp();

  // // save update form to database
  // const sql = "UPDATE users SET ? WHERE id = ?";
  // await db.query(sql, [updateForm, user.id]);

  // Get updated user
  // user = (await db.query("SELECT * FROM users WHERE id = ?", user.id))[0][0];

  user.password = undefined;

  req.user = user;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    next();
  };
};

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, password, passwordConfirm } = req.body;

  // Get the current user
  const user = (await db.query("SELECT * FROM users WHERE id = ?", req.user.id))[0][0];

  // Check if current password is correct
  if (!(await comparePassword(passwordCurrent, user))) {
    return next(new AppError("Your current password is incorrect!", 401));
  }

  // Check if password is equal to confirm password
  if (password !== passwordConfirm) {
    return next(new AppError("Password and confirm password are not the same.", 400));
  }

  // Check if password is up to 8 characters
  if (!password || password.length < 8) {
    return next(new AppError("Please enter a password with at least 8 characters", 400));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // // Update password
  await db.query("UPDATE users SET password = ? WHERE id = ?", [
    hashedPassword,
    req.user.id,
  ]);

  // Get updated user
  const updatedUser = (
    await db.query(
      "SELECT id, name, email, role, phone, profilePhotoUrl, password FROM users WHERE id = ? ",
      req.user.id
    )
  )[0][0];

  // Log user In, send jwt
  createSendToken(updatedUser, 200, res, req);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on email provided
  const user = (
    await db.query("SELECT * FROM users WHERE email = ? ", req.body.email)
  )[0][0];

  if (!user) {
    return next(new AppError("There is no user with the email address.", 404));
  }

  //Generate random token
  const resetOpt = createPasswordResetToken();
  const { resetToken, passwordResetToken, passwordResetExpires } = resetOpt;

  // Save hashed reset password and reset token expiration in db
  const sql =
    "UPDATE users SET passwordResetToken = ?, passwordResetExpires = ? WHERE email = ? ";

  await db.query(sql, [passwordResetToken, passwordResetExpires, req.body.email]);

  // TODO
  // Send token to user's email
  const resetURL = `${process.env.FRONTEND_URL}}/reset-password/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    const sql =
      "UPDATE users SET passwordResetToken = ?, passwordResetExpires = ? WHERE email = ? ";

    await db.query(sql, [undefined, undefined, req.body.email]);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on token
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  // Get the user based on the token
  const sql =
    "SELECT id, name, email, role, phone, profilePhotoUrl, password FROM users WHERE passwordResetToken = ? AND passwordResetExpires > NOW()";
  const user = (await db.query(sql, hashedToken))[0][0];

  // If no user then token is either invalid or expired.
  if (!user) {
    return next(new AppError("Token is invalid or Expired"), 400);
  }

  // If token is valid, then update password
  const { password, passwordConfirm } = req.body;

  // Check if password is equal to confirm password
  if (password !== passwordConfirm) {
    return next(new AppError("Password and confirm password are not the same.", 400));
  }

  // Check if password is up to 8 characters
  if (!password || password.length < 8) {
    return next(new AppError("Please enter a password with at least 8 characters", 400));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  const q =
    "UPDATE users SET password = ?, passwordResetToken = ?, passwordResetExpires = ? WHERE email = ? ";

  await db.query(q, [hashedPassword, undefined, undefined, user.email]);

  // Log user in and send jwt
  createSendToken(user, 200, res, req);
});
