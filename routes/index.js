import express from 'express';
import fs from 'fs';

const router = express.Router();

router.get('/', (req, res) => {
  const html = fs.readFileSync('./views/index.html', 'utf8');
  res.send(html);
});

router.post('/submit', (req, res) => {
  const { hotelName, city, dates, threshold } = req.body;
  const userData = { hotelName, city, dates: dates.split(','), threshold: parseFloat(threshold) };
  fs.writeFileSync('./config/userData.json', JSON.stringify(userData, null, 2));
  res.send('Data submitted successfully!');
});

// Use the ES Module export syntax
export default router;
