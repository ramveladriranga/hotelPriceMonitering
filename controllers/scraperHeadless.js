const playwright = require('playwright');
const ExcelJS = require('exceljs');
const { excelFilePath, threshold } = require('../config/settings');
const { createWriteStream } = require('fs');
const { join } = require('path');
const fs = require('fs');

// Ensure video directory exists
const videoDir = join(__dirname, 'videos');
if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir);
    console.log(`Video directory created: ${videoDir}`);
}

// Generate all dates for the next 6 months (180 days)
function generateDatesForNext6Months() {
    console.log("Generating dates for the next 6 months...");
    const dates = [];
    const currentDate = new Date();

    for (let i = 0; i < 180; i++) {
        const checkInDate = new Date(currentDate);
        checkInDate.setDate(currentDate.getDate() + i);

        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkInDate.getDate() + 1);

        dates.push({
            checkIn: formatDateToUrl(checkInDate),
            checkOut: formatDateToUrl(checkOutDate),
            displayDate: checkInDate.toLocaleDateString()
        });
    }
    console.log(`Dates generated: ${dates.length} entries.`);
    return dates;
}

// Format dates for URL (yyyy-mm-dd)
function formatDateToUrl(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Scrape hotel prices using Playwright
async function scrapeHotelPrices() {
    console.log("Starting hotel price scraping process...");

    const hotelName = 'Hôtel de la Poste Martigny - City Center';
    const city = 'Martigny-Ville';
    const hotelUrl = 'https://www.booking.com/searchresults.html?ss=Martigny-Ville';

    const dates = generateDatesForNext6Months();
    console.log(`Generated ${dates.length} date ranges for scraping.`);

    const browser = await playwright.chromium.launch({ headless: true });
    console.log("Browser launched in headless mode.");

    const context = await browser.newContext({
        recordVideo: { dir: videoDir },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
    });
    console.log("Browser context created with video recording enabled.");

    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log("Page viewport size set to 1280x800.");

    for (const date of dates) {
        const { checkIn, checkOut, displayDate } = date;

        for (let adults = 1; adults <= 4; adults++) {
            console.log(`Processing date range: Check-in: ${checkIn}, Check-out: ${checkOut}, Adults: ${adults}`);

            try {
                const modifiedUrl = `${hotelUrl}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${adults}`;
                console.log(`Navigating to URL: ${modifiedUrl}`);

                await page.goto(modifiedUrl);
                await page.waitForLoadState('networkidle');

                // Clear and fill the location
                await page.fill('//input[@placeholder="Where are you going?"]', city);
                await page.keyboard.press('Enter');

                // Wait for navigation to complete before setting dates
                await page.waitForLoadState('networkidle');

                // Set check-in and check-out dates
                await page.waitForLoadState('domcontentloaded');
                await setCheckInOutDates(page, checkIn, checkOut);

                // Wait for a moment to let the page react to the new dates
                await page.waitForTimeout(2000);

                // Click the search button
                await page.locator('//button[@type="submit"]/span').click();

                // Wait for the prices to load
                await page.waitForSelector('span[data-testid="price-and-discounted-price"]');

                // Extract price data
                console.log("Extracting price data...");
                const prices = await page.$$eval('span[data-testid="price-and-discounted-price"]', elements =>
                    elements.map(el => parseFloat(el.textContent.replace(/[^0-9.]/g, '')))
                );

                if (prices.length === 0) {
                    console.warn(`No price data found for ${displayDate} with ${adults} adults.`);
                    continue;
                }

                // Process price data
                const myHotelPrice = prices[0];
                const minCompetitorPrice = Math.min(...prices);
                console.log(`Extracted prices - My Hotel Price: $${myHotelPrice}, Competitor Price: $${minCompetitorPrice}`);

                let alertMessage;
                if (myHotelPrice > minCompetitorPrice) {
                    alertMessage = `⛔️ Competitor is cheaper on ${displayDate} for ${adults} adults.`;
                    console.warn(alertMessage);
                } else if (myHotelPrice < minCompetitorPrice - threshold) {
                    alertMessage = `⚠️ You are cheaper by more than the threshold (${threshold}) on ${displayDate} for ${adults} adults.`;
                    console.warn(alertMessage);
                }

                // Save data to Excel
                await saveToExcel(hotelName, city, myHotelPrice, minCompetitorPrice, checkIn, checkOut, adults, alertMessage);

            } catch (error) {
                console.error(`Error processing date range (${displayDate}, Adults: ${adults}):`, error.message);
            }
        }
    }

    await browser.close();
    console.log("Browser closed. Scraping process completed.");
}

async function setCheckInOutDates(page, checkIn, checkOut) {
    console.log(`Setting check-in date to: ${checkIn}, check-out date to: ${checkOut}`);

    await page.evaluate(({ checkInDate, checkOutDate }) => {
        // Helper function to set the date in the input field
        function setInputValue(selector, date) {
            const element = document.querySelector(selector);
            if (element) {
                element.value = date;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.error(`Element with selector ${selector} not found.`);
            }
        }

        // Set check-in date
        setInputValue('//input[@name="checkin"]', checkInDate);

        // Set check-out date
        setInputValue('//input[@name="checkout"]', checkOutDate);

        // Trigger change event on both inputs
        const checkinInput = document.querySelector('//input[@name="checkin"]');
        if (checkinInput) {
            checkinInput.dispatchEvent(new Event('change', { 'bubbles': true }));
        }

        const checkoutInput = document.querySelector('//input[@name="checkout"]');
        if (checkoutInput) {
            checkoutInput.dispatchEvent(new Event('change', { 'bubbles': true }));
        }

    }, { checkInDate: checkIn, checkOutDate: checkOut });
}


// Save data to Excel
async function saveToExcel(hotelName, city, myPrice, competitorPrice, checkInDate, checkOutDate, adults, alert) {
    try {
        console.log("Saving data to Excel...");
        const workbook = new ExcelJS.Workbook();
        let sheet;

        try {
            await workbook.xlsx.readFile(excelFilePath);
            sheet = workbook.getWorksheet('Prices');
            console.log("Excel file loaded successfully.");
        } catch {
            sheet = workbook.addWorksheet('Prices');
            sheet.columns = [
                { header: 'Hotel Name', key: 'hotelName', width: 30 },
                { header: 'City', key: 'city', width: 20 },
                { header: 'My Price', key: 'myPrice', width: 15 },
                { header: 'Competitor Price', key: 'competitorPrice', width: 20 },
                { header: 'Check-In Date', key: 'checkInDate', width: 20 },
                { header: 'Check-Out Date', key: 'checkOutDate', width: 20 },
                { header: 'Adults', key: 'adults', width: 10 },
                { header: 'Alert', key: 'alert', width: 50 },
            ];
            console.log("New worksheet created.");
        }

        sheet.addRow({
            hotelName,
            city,
            myPrice,
            competitorPrice,
            checkInDate,
            checkOutDate,
            adults,
            alert,
        });

        await workbook.xlsx.writeFile(excelFilePath);
        console.log(`Data saved to Excel for Check-in Date ${checkInDate}, Adults ${adults}.`);
    } catch (error) {
        console.error(`Error saving data to Excel for Check-in Date ${checkInDate}:`, error.message);
    }
}

// Start scraping
scrapeHotelPrices();
