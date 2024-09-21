const axios = require("axios");
const AppError = require("./appError");

exports.getPaymentLink = async (id, amount, code, email, phonenumber, name, next) => {
  try {

    // ================= GABRIEL CODE STARTS ===================== //
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: `foodsbymomi-tx-${id}-${amount}-${code}-${Date.now()}`,
        amount: amount,
        currency: code,
        redirect_url: "https://foodsbymomi.com/orders",
        customer: {
          email,
          phonenumber,
          name,
        },
        customizations: {
          title: "Foodsbymomi Payments",
          logo: "https://foodsbymomi.com/assets/logoBg-CKQjXhTv.jpeg",
        },
        configurations: {
          session_duration: 10,
          max_retry_attempt: 5,
        },
      }),
      headers: {
        "Authorization": `Bearer ${process.env.FLW_SECRET_KEY}`,
        "Content-Type": "application/json", // Add this to ensure correct content type
      },
    });
  
    const response = await res.json();
  
    if (!res.ok) {
      // Handle specific error messages or statuses from Flutterwave
      return next(new AppError(response.message || "Payment processing error", 400));
    }
  
    return response;
    // ================= GABRIEL CODE IN HERE ==================== //
    
    // const response = await axios.post(
    //   "https://api.flutterwave.com/v3/payments",
    //   {
    //     tx_ref: `foodsbymomi-tx-${id}-${amount}-${code}-${Date.now()}`,
    //     amount: amount,
    //     currency: code,
    //     redirect_url: "https://foodsbymomi.com/orders",
    //     customer: {
    //       email,
    //       phonenumber,
    //       name,
    //     },
    //     customizations: {
    //       title: "Foodsbymomi Payments",
    //       logo: "https://foodsbymomi.com/assets/logoBg-CKQjXhTv.jpeg",
    //     },
    //     configurations: {
    //       session_duration: 10,
    //       max_retry_attempt: 5,
    //     },
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    //     },
    //   }
    // );

    // return response.data;
  } catch (err) {
    console.log({ err });
  }
};
