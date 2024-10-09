const Flutterwave = require("flutterwave-node-v3");
const catchAsync = require("../utils/catchAsync");
const db = require("../config/db");
const AppError = require("../utils/appError");
const Email = require("../utils/email");
const { clearCartFn } = require("./cartController");
const { getPaymentLink } = require("../utils/flutterwave");
const { earnVoucher } = require("../utils/general");
const {
  redeemDiscount,
  calculateAmount,
  updateRedeemPercentage,
} = require("./dicountController");
const fetch = require("node-fetch");
let exchangeApi = process.env.EXCHANGE_GENERATION_API;

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY,
  process.env.FLW_SECRET_KEY
);

const updatePayment = async (order_id, status, currency, amount) => {
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
      amount,
      status: status,
      currency,
    });
  }
};

// body: "response": responseApi

exports.createOrder = catchAsync(async (req, res, next) => {
  const { response, method, voucher, discount_code } = req.body;
  if (!method || !response)
    return next(
      new AppError(
        "Order cannot be created as method or payload is not provided",
        400
      )
    );
  let discount;
  if (discount_code) {
    console.log(discount_code);
    discount = await redeemDiscount(discount_code);
    console.log(discount);
  }
  if (voucher) {
    const { currency, amount } = voucher;
    if (!amount) return next(new AppError("Please enter voucher amount", 400));

    const currencyCodes = ["NGN", "GHS", "GBP", "USD", "CAD"];
    if (!currencyCodes.includes(currency))
      return next(new AppError("Invalid currency code", 400));

    // Fetch the user's voucher balances
    const userVoucher = (
      await db.query("SELECT * FROM voucher WHERE user_id = ?", req.user.id)
    )[0][0];
    if (!userVoucher)
      return next(
        new AppError("Sorry! this user does not have any voucher", 400)
      );

    // Determine which voucher the user is trying to use (currency specific)
    let voucherToBeUsed;
    switch (currency) {
      case "NGN":
        voucherToBeUsed = "voucherNgn";
        break;
      case "GHS":
        voucherToBeUsed = "voucherGhana";
        break;
      case "GBP":
        voucherToBeUsed = "voucherUk";
        break;
      case "USD":
        voucherToBeUsed = "voucherUs";
        break;
      case "CAD":
        voucherToBeUsed = "voucherCanada";
        break;
      default:
        return next(new AppError("Invalid currency", 400));
    }

    // Check if user has enough voucher in the chosen currency
    if (userVoucher[voucherToBeUsed] < amount) {
      return next(new AppError("Not enough voucher", 400));
    }

    // Calculate the percentage of voucher being used
    const percentageUsed = amount / userVoucher[voucherToBeUsed];

    // Deduct the same percentage from all currencies
    const updatedVoucherBalances = {
      voucherNgn:
        userVoucher.voucherNgn - userVoucher.voucherNgn * percentageUsed,
      voucherGhana:
        userVoucher.voucherGhana - userVoucher.voucherGhana * percentageUsed,
      voucherUk: userVoucher.voucherUk - userVoucher.voucherUk * percentageUsed,
      voucherUs: userVoucher.voucherUs - userVoucher.voucherUs * percentageUsed,
      voucherCanada:
        userVoucher.voucherCanada - userVoucher.voucherCanada * percentageUsed,
      voucher: userVoucher.voucher - userVoucher.voucher * percentageUsed,
    };

    // Update the user's voucher balances in the database
    await db.query("UPDATE voucher SET ? WHERE user_id = ?", [
      updatedVoucherBalances,
      req.user.id,
    ]);

    // return res.send("Voucher successfully applied");
  }
  if (method == "alart_pay") {
    if (response.status !== true || response.data.status !== "completed")
      return next(
        new AppError("Order cannot be created as the payment failed", 400)
      );

    // ================ VERIFYING PAYMENT ===================== //
    if (!response.data.id)
      return next(
        new AppError(
          "No transaction id detected, please add a transaction id to verify your transaction",
          400
        )
      );
    try {
      const res = await fetch(
        `https://apibox.alatpay.ng/alatpaytransaction/api/v1/transactions/${response.data.id}`
      );
      if (!res.ok) return next(new AppError("Payment validation failed", 400));
      const responses = await res.json();
      if (
        responses.status !== true ||
        response.data.status !== "completed" ||
        responses.message !== "Success"
      )
        return next(new AppError("Payment not successful", 400));

      const thePay = (
        await db.query("SELECT * FROM pay WHERE payment_id =?", [
          response.data.id,
        ])
      )[0][0];
      if (thePay) return next(new AppError("Invalid or used payment ID", 400)); // TODO: Make sure you uncomment this comment.

      // ======= SAVE TO DATABASE ======= //
    } catch (error) {
      return next(new AppError(error.message || error, 400));
    }
    await clearCartFn(req, next);

    const newTotal = discount
      ? calculateAmount(response.data.amount, discount.percentage_discounted)
      : response.data.amount;
    // create order
    const order_id = (
      await db.query("INSERT INTO orders SET ?", {
        user_id: req.user.id,
        currency: response.data.currency,
        order_id: response.data.orderId,
        transaction_id: response.data.id,
        channel: response.data.channel,
        time: response.data.createdAt,
        total: newTotal,
        status: "Processing",
      })
    )[0].insertId;

    const payID = (
      await db.query("INSERT INTO pay SET ?", {
        payment_id: response.data.id,
        user_id: req.user.id,
      })
    )[0].insertId;

    await earnVoucher(
      req.user.id,
      response.data.amount,
      response.data.currency,
      next
    );
    if (discount_code) {
      await updateRedeemPercentage(discount_code);
    }
    await new Email({ user: req.user }).sendOrderCreateSuccessfully(newTotal);
    await new Email({
      user: {
        email: process.env.ADMIN_EMAIL_FOR_NOTIFICATION,
      },
    }).incomingOrder();
    res.status(200).json({
      status: "success",
      message: "Order submitted successfully!",
      // paymentLink: paymentLink.data.link,
    });
  } else {
    if (method != "flutterwave")
      return next(new AppError("The payment method specified is invalid", 400));

    const { total, currencyCode } = response;

    const currencyCodes = ["NGN", "GHS", "GBP", "USD", "CAD", "EUR"];

    if (!total) return next(new AppError("Total price not passed!", 400));

    if (!currencyCodes.includes(currencyCode)) {
      return next(new AppError("Invalid currency code!", 400));
    }

    // get currently login users cart
    const sql = `SELECT products.*, cart_items.quantity FROM carts JOIN cart_items ON cart_items.cart_id = carts.id JOIN products ON products.id = cart_items.product_id WHERE user_id = ?`;

    const cart = (await db.query(sql, req.user.id))[0];

    if (!(Array.isArray(cart) && cart.length)) {
      return next(
        new AppError("User has no cart that requires check out!", 404)
      );
    }
    const newTotal = discount
      ? calculateAmount(total, discount.percentage_discounted)
      : total;
    const getPrice = (
      code,
      priceNgn,
      priceUs,
      priceUk,
      priceGhana,
      priceCanada,
      priceEur
    ) => {
      if (code === "NGN") return priceNgn;
      if (code === "GHS") return priceGhana;
      if (code === "GBP") return priceUk;
      if (code === "USD") return priceUs;
      if (code === "CAD") return priceCanada;
      if (code === "EUR") return priceEur;
    };

    const order_id = (
      await db.query("INSERT INTO orders SET ?", {
        user_id: req.user.id,
        currency: currencyCode,
        order_id: `flw-${Date.now()}`,
        transaction_id: "flutter",
        channel: "flutter",
        time: Date.now(),
        total: newTotal,
      })
    )[0].insertId;

    // console.log(order_id)
    await clearCartFn(req, next);
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
        priceEur,
      } = cart[i];

      const price = getPrice(
        currencyCode,
        priceNgn,
        priceUs,
        priceUk,
        priceGhana,
        priceCanada,
        priceEur
      );

      await db.query("INSERT INTO order_items SET ?", {
        order_id,
        product_id,
        quantity,
        price,
        currency: currencyCode,
      });
    }

    // GET PAYMENT LINK
    const paymentLink = await getPaymentLink(
      order_id,
      newTotal,
      currencyCode,
      req.user.email,
      req.user.phone,
      req.user.name,
      next
    );

    await earnVoucher(req.user.id, total, currencyCode, next);

    if (discount_code) {
      await updateRedeemPercentage(discount_code);
    }
    await new Email({ email: req.user.email }).sendOrderCreateSuccessfully(
      newTotal
    );
    await new Email({
      email: process.env.ADMIN_EMAIL_FOR_NOTIFICATION,
    }).incomingOrder();
    if (paymentLink) {
      return res.status(200).json({
        status: "success",
        message: "Order submitted successfully!",
        paymentLink: paymentLink.data.link,
      });
    }
    return res.status(400).json({
      status: "failed",
      message: "Error initializing payment",
    });
  }
});

exports.retryPayment = catchAsync(async (req, res, next) => {
  // check if order Id is valid and status is pending
  const order = (
    await db.query("SELECT * FROM orders WHERE id =? AND status =?", [
      req.params.id,
      "Pending",
    ])
  )[0][0];

  if (!order) {
    return next(new AppError("No pending order with that id!", 404));
  }

  // GET PAYMENT LINK
  const paymentLink = await getPaymentLink(
    order.id,
    order.total,
    order.currency,
    req.user.email,
    req.user.phone,
    req.user.name
  );

  res.status(200).json({
    status: "success",
    message: "Order retried with new payment link!",
    paymentLink: paymentLink.data.link,
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = (
    await db.query("SELECT * FROM orders WHERE id = ?", req.params.id)
  )[0][0];

  const products = (
    await db.query(
      "SELECT products.id, title, price, quantity, categories, imageUrl FROM orders JOIN order_items ON order_items.order_id = orders.id JOIN products ON order_items.product_id = products.id WHERE orders.id = ?",
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
  // console.log("user id", req.user.id)
  const orders = (
    await db.query("SELECT * FROM orders WHERE user_id = ?", req.user.id)
  )[0];

  res.status(200).json({
    status: "success",
    orders,
  });
});

// exports.getAllOrdersOfOneUser = catchAsync(async (req, res, next) => {
//   const orders = (
//     await db.query(
//       "SELECT orders.*, name, email, phone, amount FROM orders JOIN users ON orders.user_id = users.id WHERE users.id = ?",
//       req.user.id
//     )
//   )[0];

//   res.status(200).json({
//     status: "success",
//     orders,
//   });
// });

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

  if (process.env.WEBHOOK_SECRET_HASH !== secretHash) {
    return res.status(401).end();
  }

  const payload = req.body;

  const [, , order_id, amount, currency] = payload.txRef.split("-");

  try {
    const response = await flw.Transaction.verify({ id: payload.id });

    if (
      response.status === "success" &&
      response.data.amount === parseFloat(amount) &&
      response.data.currency === currency
    ) {
      await db.query(
        "UPDATE orders SET status = 'Processing' WHERE id = ?",
        order_id
      );
      await updatePayment(order_id, "Completed", currency, amount);

      // ================== GABRIEL CODE STARTS ================ //
      const userResult = await db.query(
        "SELECT id FROM users WHERE email = ?",
        [payload.customer.email]
      );

      // Check if user exists
      const user = userResult[0]; // MariaDB returns a flat array

      if (!user) {
        return next(new AppError("User not found", 404));
      }

      // Call earnVoucher function
      await earnVoucher(user.id, amount, currency, next);

      // ================== GABRIEL CODE ENDS ================ //

      await new Email({
        email: payload.customer.email,
      }).sendPaymentSuccessfulEmail(amount);
    } else {
      await db.query(
        "UPDATE orders SET status = 'Pending' WHERE id = ?",
        order_id
      );
      await updatePayment(order_id, "Failed", currency, amount);

      // Inform the customer their payment was unsuccessful
      await new Email({
        email: payload.customer.email,
      }).sendPaymentFailureEmail(amount);
    }

    // Send the response after all operations are complete
    res.status(200).end();
  } catch (err) {
    console.log(err);

    res.status(500).send({ message: "Internal Server Error" });
  }
});
