const express = require("express");
const {
  createWaitlist,
  getOneWaitlist,
  getAllWaitlist,
  updateWaitlist,
  deleteWaitlist,
  sendEmail,
} = require("../controller/waitlistController");
const { protect, restrictTo } = require("../controller/authController");

const router = express.Router();

router.route("/create").post(createWaitlist);

router.use(protect);
router.use(restrictTo("admin", "superAdmin"));

router.route("/").get(getAllWaitlist);
router.route("/:id").get(getOneWaitlist).delete(deleteWaitlist).put(updateWaitlist);
router.route("/send-email").post(sendEmail);

module.exports = router;
