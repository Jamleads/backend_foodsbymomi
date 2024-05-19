const express = require("express");
const authController = require("../controller/authController");

const router = express.Router();

router.post("/admin/signup", authController.setAdminRole, authController.signUp);
router.post("/user/signup", authController.signUp);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password/:token", authController.resetPassword);

router.use(authController.protect);

router.put("/update-my-password", authController.updatePassword);

module.exports = router;
