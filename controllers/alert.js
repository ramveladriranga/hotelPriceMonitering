const twilio = require('twilio');
const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

function sendAlert(message, toPhoneNumber) {
  if (process.env.TEST_MODE === 'true') {
    console.log(`[TEST MODE] Message to ${phoneNumber}: ${message}`);
  } else {
    client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })
    .then(() => console.log(`✅ Message sent: ${message}`))
    .catch(error => console.error('❗ Failed to send message:', error.message));
  }
}

module.exports = { sendAlert };