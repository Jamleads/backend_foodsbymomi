const express = require("express");
const {
  getCategory,
  addCategory,
  updateCategory,
  deleteCategory,
} = require("../controller/productCategoryController");
const { protect, restrictTo } = require("../controller/authController");

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin"));

router.route("/").get(getCategory).post(addCategory);
router.route("/:id").put(updateCategory).delete(deleteCategory);

module.exports = router;
