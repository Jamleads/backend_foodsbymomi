const db = require("../config/db");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Factory = require("./handlerFactory");

exports.createAdvertMessage = Factory.createOne("advert_messages");
exports.getAllAdvertMessages = Factory.getAll("advert_messages");
exports.getOneAdvertMessage = Factory.getOne("advert_messages");
exports.deleteAdvertMessage = Factory.deleteOne("advert_messages");
exports.updateAdvertMessage = Factory.updateOne("advert_messages");

exports.getVoucherPercentage = catchAsync(async (req, res, next) => {
  const rate = (await db.query("SELECT percentage_rate FROM voucher_interest WHERE id = 1"))[0][0];
  if(!rate) return next(new AppError("No interest rate set yet, please set a new one", 400));
  res.status(200).json({
    status: "success",
    message: "This is the latest percentage rate for referrals",
    data: rate
  });
});

exports.changeVoucherPercentage = catchAsync(async (req, res, next) => {
  const { rate } = req.body;
  if(!Number(rate)) return next(new AppError("Percentage rate must be a number", 400));
  if(!rate) return next(new AppError("No rate is defined", 400));

  // =============== FINDING IF RATE EXISTS BEFORE ==================== //
  const existingRate = (await db.query("SELECT * FROM voucher_interest WHERE id = 1"))[0][0];
  if(existingRate) {
    const updateRate = (await db.query(`UPDATE voucher_interest SET percentage_rate = ${rate} WHERE id = 1`));
  } else {
    const newRate = (await db.query("INSERT INTO voucher_interest SET ?", {
      percentage_rate: rate
    }))
  }
  res.status(200).json({
    status: "success",
    message: `The referral percentage rate has successfully been changed to ${rate}%`
  });
});
