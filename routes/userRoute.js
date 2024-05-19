const express = require("express");
const { protect, restrictTo } = require("../controller/authController");
const {
  updateMe,
  deleteMe,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
} = require("../controller/userController");

const router = express.Router();

router.use(protect);

// TODO
router.put(
  "/update-me",
  //   multerAndSharp.uploadUserPhoto,
  //   multerAndSharp.resizeUserPhoto,
  updateMe
);

router.delete("/delete-me", deleteMe);

//restrict to only admin
router.use(restrictTo("admin"));

router.route("/").get(getAllUsers);

router.route("/:id").get(getUser).delete(deleteUser).put(updateUser);

module.exports = router;
