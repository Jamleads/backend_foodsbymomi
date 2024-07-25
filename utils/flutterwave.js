const axios = require("axios");

exports.getPaymentLink = async (id, amount, code, email, phonenumber, name) => {
  try {
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
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
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (err) {
    console.log({ err });
  }
};
