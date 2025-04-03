const { chromium } = require('playwright');
const axios = require('axios');
const querystring = require('querystring');

const BOT_API_KEY = 'YOUR_TELEGRAM_BOT_API_KEY'; // Replace with your bot API key
const CHANNEL_NAME = 'YOUR_CHANNEL_NAME'; // Replace with your channel name or chat ID
const BOOKING_URL = 'https://www.booking.com'; // Base URL

// Function to create a search URL
async function createUrl({ people, country, city, date_in, date_out, rooms, score_filter }) {
    let url = `${BOOKING_URL}/searchresults.en-gb.html?selected_currency=USD&checkin_month=${date_in.getMonth() + 1}&checkin_monthday=${date_in.getDate()}&checkin_year=${date_in.getFullYear()}&checkout_month=${date_out.getMonth() + 1}&checkout_monthday=${date_out.getDate()}&checkout_year=${date_out.getFullYear()}&group_adults=${people}&group_children=0&order=price&ss=${encodeURIComponent(city + ', ' + country)}&no_rooms=${rooms}`;

    if (score_filter) {
        const scores = { '9+': '90', '8+': '80', '7+': '70', '6+': '60' };
        if (scores[score_filter]) url += `&nflt=review_score%3D${scores[score_filter]}%3B`;
    }
    return url;
}

// Function to scrape hotel data
async function getHotels(searchParams) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const url = await createUrl(searchParams);

    await page.goto(url, { waitUntil: 'load' });

    const hotels = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".sr_property_block")).map(hotel => ({
            name: hotel.querySelector(".sr-hotel__name")?.innerText.trim() || '',
            score: hotel.querySelector(".bui-review-score__badge")?.innerText.trim() || '',
            price: hotel.querySelector(".bui-price-display__value")?.innerText.trim() || '',
            link: hotel.querySelector(".txp-cta a")?.href || ''
        }));
    });

    await browser.close();
    return hotels;
}

// Function to send a message using Telegram
async function sendMessage(text) {
    const url = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage?parse_mode=HTML&chat_id=${CHANNEL_NAME}&text=${querystring.escape(text)}`;
    await axios.get(url);
}

// Main function to notify users with search results
async function notifyHotels(searchParams) {
    try {
        const hotels = await getHotels(searchParams);

        await sendMessage(`Here are your search results for ${searchParams.people} people, ${searchParams.rooms} rooms in ${searchParams.city}, ${searchParams.country} from ${searchParams.date_in.toDateString()} to ${searchParams.date_out.toDateString()} with a ${searchParams.score_filter || 'any'} rating.`);

        for (const hotel of hotels) {
            await sendMessage(`<a href="${hotel.link}">${hotel.name}</a> (${hotel.score})\nTotal price: ${hotel.price}`);
        }

        console.log("Notifications sent successfully.");
    } catch (error) {
        console.error("Error in notifying hotels:", error.message);
    }
}

// Example usage
const searchParams = {
    people: 2,
    country: 'India',
    city: 'Hyderabad',
    date_in: new Date('2025-04-01'),
    date_out: new Date('2025-04-05'),
    rooms: 1,
    score_filter: '8+'
};

notifyHotels(searchParams);