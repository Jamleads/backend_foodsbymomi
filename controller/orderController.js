const catchAsync = require("../utils/catchAsync");
const db = require("../config/db");
const AppError = require("../utils/appError");
const { clearCartFn } = require("./cartController");
const Factory = require("../controller/handlerFactory");

exports.createOrder = catchAsync(async (req, res, next) => {
  // total amount
  const { total, products } = req.body;

  // get currently login users cart
  const sql = `SELECT products.id, cart_items.quantity FROM carts JOIN cart_items ON cart_items.cart_id = carts.id JOIN products ON products.id = cart_items.product_id WHERE user_id = ?`;

  const cart = (await db.query(sql, req.user.id))[0];

  if (!(Array.isArray(cart) && cart.length)) {
    return next(new AppError("User has no cart that requires check out!", 404));
  }

  // create order
  const order_id = (
    await db.query("INSERT INTO orders SET ?", { user_id: req.user.id, total })
  )[0].insertId;

  // create order items
  for (let i = 0; i < products.length; i++) {
    const { id: product_id, quantity, price } = products[i];

    await db.query("INSERT INTO order_items SET ?", {
      order_id,
      product_id,
      quantity,
      price,
    });
  }

  await clearCartFn(req, next);

  res.status(200).json({
    status: "success",
    message: "Order submitted sucessfully!",
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = (
    await db.query("SELECT * FROM orders WHERE id = ?", req.params.id)
  )[0][0];

  const products = (
    await db.query(
      "SELECT products.id, title, price, quantity, categories, image FROM orders JOIN order_items ON order_items.order_id = orders.id JOIN products ON order_items.product_id = products.id WHERE orders.id = ?",
      req.params.id
    )
  )[0];

  if (!order) {
    return next(new AppError("No order with that id!", 404));
  }

  res.status(200).json({
    status: "success",
    order: {
      ...order,
      products: [...products],
    },
  });
});

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = (
    await db.query(
      "SELECT orders.*, name, email, phone FROM orders JOIN users ON orders.user_id = users.id;"
    )
  )[0];

  res.status(200).json({
    status: "success",
    orders,
  });
});

exports.getAllOrdersOfOneUser = catchAsync(async (req, res, next) => {
  const orders = (
    await db.query(
      "SELECT orders.*, name, email, phone FROM orders JOIN users ON orders.user_id = users.id WHERE users.id = ?",
      req.user.id
    )
  )[0];

  res.status(200).json({
    status: "success",
    orders,
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  await db.query("UPDATE orders SET status = ? WHERE id = ?", [
    req.body.status,
    req.params.id,
  ]);

  const order = (
    await db.query("SELECT * FROM orders WHERE id = ? ", req.params.id)
  )[0][0];

  res.status(200).json({
    status: "success",
    order,
  });
});
