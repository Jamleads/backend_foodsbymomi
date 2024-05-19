const Factory = require("./handlerFactory");

exports.createAdvertMessage = Factory.createOne("advert_messages");
exports.getAllAdvertMessages = Factory.getAll("advert_messages");
exports.getOneAdvertMessage = Factory.getOne("advert_messages");
exports.deleteAdvertMessage = Factory.deleteOne("advert_messages");
exports.updateAdvertMessage = Factory.updateOne("advert_messages");
