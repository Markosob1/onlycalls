const twilio = require('twilio');

// Убедитесь, что в .env заданы TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN и TWILIO_PHONE_NUMBER
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSMS(to, body) {
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    console.log("SMS sent, SID:", message.sid);
    return message;
  } catch (error) {
    console.error("Ошибка при отправке SMS:", error);
    throw error;
  }
}

module.exports = sendSMS;
