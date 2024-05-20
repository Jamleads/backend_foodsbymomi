const express = require("express");
const {
  createProduct,
  getAllProduct,
  getOneProduct,
  deleteProduct,
  updateProduct,
  getFeaturedProducts,
} = require("../controller/productController");
const { protect, restrictTo } = require("../controller/authController");

const router = express.Router();

router.route("/").get(getAllProduct);
router.route("/:id").get(getOneProduct);

router.use(protect);
router.use(restrictTo("admin"));

router.route("/featured-products").get(getFeaturedProducts);

router.route("/create").post(createProduct);

router.route("/:id").delete(deleteProduct).put(updateProduct);

module.exports = router;
