import dotenv from 'dotenv';
import express from 'express';
import path from 'path';  
import { scrapeHotelPrices } from './controllers/scraper.js';  
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
//const __dirname = path.resolve(path.dirname(new URL(import.meta.url)).substring(1));

// Middleware to parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the UI page
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'views', 'index.html'));
});

// ✅ Debugging: Log incoming data
app.post('/api/scrape', async (req, res) => {
  console.log("🔥 Received UI Input:", req.body);  // Check if UI sends data

  const { hotelUrl, hotelName, city, dates, threshold } = req.body;

  if (!hotelUrl || !hotelName || !city || !threshold) {
    console.error("❌ Missing Fields:", req.body);
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  console.log(`🚀 Starting the scraper for ${hotelName} in ${city}`);

  try {
    await scrapeHotelPrices(hotelUrl, hotelName, city, threshold);
    res.status(200).json({ message: 'Scraping completed successfully.' });
  } catch (error) {
    console.error('❗ Error during scraping:', error);
    res.status(500).json({ error: 'Failed to scrape hotel data.' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
