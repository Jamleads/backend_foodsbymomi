const db = require("../config/db");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Factory = require("./handlerFactory");
const { generateReferralCode } = require("../utils/general");

exports.createDiscountCode = catchAsync(async (req, res, next) => {
  const { percentage_discounted, number_of_times_to_be_use } = req.body;

  if (!percentage_discounted)
    return next(new AppError("Percentage Discounted is required", 400));

  if (!number_of_times_to_be_use)
    return next(new AppError("Number of time to be use is required", 400));

  // Generate unique discount code
  let discountCode;
  let isUnique = false;

  while (!isUnique) {
    discountCode = generateReferralCode();

    const codeCheck = await db.query(
      "SELECT * FROM discount_code WHERE code = ?",
      [discountCode]
    );
    if (codeCheck[0].length === 0) {
      isUnique = true;
    }
  }

  // Check of discount code is already used
  const isDiscountCode = (
    await db.query(
      "SELECT code FROM discount_code WHERE code = ?",
      discountCode
    )
  )[0][0];

  if (isDiscountCode) {
    discountCode = generateReferralCode();
  }

  // Insert Discount code
  const dataDiscountCode = {
    percentage_discounted: Number(percentage_discounted),
    number_of_times_to_be_use: Number(number_of_times_to_be_use),

    code: discountCode,
  };

  const sql = "INSERT INTO discount_code SET ?";

  await db.query(sql, dataDiscountCode);

  res
    .status(201)
    .json({ status: "success", message: "Discount code created successfully" });
});

exports.redeemDiscount = async (code) => {
  const _code = await db.query(
    "SELECT * FROM discount_code WHERE code = ? AND status = 'Ongoing'",
    code
  );
  if (!_code) throw new AppError("Discount code redeemed or not found", 404);
  return _code[0][0];
};

exports.getDiscountCode = catchAsync(async (req, res, next) => {
  if (!req.params.discount_code)
    throw new AppError("Discount code is required", 404);
  const _codeResult = await db.query(
    "SELECT * FROM discount_code WHERE code = ? AND status = 'Ongoing'",
    [req.params.discount_code] // Ensure this is passed as an array
  );
  const _code = _codeResult[0][0];
  if (_code) {
    return res
      .status(200)
      .json({ status: "success", data: { discount: _code } });
  }
  return res
    .status(404)
    .json({ status: "success", message: "Discount code not found or redeem" });
});

exports.updateDiscount = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!id) throw new AppError("Id is required");
  const { percentage_discounted, number_of_times_to_be_use } = req.body;
  const _codeResult = await db.query(
    "SELECT * FROM discount_code WHERE id = ?  AND status = 'Ongoing'",
    [id] // Ensure this is passed as an array
  );
  console.log(_codeResult);
  const _code = _codeResult[0][0];
  if (_code) {
    // Access the first row of the result set

    // Create an object to store fields to update
    const filteredBody = {
      status: _code.status,
      number_of_times_used: number_of_times_to_be_use,
      percentage_discounted: percentage_discounted,
    };

    // Update the discount code in the database
    const sql = "UPDATE discount_code SET ? WHERE id = ?";
    await db.query(sql, [filteredBody, id]);

    return res
      .status(200)
      .json({ status: "success", message: "Discount updated successfully." });
  } else {
    return res.status(404).json({
      status: "success",
      message: "Discount code not found or redeem completely",
    });
  }
});

exports.deleteDiscount = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!id) throw new AppError("Id is required");

  const sql = "DELETE FROM discount_code WHERE id = ?";
  await db.query(sql, id);

  return res
    .status(200)
    .json({ status: "success", message: "Discount delete successfully." });
});

exports.updateRedeemPercentage = catchAsync(async (discount_code) => {
  const _codeResult = await db.query(
    "SELECT * FROM discount_code WHERE code = ?",
    [discount_code] // Ensure this is passed as an array
  );
  const _code = _codeResult[0][0];
  if (_code) {
    // Access the first row of the result set

    // Create an object to store fields to update
    const filteredBody = {
      status: _code.status,
      number_of_times_used: _code.number_of_times_used + 1, // Increment usage count
    };

    // If the discount code has reached its usage limit, mark it as "Completed"
    if (_code.number_of_times_to_be_use === filteredBody.number_of_times_used) {
      filteredBody.status = "Completed";
    }

    // Update the discount code in the database
    const sql =
      "UPDATE discount_code SET ? WHERE code = ? AND status = 'Ongoing'";
    await db.query(sql, [filteredBody, discount_code]);
  }
});

exports.calculateAmount = (amount, percentage_discounted) => {
  return (Number(amount) / 100) * percentage_discounted;
};

exports.getAllDiscountCodes = Factory.getAll("discount_code");

exports.getPercentageToEarnOnReferralOrder = catchAsync(
  async (req, res, next) => {
    const result = await db.query("SELECT * FROM referral_rewards_percentage");
    if (!result)
      throw next(new AppError("Percentage To Earn is not Found", 404));

    return res.status(200).json({
      status: "success",
      data: {
        percentage_to_earn: result[0][0],
      },
    });
  }
);
exports.createOrUpdateReferralReward = catchAsync(async (req, res, next) => {
  const { percentage_to_earn } = req.body;

  if (!percentage_to_earn) {
    return next(new AppError("percentage_to_earn is required", 400));
  }

  // Check if there is already a row in the table
  const result = await db.query("SELECT * FROM referral_rewards_percentage");

  if (result[0].length > 0) {
    // Row exists, so update it
    await db.query(
      "UPDATE referral_rewards_percentage SET percentage_to_earn = ? WHERE id = ?",
      [percentage_to_earn, result[0][0].id]
    );
    res.status(200).json({
      status: "success",
      message: "Referral reward percentage updated successfully",
    });
  } else {
    // No row exists, so insert a new one
    await db.query(
      "INSERT INTO referral_rewards_percentage (percentage_to_earn) VALUES (?)",
      [percentage_to_earn]
    );
    res.status(201).json({
      status: "success",
      message: "Referral reward percentage created successfully",
    });
  }
});

exports.rewardReferrer = async ({ userId, amount, currencyCode }) => {
  try {
    // Step 1: Find the buyer
    const buyer = await db.query("SELECT * FROM users WHERE id = ?", [userId]);

    if (!buyer[0][0]) {
      return next(new AppError("Buyer not found", 404));
    }

    // Step 2: Check if the buyer was referred by another user
    const referrerCode = buyer[0][0].referred_by;
    if (referrerCode) {
      // Step 3: Find the referrer using the referralCode
      const referrer = await db.query(
        "SELECT * FROM users WHERE referralCode = ?",
        [referrerCode]
      );

      if (referrer[0][0]) {
        const referrerId = referrer[0][0].id;

        // Step 4: Get the referral rewards percentage
        const referralPercentageResult = await db.query(
          "SELECT * FROM referral_rewards_percentage"
        );
        const referralPercentage = referralPercentageResult[0][0].percentage;

        // Step 5: Calculate the referral reward based on the purchase amount
        const rewardAmount = (referralPercentage / 100) * amount;

        // Step 6: Update the referrer's voucher based on the currency
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
            return next(new AppError("Invalid currency code", 400));
        }
        await db.query(updateVoucherSql, [rewardAmount, referrerId]);
      }
    }
  } catch (e) {
    console.log(e);
  }
};
