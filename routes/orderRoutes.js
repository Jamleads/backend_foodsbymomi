const express = require("express");
const { protect, restrictTo } = require("../controller/authController");
const {
  createOrder,
  getOrderById,
  getAllOrders,
  getAllOrdersOfOneUser,
  updateOrderStatus,
} = require("../controller/orderController");
const cartController = require("../controller/cartController");

const router = express.Router({ mergeParams: true });

//protect route
router.use(protect);

router.route("/check-out").post(createOrder);
router.route("/me").get(getAllOrdersOfOneUser);
router.route("/:id").get(getOrderById);

// restrict to only admins
router.use(restrictTo("admin"));

router.route("/").get(getAllOrders);
router.route("/:id").put(updateOrderStatus);

module.exports = router;
