const Factory = require("./handlerFactory");

exports.createProduct = Factory.createOne("products");
exports.getAllProduct = Factory.getAll("products");
exports.getOneProduct = Factory.getOne("products");
exports.deleteProduct = Factory.deleteOne("products");
exports.updateProduct = Factory.updateOne("products");
