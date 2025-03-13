const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
  try {
    let testAccount = await nodemailer.createTestAccount();
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    let info = await transporter.sendMail({
      from: '"OnlyCalls" <noreply@onlycalls.com>',
      to: to,
      subject: subject,
      text: text
    });
    console.log("Email sent:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Ошибка отправки email:", error);
  }
}

module.exports = sendEmail;
