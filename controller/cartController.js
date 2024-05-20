const Factory = require("../controller/handlerFactory");
const catchAsync = require("../utils/catchAsync");
const db = require("../config/db");
const { sendResponse } = require("../utils/general");
const AppError = require("../utils/appError");

exports.addToCart = catchAsync(async (req, res, next) => {
  //get user's cart id
  let cart_Id;
  const { product_id, quantity } = req.body;

  // get cart id if user alread had a cart
  cart_Id = (await db.query("SELECT * FROM carts WHERE user_id = ?", req.user.id))[0][0]
    ?.id;

  // if there is no cart then create new cart for user
  if (!cart_Id) {
    cart_Id = (await db.query("INSERT INTO carts SET ?", { user_id: req.user.id }))[0]
      .insertId;
  }

  // check if the product is already in the cart
  const result = (
    await db.query("SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?", [
      cart_Id,
      product_id,
    ])
  )[0][0];

  console.log({ result });

  // IF its not add it
  if (!result) {
    await db.query("INSERT INTO cart_items SET ?", { cart_Id, product_id, quantity });
  } else {
    const newQuantity = result.quantity + quantity;
    console.log({ newQuantity });

    await db.query("UPDATE cart_items SET ? WHERE cart_id = ? AND product_id = ?", [
      { quantity: newQuantity },
      cart_Id,
      product_id,
    ]);
  }

  res.status(200).json({
    status: "success",
    message: "product added to cart",
  });
});

exports.getCart = catchAsync(async (req, res, next) => {
  const sql = `SELECT products.*, cart_items.quantity FROM carts JOIN cart_items ON cart_items.cart_id = carts.id JOIN products ON products.id = cart_items.product_id WHERE user_id = ?`;

  const cart = (await db.query(sql, req.user.id))[0];

  if (!(Array.isArray(cart) && cart.length)) {
    return next(new AppError("User has no cart at the moment!", 404));
  }

  sendResponse(res, "carts", cart, 200);
});

exports.updateCart = catchAsync(async (req, res, next) => {
  const { id: product_id, quantity } = req.body;

  // get cart id
  const cart_id = (
    await db.query("SELECT * FROM carts WHERE user_id = ?", req.user.id)
  )[0][0]?.id;

  // get cart items id
  const cart_items_id = (
    await db.query("SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?", [
      cart_id,
      product_id,
    ])
  )[0][0]?.id;

  await db.query("UPDATE cart_items SET ? WHERE id = ?", [{ quantity }, cart_items_id]);

  next();
});

exports.removeProductFromCart = catchAsync(async (req, res, next) => {
  const { id: product_id } = req.body;

  // get cart id
  const cart_id = (
    await db.query("SELECT * FROM carts WHERE user_id = ?", req.user.id)
  )[0][0]?.id;

  //delete cart items for the product
  await db.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [
    cart_id,
    product_id,
  ]);

  next();
});

exports.clearCart = catchAsync(async (req, res, next) => {
  // get cart id
  const cart_id = (
    await db.query("SELECT * FROM carts WHERE user_id = ?", req.user.id)
  )[0][0]?.id;

  if (!cart_id) {
    return next(new AppError("User has no cart at the moment!", 404));
  }

  // delete cart
  await db.query("DELETE FROM carts WHERE id = ? ", cart_id);

  res.status(200).json({
    status: "success",
    message: "cart cleared!",
  });
});
