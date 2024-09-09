const db = require("../config/db");
const { use } = require("../routes/productRoute");

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

exports.earnVoucher = async (user_id, amount) => {
  const user = (await db.query("SELECT * FROM users WHERE id = ?", user_id))[0][0];
  if(user.referred_by != null){
    const referredBy = (await db.query("SELECT * FROM users WHERE id = ?", user.referred_by))[0][0];
    
    const reward = amount/10;
    let newVoucherBalance = referredBy.voucher+reward;
    const referral = (await db.query("UPDATE users SET voucher = ? WHERE id = ?", [newVoucherBalance, referredBy.id]));
  }
  
}
