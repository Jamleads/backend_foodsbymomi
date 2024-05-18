const Factory = require("./handlerFactory");

exports.createWaitlist = Factory.createOne("waitlists");
exports.getOneWaitlist = Factory.getOne("waitlists");
exports.getAllWaitlist = Factory.getAll("waitlists");
exports.updateWaitlist = Factory.updateOne("waitlists");
exports.deleteWaitlist = Factory.deleteOne("waitlists");
