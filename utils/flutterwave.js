const axios = require("axios");

exports.getPaymentLink = async (id, amount, code, email, phonenumber, name) => {
  try {
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: `foodsbymomi-tx-${id}-${amount}-${code}-${Date.now()}`,
        amount: amount,
        currency: code,
        redirect_url: "https://google.com", //TODO
        customer: {
          email,
          phonenumber,
          name,
        },
        customizations: {
          title: "Foodsbymomi Payments",
          logo: "http://www.piedpiper.com/app/themes/joystick-v27/images/logo.png", //TODO
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
