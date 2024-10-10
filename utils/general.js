const db = require("../config/db");
const { use } = require("../routes/productRoute");
const AppError = require("./appError");
const fetch = require("node-fetch");
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
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

exports.earnVoucher = async (user_id, amount, currencyCode, next) => {
  try {
    // Fetch the user
    const userResult = await db.query("SELECT * FROM users WHERE id = ?", [
      user_id,
    ]);
    const user = userResult[0][0];
    if (!user) throw new AppError("User not found", 404);

    console.log("User:", user);

    if (user.referred_by != null) {
      // Fetch the referred user
      const referredByResult = await db.query(
        "SELECT * FROM users WHERE id = ?",
        [user.referred_by]
      );
      const referredBy = referredByResult[0][0];
      console.log("Referred By:", referredBy);
      if (!referredBy) throw new AppError("Referred user not found", 404);

      // Fetch conversion rates
      // const voucherFetcher = await fetch(
      //   `https://v6.exchangerate-api.com/v6/${exchangeApi}/latest/${currencyCode}`
      // );
      // if (!voucherFetcher.ok) throw new AppError("Rate conversion failed", 400);

      // const response = await voucherFetcher.json();
      // const conversionRates = response.conversion_rates;
      // if (!conversionRates)
      //   throw new AppError("Conversion rates not found", 400);

      // Fetch referral percentage
      const referralPercentageResult = await db.query(
        "SELECT * FROM referral_rewards_percentage"
      );
      if (!referralPercentageResult || referralPercentageResult[0].length === 0)
        throw new AppError("Referral percentage data not found", 400);

      const referralPercentage =
        referralPercentageResult[0][0].percentage_to_earn;

      // Calculate rewardAmount
      const rewardAmount = (Number(referralPercentage) / 100) * Number(amount);
      if (isNaN(rewardAmount))
        throw new AppError("Failed to calculate reward amount", 400);

      console.log("Reward Amount:", rewardAmount);

      // Begin Transaction
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // Check if the referred user already has a voucher
        const userVoucherResult = await connection.query(
          "SELECT * FROM voucher WHERE user_id = ?",
          [referredBy.id]
        );
        const userVoucher = userVoucherResult[0][0];
        console.log(userVoucher);
        if (userVoucher) {
          let updateVoucherSql;
          switch (currencyCode) {
            case "NGN":
              updateVoucherSql =
                "UPDATE voucher SET voucherNgn = voucherNgn + ? WHERE user_id = ?";
              break;
            case "USD":
              updateVoucherSql =
                "UPDATE voucher SET voucherUs = voucherUs + ? WHERE user_id = ?";
              break;
            case "GBP":
              updateVoucherSql =
                "UPDATE voucher SET voucherUk = voucherUk + ? WHERE user_id = ?";
              break;
            case "GHS":
              updateVoucherSql =
                "UPDATE voucher SET voucherGhana = voucherGhana + ? WHERE user_id = ?";
              break;
            case "CAD":
              updateVoucherSql =
                "UPDATE voucher SET voucherCanada = voucherCanada + ? WHERE user_id = ?";
              break;
            default:
              throw new AppError("Invalid currency code", 400);
          }

          // Update the voucher with the reward amount
          // const res = await connection.query(updateVoucherSql, [
          //   rewardAmount,
          //   referredBy.id,
          // ]);
          const res = await connection.query(
            "UPDATE voucher SET voucherPoint = voucherPoint + ? WHERE user_id = ?",
            [rewardAmount, referredBy.id]
          );
          console.log(res);
        } else {
          // Insert a new voucher for the referred user
          const insertData = {
            user_id: referredBy.id,
            voucherPoint: 0,
            voucherNgn: currencyCode === "NGN" ? rewardAmount : 0,
            voucherUs: currencyCode === "USD" ? rewardAmount : 0,
            voucherUk: currencyCode === "GBP" ? rewardAmount : 0,
            voucherGhana: currencyCode === "GHS" ? rewardAmount : 0,
            voucherCanada: currencyCode === "CAD" ? rewardAmount : 0,
            // Add other voucher fields as necessary
          };

          await connection.query("INSERT INTO voucher SET ?", insertData);
        }

        // Commit Transaction
        await connection.commit();
      } catch (error) {
        // Rollback Transaction on Error
        await connection.rollback();
        throw error;
      } finally {
        // Release the connection back to the pool
        connection.release();
      }
    }
  } catch (error) {
    console.error("Voucher processing error:", error);
    return next(
      new AppError("An error occurred while processing the voucher", 500)
    );
  }
};
