const db = require("../config/db");
const { use } = require("../routes/productRoute");
const AppError = require("./appError");
let exchangeApi = process.env.EXCHANGE_GENERATION_API;

exports.convertCategoriesToArray = (data) => {
  let res = [];

  for (let i = 0; i < data.length; i++) {
    for (const [key, value] of Object.entries(data[i])) {
      if (key === "categories") {
        data[i][key] = value.split("-");
      }
    }

    res.push(data[i]);
  }

  return res;
};

exports.sendResponse = (res, table, response, statusCode) => {
  const results = response.length > 1 ? response.length : undefined;

  let tableName = results ? table : table.slice(0, -1);

  res.status(statusCode).json({
    status: "success",
    results,
    [tableName]: response,
  });
};

exports.generateReferralCode = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

exports.earnVoucher = async (user_id, amount, currency, next) => {
  try {
    const user = (await db.query("SELECT * FROM users WHERE id = ?", [user_id]))[0];
    if (!user) return next(new AppError("User not found", 404));

    if (user.referred_by != null) {
      const referredBy = (await db.query("SELECT * FROM users WHERE id = ?", [user.referred_by]))[0];
      if (!referredBy) return next(new AppError("Referred user not found", 404));

      const voucherFetcher = await fetch(`https://v6.exchangerate-api.com/v6/${exchangeApi}/latest/${currency}`);
      if (!voucherFetcher.ok) return next(new AppError("Rate conversion failed", 400));

      const response = await voucherFetcher.json();
      const conversionRates = response.conversion_rates;
      if (!conversionRates) return next(new AppError("Conversion rates not found", 400));

      const referralPercentage = (await db.query("SELECT percentage_rate FROM voucher_interest WHERE id=1"))[0];
      if (!referralPercentage) return next(new AppError("Error retrieving referral percentage", 400));

      const reward = amount / referralPercentage.percentage_rate;

      const userVoucher = (await db.query("SELECT * FROM voucher WHERE user_id = ?", [referredBy.id]))[0];
      const voucherData = {
        voucherCanada: conversionRates.CAD * reward,
        voucherGhana: conversionRates.GHS * reward,
        voucherNgn: conversionRates.NGN * reward,
        voucherUs: conversionRates.USD * reward,
        voucherUk: conversionRates.GBP * reward,
        voucher: conversionRates.USD * reward
      };

      await db.beginTransaction();

      try {
        if (userVoucher) {
          await db.query("UPDATE voucher SET ? WHERE user_id = ?", [{
            voucherCanada: Number(userVoucher.voucherCanada) + voucherData.voucherCanada,
            voucherGhana: Number(userVoucher.voucherGhana) + voucherData.voucherGhana,
            voucherNgn: Number(userVoucher.voucherNgn) + voucherData.voucherNgn,
            voucherUs: Number(userVoucher.voucherUs) + voucherData.voucherUs,
            voucherUk: Number(userVoucher.voucherUk) + voucherData.voucherUk,
            voucher: Number(userVoucher.voucher) + voucherData.voucher
          }, referredBy.id]);
        } else {
          await db.query("INSERT INTO voucher SET ?", {
            user_id: referredBy.id,
            ...voucherData
          });
        }

        await db.commit();
      } catch (error) {
        await db.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error("Voucher processing error:", error);
    return next(new AppError("An error occurred while processing the voucher", 500));
  }
};

