// const cron = require('node-cron');
// const { scrapeHotelPrices } = require('../controllers/scraper');
// const { runScraper } = require('../controllers/scraper');
// // cron.schedule('0 21 * * *', () => {
// //   console.log('Running scheduled scrape at 9 PM...');
// //   scrapeHotelPrices('https://example.com/hotel', 'My Hotel', 'New York');
// // });

// console.log('Running scraper now...');
// runScraper()
//   .then(() => {
//     console.log('✅ Scraper finished running.');
//   })
//   .catch(error => {
//     console.error('❗ Error during scraping:', error);
//   });

const { scrapeHotelPrices } = require('../controllers/scraper');

// Example values for testing (you can adjust these)
const hotelUrl = 'https://www.booking.com/hotel/in/ibis-delhi-airport.html'; 
const hotelName = 'ibis-delhi-airport';
const city = 'New Delhi';

console.log('Running scraper now...');
scrapeHotelPrices(hotelUrl, hotelName, city)
  .then(() => {
    console.log('✅ Scraper finished running.');
  })
  .catch(error => {
    console.error('❗ Error during scraping:', error);
  });
