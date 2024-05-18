const express = require("express");
const {
  createProduct,
  getAllProduct,
  getOneProduct,
  deleteProduct,
  updateProduct,
} = require("../controller/productController");

const router = express.Router({ mergeParams: true });

router.route("/").get(getAllProduct);

router.route("/create").post(createProduct);

router.route("/:id").get(getOneProduct).delete(deleteProduct).put(updateProduct);

module.exports = router;
