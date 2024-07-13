const catchAsync = require("../utils/catchAsync");
const db = require("../config/db");
const AppError = require("../utils/appError");
const Email = require("../utils/email");
const { clearCartFn } = require("./cartController");
const { verifyTransaction, getPaymentLink } = require("../utils/flutterwave");

const updatePayment = async (order_id, status) => {
  const payment = (
    await db.query("SELECT * FROM payments WHERE order_id = ?", order_id)
  )[0][0];

  if (payment) {
    await db.query("UPDATE payments SET status = ? WHERE order_id = ?", [
      status,
      order_id,
    ]);
  } else {
    // update payment table
    await db.query("INSERT INTO payments SET ?", {
      order_id,
      amount: payload.amount,
      status: status,
    });
  }
};

exports.createOrder = catchAsync(async (req, res, next) => {
  // total amount
  const { total, currencyCode } = req.body;

  const currencyCodes = ["NGN", "GHS", "GBP", "USD", "CAD"];

  if (!currencyCodes.includes(currencyCode)) {
    return next(new AppError("Invalid currency code!", 400));
  }

  // get currently login users cart
  const sql = `SELECT products.*, cart_items.quantity FROM carts JOIN cart_items ON cart_items.cart_id = carts.id JOIN products ON products.id = cart_items.product_id WHERE user_id = ?`;

  const cart = (await db.query(sql, req.user.id))[0];

  if (!(Array.isArray(cart) && cart.length)) {
    return next(new AppError("User has no cart that requires check out!", 404));
  }

  // create order
  const order_id = (
    await db.query("INSERT INTO orders SET ?", { user_id: req.user.id, total })
  )[0].insertId;

  const getPrice = (code, priceNgn, priceUs, priceUk, priceGhana, priceCanada) => {
    if (code === "NGN") return priceNgn;
    if (code === "GHS") return priceGhana;
    if (code === "GBP") return priceUk;
    if (code === "USD") return priceUs;
    if (code === "CAD") return priceCanada;
  };

  // create order items
  for (let i = 0; i < cart.length; i++) {
    const {
      id: product_id,
      quantity,
      priceNgn,
      priceUs,
      priceUk,
      priceGhana,
      priceCanada,
    } = cart[i];

    const price = getPrice(
      currencyCode,
      priceNgn,
      priceUs,
      priceUk,
      priceGhana,
      priceCanada
    );

    await db.query("INSERT INTO order_items SET ?", {
      order_id,
      product_id,
      quantity,
      price,
    });
  }

  await clearCartFn(req, next);

  // GET PAYMENT LINK
  const paymentLink = await getPaymentLink(
    order_id,
    total,
    currencyCode,
    req.user.email,
    req.user.phone,
    req.user.name
  );

  res.status(200).json({
    status: "success",
    message: "Order submitted sucessfully!",
    paymentLink: paymentLink.data.link,
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

exports.webhookCheckout = catchAsync(async (req, res, next) => {
  const secretHash = req.headers["verif-hash"];

  if (process.env.WEBHOOK_SECRET_HASH !== secretHash) res.status(401).end();

  const payload = req.body;

  const order_id = payload.txRef.split("-")[2];

  if (verifyTransaction(payload.id)) {
    //update order
    await db.query("UPDATE orders SET status = 'Processing' WHERE id = ?", order_id);

    await updatePayment(order_id, "Completed");
  } else {
    //update order
    await db.query("UPDATE orders SET status = 'Pending' WHERE id = ?", order_id);

    await updatePayment(order_id, "Failed");

    //TODO
    // Inform the customer their payment was unsuccessful
    // send email
    // await new Email(newUser);
  }

  res.status(200).end();
});
