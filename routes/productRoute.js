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
const multerAndSharp = require("../utils/multerAndSharp");

const router = express.Router();

router.route("/").get(getAllProduct);
router.route("/:id").get(getOneProduct);

router.use(protect);
router.use(restrictTo("admin"));

router.route("/featured-products").get(getFeaturedProducts);

router
  .route("/create")
  .post(multerAndSharp.uploadUserPhoto, multerAndSharp.resizeUserPhoto, createProduct);

router
  .route("/:id")
  .delete(deleteProduct)
  .put(multerAndSharp.uploadUserPhoto, multerAndSharp.resizeUserPhoto, updateProduct);

module.exports = router;
