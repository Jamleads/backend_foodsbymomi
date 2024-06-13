const FlutterWave = require("flutterwave-node-v3");
const axios = require("axios");

const flw = new FlutterWave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

exports.verifyTransaction = (id) => {
  flw.Transaction.verify({ id })
    .then((response) => {
      const tx = response.tx_ref;
      const [, , , expectedAmount, expectedCurrency] = tx.split("-");

      if (
        response.data.status === "successful" &&
        response.data.amount === Number(expectedAmount) &&
        response.data.currency === expectedCurrency
      ) {
        return true;
      }

      return false;
    })
    .catch(console.log);
};

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
