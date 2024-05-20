const express = require("express");
const {
  addToCart,
  getCart,
  updateCart,
  removeProductFromCart,
  clearCart,
} = require("../controller/cartController");
const { protect } = require("../controller/authController");

const router = express.Router();

router.use(protect);

router.route("/add").post(addToCart);
router.route("/").get(getCart).put(updateCart, getCart);
router.route("/clear-cart").get(clearCart);
router.route("/remove-product").post(removeProductFromCart, getCart);

module.exports = router;
