const nodemailer = require("nodemailer");
const pug = require("pug");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    console.log(this.to);
    this.url = url;
    this.name = user.name;
    this.from = `Foodsbymomi <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV !== "development") {
      return nodemailer.createTransport({
        pool: true,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      pool: true,
      secure: true,
      logger: true, // Enable logging
      debug: true, // Enable debug output
      host: process.env.TEST_EMAIL_HOST,
      port: process.env.TEST_EMAIL_PORT,
      auth: {
        user: process.env.TEST_EMAIL_USER,
        pass: process.env.TEST_EMAIL_PASSWORD,
      },
    });
  }

  // send actual email
  async send(template, subject, message, amount) {
    try {
      // render html based on a pug template
      const html = pug.renderFile(
        `${__dirname}/../views/mail/${template}.pug`,
        {
          url: this.url,
          title: this.title,
          message: message,
          name: this.name,
          amount,
          subject,
        }
      );

      //define email options
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
      };
      // create a transport and send email
      try {
        await this.newTransport().sendMail(mailOptions);
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the foodbymomi family");
  }

  async sendPasswordReset() {
    await this.send(
      "password-reset",
      "Your password reset token (valid for only 10 minutes)"
    );
  }

  async sendEmailToWaitlist(message) {
    await this.send(
      "waitlist-email",
      "Good News for Waitlist Members!",
      message
    );
  }

  async sendPaymentFailureEmail(amount) {
    await this.send("payment-failure", "Payment Failure!", null, amount);
  }

  async sendPaymentSuccessfulEmail(amount) {
    await this.send("payment-success", "Payment Successful!", null, amount);
  }
  async sendOrderCreateSuccessfully(amount) {
    try {
      await this.send("order-success", "Order Successful!", null, amount);
    } catch (e) {
      console.log(e);
    }
  }
  async incomingOrder() {
    try {
      await this.send(
        "incoming-order",
        "Incoming Order",
        "You have an incoming order.",
        null
      );
    } catch (e) {
      console.log(e);
    }
  }
};
