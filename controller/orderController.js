const Flutterwave = require("flutterwave-node-v3");
const catchAsync = require("../utils/catchAsync");
const db = require("../config/db");
const AppError = require("../utils/appError");
const Email = require("../utils/email");
const { clearCartFn } = require("./cartController");
const { getPaymentLink } = require("../utils/flutterwave");
const { earnVoucher } = require("../utils/general");

const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

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
  // total amount
  // const { total, currencyCode } = req.body;
  
  // const currencyCodes = ["NGN", "GHS", "GBP", "USD", "CAD", "EUR"];
  
  // if (!currencyCodes.includes(currencyCode)) {
    //   return next(new AppError("Invalid currency code!", 400));
    // }
    
    // get currently login users cart
    // const sql = `SELECT products.*, cart_items.quantity FROM carts JOIN cart_items ON cart_items.cart_id = carts.id JOIN products ON products.id = cart_items.product_id WHERE user_id = ?`;
    
    // const cart = (await db.query(sql, req.user.id))[0];
    
    // if (!(Array.isArray(cart) && cart.length)) {
      //   return next(new AppError("User has no cart that requires check out!", 404));
    // }
      


  // const getPrice = (
  //   code,
  //   priceNgn,
  //   priceUs,
  //   priceUk,
  //   priceGhana,
  //   priceCanada,
  //   priceEur
  // ) => {
  //   if (code === "NGN") return priceNgn;
  //   if (code === "GHS") return priceGhana;
  //   if (code === "GBP") return priceUk;
  //   if (code === "USD") return priceUs;
  //   if (code === "CAD") return priceCanada;
  //   if (code === "EUR") return priceEur;
  // };

  // create order items
  // for (let i = 0; i < cart.length; i++) {
  //   const {
  //     id: product_id,
  //     quantity,
  //     priceNgn,
  //     priceUs,
  //     priceUk,
  //     priceGhana,
  //     priceCanada,
  //     priceEur,
  //   } = cart[i];

  //   const price = getPrice(
  //     currencyCode,
  //     priceNgn,
  //     priceUs,
  //     priceUk,
  //     priceGhana,
  //     priceCanada,
  //     priceEur
  //   );

  //   await db.query("INSERT INTO order_items SET ?", {
  //     order_id,
  //     product_id,
  //     quantity,
  //     price,
  //     currency: currencyCode,
  //   });
  // }

  
  // GET PAYMENT LINK
  // const paymentLink = await getPaymentLink(
  //   order_id,
  //   total,
  //   currencyCode,
  //   req.user.email,
  //   req.user.phone,
  //   req.user.name
  // );

  const { response, method } = req.body;
  if(!method || !response) return next(new AppError("Order cannot be created as method or payload is not provided", 400));
  if(method == 'alart_pay'){
    if(response.status !== true || response.data.status !== "completed") return next(new AppError("Order cannot be created as the payment failed", 400));
    
    // ================ VERIFYING PAYMENT ===================== //
    if(!response.data.id) return next(new AppError("No transaction id detected, please add a transaction id to verify your transaction", 400));
    try {
      const res = await fetch(`https://apibox.alatpay.ng/alatpaytransaction/api/v1/transactions/${response.data.id}`);
      if(!res.ok) return next(new AppError("Payment validation failed", 400));
      const responses = await res.json();
      if(responses.status !== true || response.data.status !== "completed" || responses.message !== 'Success') return next(new AppError("Payment not successful", 400));

      const thePay = (
        await db.query("SELECT * FROM pay WHERE payment_id =?", [
          response.data.id,
        ])
      )[0][0];

      if(thePay) return next(new AppError("Invalid or used payment ID", 400));  // TODO: Make sure you uncomment this comment.   

      // ======= SAVE TO DATABASE ======= //
    } catch (error) {
      return next(new AppError(error.message || error, 400));
    }
    
    await clearCartFn(req, next);
    
    // create order
    const order_id = (
      await db.query("INSERT INTO orders SET ?", {
        user_id: req.user.id,
        currency: response.data.currency,
        order_id: response.data.orderId,
        transaction_id: response.data.id,
        channel: response.data.channel,
        time: response.data.createdAt,
        total: response.data.amount,
        status: "Processing"
      })
    )[0].insertId;
    
    const payID = (
      await db.query("INSERT INTO pay SET ?", {
        payment_id: response.data.id,
        user_id: req.user.id
      })
    )[0].insertId;

    await earnVoucher(req.user.id, response.data.amount);
    
    res.status(200).json({
      status: "success",
      message: "Order submitted successfully!",
      // paymentLink: paymentLink.data.link,
    });
  } else if(method == "voucher"){
    const { total, currencyCode } = response;

    const user = (await db.query("SELECT * FROM users WHERE id = ?", req.user.id))[0][0];
    if(user.voucher < amount) next(new AppError("Voucher credit is not enough to process your order", 400));

    const currencyCodes = ["NGN", "GHS", "GBP", "USD", "CAD", "EUR"];
    
    if (!currencyCodes.includes(currencyCode)) {
        return next(new AppError("Invalid currency code!", 400));
      }
      
      // get currently login users cart
      const sql = `SELECT products.*, cart_items.quantity FROM carts JOIN cart_items ON cart_items.cart_id = carts.id JOIN products ON products.id = cart_items.product_id WHERE user_id = ?`;
      
      const cart = (await db.query(sql, req.user.id))[0];
      
      if (!(Array.isArray(cart) && cart.length)) {
          return next(new AppError("User has no cart that requires check out!", 404));
      }
        


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

    await clearCartFn(req, next);
    const remainingBalance = user.voucher - amount;
    const payment = (await db.query("UPDATE users SET voucher = ? WHERE id = ?", [remainingBalance, user.id]));
    const order_id = (
      await db.query("INSERT INTO orders SET ?", {
        user_id: req.user.id,
        currency: currencyCode,
        order_id: `flw-${Date.now()}`,
        transaction_id: "flutter",
        channel: "flutter",
        time: Date.now(),
        total: total,
      })
    )[0].insertId;

    // console.log(order_id)
    
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

      // GET PAYMENT WITH VOUCHER
      
    
    // console.log("order_id", order_id);
    res.status(200).json({
      status: "success",
      message: "Order submitted successfully!",
      paymentLink: paymentLink.data.link,
    });
  } else {
    if(method != "flutterwave") return next(new AppError('The payment method specified is invalid', 400));

    const { total, currencyCode } = response;

    const currencyCodes = ["NGN", "GHS", "GBP", "USD", "CAD", "EUR"];
  
  if (!currencyCodes.includes(currencyCode)) {
      return next(new AppError("Invalid currency code!", 400));
    }
    
    // get currently login users cart
    const sql = `SELECT products.*, cart_items.quantity FROM carts JOIN cart_items ON cart_items.cart_id = carts.id JOIN products ON products.id = cart_items.product_id WHERE user_id = ?`;
    
    const cart = (await db.query(sql, req.user.id))[0];
    
    if (!(Array.isArray(cart) && cart.length)) {
        return next(new AppError("User has no cart that requires check out!", 404));
    }
      


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

  
  // const order_id = (
  //   await db.query("INSERT INTO orders SET ?", { 
  //     user_id: req.user.id,
  //     currency: currencyCode,
  //     order_id: `flw-${Date.now()}`,
  //     transaction_id: "flutter",
  //     channel: "flutter",
  //     time: Date.now(),
  //     amount: total,
  //     status: "Pending"
  //   })
  // )[0].insertId;
  
  // // create order items
  // for (let i = 0; i < cart.length; i++) {
  //   const {
  //     id: product_id,
  //     quantity,
  //     priceNgn,
  //     priceUs,
  //     priceUk,
  //     priceGhana,
  //     priceCanada,
  //     priceEur,
  //   } = cart[i];

  //   const price = getPrice(
  //     currencyCode,
  //     priceNgn,
  //     priceUs,
  //     priceUk,
  //     priceGhana,
  //     priceCanada,
  //     priceEur
  //   );

  //   await db.query("INSERT INTO order_items SET ?", {
  //     order_id,
  //     product_id,
  //     quantity,
  //     price,
  //     currency: currencyCode,
  //   });
  // }

  await clearCartFn(req, next);

  const order_id = (
    await db.query("INSERT INTO orders SET ?", {
      user_id: req.user.id,
      currency: currencyCode,
      order_id: `flw-${Date.now()}`,
      transaction_id: "flutter",
      channel: "flutter",
      time: Date.now(),
      total: total,
    })
  )[0].insertId;

  // console.log(order_id)
   
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
      total,
      currencyCode,
      req.user.email,
      req.user.phone,
      req.user.name
    );
  
  console.log("order_id", order_id);
  res.status(200).json({
    status: "success",
    message: "Order submitted successfully!",
    paymentLink: paymentLink.data.link,
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
    await db.query(
      "SELECT * FROM orders WHERE user_id = ?",
      req.user.id
    )
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
      await db.query("UPDATE orders SET status = 'Processing' WHERE id = ?", order_id);
      await updatePayment(order_id, "Completed", currency, amount);

      // ================== GABRIEL CODE STARTS ================ //
      const foundUser = (await db.query("SELECT * FROM users WHERE email = ?", payload.customer.email))[0][0];
      await earnVoucher(foundUser.id, amount);
      // ================== GABRIEL CODE ENDS ================ //

      await new Email({ email: payload.customer.email }).sendPaymentSuccessfulEmail(
        amount
      );
    } else {
      await db.query("UPDATE orders SET status = 'Pending' WHERE id = ?", order_id);
      await updatePayment(order_id, "Failed", currency, amount);

      // Inform the customer their payment was unsuccessful
      await new Email({ email: payload.customer.email }).sendPaymentFailureEmail(amount);
    }

    // Send the response after all operations are complete
    res.status(200).end();
  } catch (err) {
    console.log(err);

    res.status(500).send({ message: "Internal Server Error" });
  }
});
