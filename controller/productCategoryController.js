const Factory = require("./handlerFactory");

exports.getCategory = Factory.getAll("product_categorys");
exports.addCategory = Factory.createOne("product_categorys");
exports.deleteCategory = Factory.deleteOne("product_categorys");
exports.updateCategory = Factory.updateOne("product_categorys");
