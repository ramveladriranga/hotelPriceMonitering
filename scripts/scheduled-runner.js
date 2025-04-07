import { scrapeHotelPrices } from '../controllers/scrapping.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname,'..', 'config', 'userData.json');
console.log(dataPath);
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

async function runScheduledScraping() {
  for (const hotel of data) {
    try {
      console.log(`⏳ Running for: ${hotel.hotelName}`);
      await scrapeHotelPrices(hotel.hotelUrl, hotel.hotelName, hotel.city);
    } catch (err) {
      console.error(`❌ Failed: ${hotel.hotelName}`, err.message);
    }
  }
}

runScheduledScraping();
