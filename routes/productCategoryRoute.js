const express = require("express");
const {
  getCategory,
  addCategory,
  updateCategory,
  deleteCategory,
} = require("../controller/productCategoryController");
const { protect, restrictTo } = require("../controller/authController");

const router = express.Router();

router.route("/").get(getCategory);

router.use(protect);
router.use(restrictTo("admin", "superAdmin"));

router.route("/").post(addCategory);
router.route("/:id").put(updateCategory).delete(deleteCategory);

module.exports = router;
