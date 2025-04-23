import playwright from 'playwright';
import ExcelJS from 'exceljs';
import { excelFilePath, threshold } from '../config/settings.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { sendWhatsAppAlert } from './alert.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, 'videos');
if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
    console.log(`Video directory created: ${videoDir}`);
}

function generateDatesForNext6Months() {
    const dates = [];
    const currentDate = new Date();
    for (let i = 0; i < 180; i++) {
        const checkInDate = new Date(currentDate);
        checkInDate.setDate(currentDate.getDate() + i);
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkInDate.getDate() + 1);
        dates.push({
            checkIn: checkInDate.toISOString().split('T')[0],
            checkOut: checkOutDate.toISOString().split('T')[0],
            displayDate: checkInDate.toLocaleDateString()
        });
    }
    return dates;
}

async function scrapeHotelPrices(hotelUrl, hotelName, city, excludedHotels) {
    console.log("Starting hotel price scraping process...");
    // hotelName = 'Hôtel de la Poste Martigny - City Center';
    // city = 'Martigny-Ville';
    //hotelUrl = `https://www.booking.com/searchresults.html?ss=${city}`;
    hotelUrl = `${hotelUrl}?ss=${city}`;
    const dates = generateDatesForNext6Months();

    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
        recordVideo: { dir: videoDir },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    for (const date of dates) {
        for (let adults = 1; adults <= 4; adults++) {
            try {
                const modifiedUrl = `${hotelUrl}&checkin=${date.checkIn}&checkout=${date.checkOut}&group_adults=${adults}`;
                await page.goto(modifiedUrl, { waitUntil: 'load' });
                await page.waitForLoadState('networkidle');
                await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
                const text = await page.locator('//h1[@aria-live="assertive"]').textContent();
                const match = text.match(/\d+/);
                const maxHotels = match ? parseInt(match[0], 10) : 0;
                const hotelData = await page.evaluate((maxHotels) => {
                    return Array.from(document.querySelectorAll('[data-testid="property-card"]'))
                        .slice(0, maxHotels) // Dynamically limit hotels based on extracted number
                        .map(card => {
                            const nameElement = card.querySelector('[data-testid="title"]');
                            const priceElement = card.querySelector('[data-testid="price-and-discounted-price"]');
                            return {
                                name: nameElement ? nameElement.innerText.trim() : 'Unknown',
                                price: priceElement ? parseFloat(priceElement.innerText.replace(/[^0-9.]/g, '')) : null
                            };
                        }).filter(hotel => hotel.price !== null);
                }, maxHotels);

                if (!hotelData.length) continue;

                const excludeList = excludedHotels.map(h => h.trim().toLowerCase());
                const myHotel = hotelData.find(h => h.name.includes(hotelName));
                const validCompetitors = hotelData.filter(h =>
                    h.name !== hotelName &&
                    !excludeList.includes(h.name.toLowerCase())
                );
                const competitorPrices = validCompetitors.map(h => h.price);

                if (!myHotel || competitorPrices.length === 0) continue;

                const myHotelPrice = myHotel.price;
                const minCompetitorPrice = Math.min(...competitorPrices);
                let alertMessage = '';
                // ✅ Check if this date is today
                const isToday = new Date(date.checkIn).toDateString() === new Date().toDateString();

                if (myHotelPrice > minCompetitorPrice) {
                    alertMessage = `⛔️ Competitor is cheaper on ${date.displayDate} for ${adults} adults.`;
                    console.log(alertMessage);
                    if (isToday) await sendWhatsAppAlert(alertMessage);
                } else if (myHotelPrice < minCompetitorPrice - threshold) {
                    alertMessage = `⚠️ You are cheaper by more than the threshold (${threshold}) on ${date.displayDate} for ${adults} adults.`;
                    console.log(alertMessage);
                    if (isToday) await sendWhatsAppAlert(alertMessage);
                }

                await saveToExcel(hotelName, city, myHotelPrice, minCompetitorPrice, date.checkIn, date.checkOut, adults, alertMessage);
            } catch (error) {
                console.error(`Error processing Check-in ${date.checkIn} for ${adults} adults:`, error.message);
            }
        }
    }
    await browser.close();
    console.log("Scraping process completed.");
}

// Make sure to load the Excel workbook outside the loop and save it only once after adding rows
async function saveToExcel(hotelName, city, myPrice, competitorPrice, checkInDate, checkOutDate, adults, alert) {
    try {
        const workbook = new ExcelJS.Workbook();
        const excelDir = join(excelFilePath, '..');

        // Ensure the directory exists
        if (!fs.existsSync(excelDir)) {
            fs.mkdirSync(excelDir, { recursive: true });
        }

        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const sheetName = `Prices_${today}`;
        let sheet;

        try {
            // Try reading the existing Excel file
            await workbook.xlsx.readFile(excelFilePath);
            sheet = workbook.getWorksheet(sheetName);

            if (!sheet) {
                // Create a new sheet if it doesn't exist
                sheet = workbook.addWorksheet(sheetName);
                sheet.columns = [
                    { header: 'Hotel Name', key: 'hotelName', width: 30 },
                    { header: 'City', key: 'city', width: 20 },
                    { header: 'My Price', key: 'myPrice', width: 15 },
                    { header: 'Competitor Min Price', key: 'competitorPrice', width: 20 },
                    { header: 'Check-In Date', key: 'checkInDate', width: 20 },
                    { header: 'Check-Out Date', key: 'checkOutDate', width: 20 },
                    { header: 'Adults', key: 'adults', width: 10 },
                    { header: 'Alert', key: 'alert', width: 50 },
                ];
            }
        } catch (error) {
            // If file doesn't exist, create a new workbook and sheet
            sheet = workbook.addWorksheet(sheetName);
            sheet.columns = [
                { header: 'Hotel Name', key: 'hotelName', width: 30 },
                { header: 'City', key: 'city', width: 20 },
                { header: 'My Price', key: 'myPrice', width: 15 },
                { header: 'Competitor Min Price', key: 'competitorPrice', width: 20 },
                { header: 'Check-In Date', key: 'checkInDate', width: 20 },
                { header: 'Check-Out Date', key: 'checkOutDate', width: 20 },
                { header: 'Adults', key: 'adults', width: 10 },
                { header: 'Alert', key: 'alert', width: 50 },
            ];
        }

        // Get the next available row (start from 2 to keep headers intact)
        const nextRow = sheet.rowCount + 1;

        // Append new row at the correct position
        sheet.getRow(nextRow).values = [hotelName, city, myPrice, competitorPrice, checkInDate, checkOutDate, adults, alert];

        // Save the updated workbook to the file
        await workbook.xlsx.writeFile(excelFilePath);
    } catch (error) {
        console.error(`Error saving data to Excel: ${error.message}`);
    }
}



scrapeHotelPrices();
export { scrapeHotelPrices };