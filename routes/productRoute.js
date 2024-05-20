const express = require("express");
const {
  createProduct,
  getAllProduct,
  getOneProduct,
  deleteProduct,
  updateProduct,
  getFeaturedProducts,
} = require("../controller/productController");

const router = express.Router();

router.route("/").get(getAllProduct);
router.route("/featured-products").get(getFeaturedProducts);

router.route("/create").post(createProduct);

router.route("/:id").get(getOneProduct).delete(deleteProduct).put(updateProduct);

module.exports = router;
