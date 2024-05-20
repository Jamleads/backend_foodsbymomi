const catchAsync = require("../utils/catchAsync");
const Factory = require("./handlerFactory");
const db = require("../config/db");
const { convertCategoriesToArray, sendResponse } = require("../utils/general");

exports.createProduct = Factory.createOne("products");
exports.getAllProduct = Factory.getAll("products");
exports.getOneProduct = Factory.getOne("products");
exports.deleteProduct = Factory.deleteOne("products");
exports.updateProduct = Factory.updateOne("products");

exports.getFeaturedProducts = catchAsync(async (req, res, next) => {
  let result = (await db.query("SELECT * FROM products WHERE featured = 'true'"))[0];

  convertCategoriesToArray(result);

  sendResponse(res, "products", result, 200);
});
