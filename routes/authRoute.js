const express = require("express");
const authController = require("../controller/authController");
const { getAllAdmins, deleteUser, getUser } = require("../controller/userController");

const router = express.Router();

router.post("/user/signup", authController.signUp);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password/:token", authController.resetPassword);

router.use(authController.protect);

router.put("/update-my-password", authController.updatePassword);

router.use(authController.restrictTo("superAdmin"));
router.post("/add-admin", authController.setAdminRole, authController.signUp);
router.route("/admin").get(getAllAdmins);
router.route("/admin/:id").get(getUser).delete(deleteUser);
module.exports = router;
