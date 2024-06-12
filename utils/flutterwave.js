const FlutterWave = require("flutterwave-node-v3");

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
    const { got } = await import("got");

    const response = await got
      .post("https://api.flutterwave.com/v3/payments", {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
        json: {
          tx_ref: `foodsbymomi-tx-${id}-${amount}-${code}-${Date.now()}`,
          amount: amount,
          currency: code,
          redirect_url: "https://google.com",
          customer: {
            email,
            phonenumber,
            name,
          },
          customizations: {
            title: "Foodsbymomi Payments",
            logo: "http://www.piedpiper.com/app/themes/joystick-v27/images/logo.png",
          },
        },
      })
      .json();

    return response;
  } catch (err) {
    console.log({ err });
  }
};
