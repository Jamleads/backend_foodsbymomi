const express = require("express");
const discountController = require("../controller/dicountController");
const { restrictTo, protect } = require("../controller/authController");

const router = express.Router();

router.use(protect);
router.route("/:discount_code").get(discountController.getDiscountCode);
router.use(restrictTo("superAdmin", "admin"));
router.route("/").get(discountController.getAllDiscountCodes);
router.route("/create").post(discountController.createDiscountCode);

router
  .route("/:id")
  .delete(discountController.deleteDiscount)
  .patch(discountController.updateDiscount);
router
  .route("/set-referral-rewards-percentage")
  .post(discountController.createOrUpdateReferralReward);
router
  .route("/referral/rewards-percentage")
  .get(discountController.getPercentageToEarnOnReferralOrder);

module.exports = router;
