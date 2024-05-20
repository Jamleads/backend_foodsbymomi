const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Factory = require("./handlerFactory");
const db = require("../config/db");
const Email = require("../utils/email");

exports.createWaitlist = Factory.createOne("waitlists");
exports.getOneWaitlist = Factory.getOne("waitlists");
exports.getAllWaitlist = Factory.getAll("waitlists");
exports.updateWaitlist = Factory.updateOne("waitlists");
exports.deleteWaitlist = Factory.deleteOne("waitlists");

exports.sendEmail = catchAsync(async (req, res, next) => {
  // custom message
  const message = req.body;

  //get emails of everyone on waitlist
  const [result] = await db.query("SELECT email FROM waitlists;");

  if (!(Array.isArray(result) && result.length)) {
    return next(new AppError("No customers on waitlist", 404));
  }

  // send emails
  for (let i = 0; i < result.length; i++) {
    console.log(result[i]);
    await new Email(result[i]).sendEmailToWaitlist(message.message);
  }

  // delete customers from waitlist after email is sent
  await db.query("DELETE FROM waitlists");

  res.status(200).json({
    status: "success",
    message: "Email sent to waitlist",
  });
});
