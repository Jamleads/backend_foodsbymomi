const nodemailer = require("nodemailer");
const pug = require("pug");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.url = url;
    this.from = `Foodsbymomi <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    //  TODO
    // if (process.env.NODE_ENV !== "development") {
    //   return nodemailer.createTransport({
    //     host: ,
    //     port: ,
    //     auth: {
    //       user: ,
    //       pass: ,
    //     },
    //   });
    // }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // send actual email
  async send(template, subject) {
    // render html based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/mail/${template}.pug`, {
      url: this.url,
      title: this.title,
      subject,
    });

    //define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
    };

    // create a transport and send email
    await this.newTransport().sendMail(mailOptions);
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
};
