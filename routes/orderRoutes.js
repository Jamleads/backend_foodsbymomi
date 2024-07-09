const express = require("express");
const { protect, restrictTo } = require("../controller/authController");
const {
  createOrder,
  getOrderById,
  getAllOrders,
  getAllOrdersOfOneUser,
  updateOrderStatus,
} = require("../controller/orderController");

const router = express.Router({ mergeParams: true });

//protect route
router.use(protect);

router.route("/check-out").post(createOrder);
router.route("/me").get(getAllOrdersOfOneUser);
router.route("/:id").get(getOrderById);

// restrict to only admins
router.use(restrictTo("admin", "superAdmin"));

router.route("/").get(getAllOrders);
router.route("/:id").put(updateOrderStatus);

module.exports = router;
