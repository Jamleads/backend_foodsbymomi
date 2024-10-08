const express = require("express");
const {
  createAdvertMessage,
  getAllAdvertMessages,
  getOneAdvertMessage,
  deleteAdvertMessage,
  updateAdvertMessage,
  getVoucherPercentage,
  changeVoucherPercentage,
} = require("../controller/advertMessageController");
const { restrictTo, protect } = require("../controller/authController");

const router = express.Router();

router.route("/").get(getAllAdvertMessages);

router.use(protect);
router.use(restrictTo("superAdmin", "admin"));

router.route("/rate").get(getVoucherPercentage).post(changeVoucherPercentage);
router
  .route("/:id")
  .get(getOneAdvertMessage)
  .delete(deleteAdvertMessage)
  .put(updateAdvertMessage);

router.route("/create").post(createAdvertMessage);
module.exports = router;
