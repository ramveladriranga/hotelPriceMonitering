import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Function to send WhatsApp alert
export async function sendWhatsAppAlert(message) {
  const toPhone = process.env.TWILIO_TO_PHONE_NUMBER;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!toPhone || !fromPhone) {
    console.error('❗ Twilio phone numbers are not defined in environment variables.');
    return;
  }

  if (process.env.TEST_MODE === 'true') {
    console.log(`[TEST MODE] Message to ${toPhone}: ${message}`);
  } else {
    try {
      await client.messages.create({
        body: message,
        from: fromPhone,
        to: toPhone,
      });
      console.log(`✅ WhatsApp message sent to ${toPhone}: ${message}`);
    } catch (error) {
      console.error('❗ Failed to send WhatsApp message:', error.message);
    }
  }
}
