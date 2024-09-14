const express = require("express");
const { protect, restrictTo } = require("../controller/authController");
const {
  updateMe,
  deleteMe,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  getUserReferrals,
  getUserVoucher,
} = require("../controller/userController");
const orderRoutes = require("../routes/orderRoutes");
const multerAndSharp = require("../utils/multerAndSharp");

const router = express.Router();

router.use("/orders", orderRoutes);

router.use(protect);

router.put(
  "/update-me",
  multerAndSharp.uploadUserPhoto,
  multerAndSharp.resizeUserPhoto,
  updateMe
);

router.delete("/delete-me", deleteMe);

router.route("/me/referrals").get(getUserReferrals);
router.route("/voucher").get(getUserVoucher);

//restrict to only admin
router.use(restrictTo("admin", "superAdmin"));

router.route("/").get(getAllUsers);

router.route("/:id").get(getUser).delete(deleteUser).put(updateUser);

router.route("/:id/referrals").get(getUserReferrals);

module.exports = router;
