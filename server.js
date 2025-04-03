import dotenv from 'dotenv';
import express from 'express';
import path from 'path';  // Import the 'path' module
import { scrapeHotelPrices } from './controllers/scraper.js';  // Ensure correct extension
import bodyParser from 'body-parser';  // For parsing incoming request bodies

dotenv.config();

const app = express();

// Get __dirname equivalent in ES modules
const __dirname = path.resolve(path.dirname(new URL(import.meta.url).pathname).substring(1));

// Middleware to parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (like CSS and images) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file when navigating to the root URL
app.get('/', (req, res) => {
  const indexPath = path.resolve(__dirname, 'views', 'index.html');
  res.sendFile(indexPath);  // Send the HTML file
});

// Handle the form submission and start scraping
app.post('/api/scrape', async (req, res) => {
  const { hotelUrl, hotelName, city, dates, threshold } = req.body;

  // Validation for required fields
  if (!hotelUrl || !hotelName || !city || !dates || !threshold) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  console.log(`🚀 Starting the scraper for ${hotelName} in ${city}`);

  try {
    // Invoke the scraping function with the provided data
    await scrapeHotelPrices(hotelUrl, hotelName, city, dates, threshold);
    res.status(200).json({ message: 'Scraping completed successfully.' });
  } catch (error) {
    console.error('❗ Error during scraping:', error);
    res.status(500).json({ error: 'Failed to scrape hotel data.' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
