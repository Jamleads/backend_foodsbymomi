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
  const user = (await db.query("SELECT * FROM users WHERE id = ?", user_id))[0][0];
  if(user.referred_by != null){
    const referredBy = (await db.query("SELECT * FROM users WHERE id = ?", user.referred_by))[0][0];
    const voucherFetcher = await fetch(`https://v6.exchangerate-api.com/v6/${exchangeApi}/latest/${currency}`);
    const response = await voucherFetcher.json();
    if(!voucherFetcher.ok) return next(new AppError("Rate convertion failed", 400));
    let voucherNgn = response.conversion_rates.NGN;
    let voucherCanada = response.conversion_rates.CAD;
    let voucherGhana = response.conversion_rates.GHS;
    let voucherUk = response.conversion_rates.GBP;
    let voucherUs = response.conversion_rates.USD;
    
    // let voucherCurrency;
    
    // if(currency == "NGN"){
    //   voucherCurrency = "voucherNgn"
    // }

    // if(currency == "GHS"){
    //   voucherCurrency = "voucherGhana"
    // }

    // if(currency == "GBP"){
    //   voucherCurrency = "voucherUk"
    // }

    // if(currency == "USD"){
    //   voucherCurrency = "voucherUs"
    // }

    // if(currency == "CAD"){
    //   voucherCurrency = "voucherCanada"
    // }

    const referralPercentage = (await db.query("SELECT percentage_rate FROM voucher_interest WHERE id=1"))[0][0];
    if(!referralPercentage) return next(new AppError("Error, try to reward, please reach out to support", 400));
    
    const reward = amount/referralPercentage.percentage_rate;

    // ============ REWARDING VOUCHER ====================== //
    const userVoucher = (await db.query("SELECT * FROM voucher WHERE user_id = ?", referredBy.id))[0][0];
    if(userVoucher){
      // let rewardAmount = userVoucher[voucherCurrency]+=reward;

      let rewardNGN = voucherNgn*reward;
      let rewardGHS = voucherGhana*reward;
      let rewardGBP = voucherUk*reward;
      let rewardUSD = voucherUs*reward;
      let rewardCAD = voucherCanada*reward;

      const updatedVoucher = (await db.query(`UPDATE voucher SET ? WHERE user_id = ?`, [{
        voucherCanada: Number(userVoucher.voucherCanada)+Number(rewardCAD),
        voucherGhana: Number(userVoucher.voucherGhana)+Number(rewardGHS),
        voucherNgn: Number(userVoucher.voucherNgn)+Number(rewardNGN),
        voucherUs: Number(userVoucher.voucherUs)+Number(rewardUSD),
        voucherUk: Number(userVoucher.voucherUk)+Number(rewardGBP),
        voucher: Number(userVoucher.voucher)+Number(rewardUSD)
      }, referredBy.id]));

      console.log("updatedVoucher", updatedVoucher);
    } else {
      // ========= CREATE USER VOUCHER ============ //
      const createNewVoucher = (await db.query("INSERT INTO voucher SET ?", {
        user_id: referredBy.id,
        voucherNgn: voucherNgn*reward,
        voucherUs: voucherUs*reward,
        voucherUk: voucherUk*reward,
        voucherGhana: voucherGhana*reward,
        voucherCanada: voucherCanada*reward,
        voucher: voucherUs*reward
      }));

      // ========== UPDATE CREATED VOUCHER =========== //
      // const newVoucher = (await db.query(`UPDATE voucher SET ${voucherCurrency} = ${reward} WHERE user_id = ${referredBy.id}`));
      // console.log("newVoucher", newVoucher)
    }
    // let newVoucherBalance = referredBy.voucher+reward;
    // const referral = (await db.query("UPDATE users SET voucher = ? WHERE id = ?", [newVoucherBalance, referredBy.id]));
  }
  
}

