# 🏨 Hotel Price Monitoring

## 📁 Project Overview

This project monitors hotel prices from Booking.com using **Playwright** and sends alerts when:
- A **competitor hotel** is cheaper (⛔️)
- Your hotel is **cheaper beyond a defined threshold** (⚠️)

The app supports:
- **UI-based execution** (manual run via form)
- **Automated scheduled runs** (using PM2 + cron)

---

## 📂 Folder Structure

```
HOTEL-PRICE-MONITORING/
│
├── config/                   # Configuration files
│   ├── settings.js           # Global settings (e.g., Excel path, threshold)
│   └── userData.json         # Input hotels for UI-based scraping
│
├── controllers/              # Core scraping logic and utilities
│   ├── alert.js              # Alert system (e.g., WhatsApp via Twilio)
│   ├── scrapeFast.js         # Alternative scraping logic (if needed)
│   ├── scraper.js            # Main Playwright scraping controller
│   ├── scraperHeadless.js    # Headless mode scraping (optional)
│   ├── scrapping.js          # Possibly deprecated or utility
│   └── data/videos/          # Folder to store Playwright session videos
│
├── data/                     # Excel output and scraped results
│
├── scripts/                  # Execution entry points
│   ├── schedule.js           # PM2 cron job config (optional if you used CLI)
│   └── scheduled-runner.js   # Reads JSON and starts scraping (used by PM2)
│
├── routes/                   # API/backend routes
│   └── index.js              # Route handler (likely POST for triggering)
│
├── views/                    # Frontend
│   └── index.html            # UI to manually enter scraping details
│
├── server.js                 # Backend server entry point (Node.js)
├── .env                      # Environment variables (Twilio keys, etc.)
├── package.json              # Project dependencies
```

---

## 🧐 How It Works

### Option 1: ✅ **Manual Scraping via UI**

1. Start the Node.js server:

```bash
node server.js
```

2. Open your browser:
```
http://localhost:3000/
```

3. Enter hotel details:
   - Hotel Name
   - City
   - Booking.com Search URL

4. The server:
   - Reads inputs from UI
   - Invokes `scraper.js`
   - Stores results in Excel (inside `data/`)
   - Displays alerts in console

---

### Option 2: 🔄 **Automated Scheduled Scraping with PM2**

1. Add hotel data to:

```bash
/config/userData.json
```

> Format:
```json
[
  {
    "hotelName": "Hôtel de la Poste Martigny - City Center",
    "city": "Martigny-Ville",
    "hotelUrl": "[https://www.booking.com/searchresults.html](https://www.booking.com/searchresults.html?ss=${city})"
  }
]
```

2. Run the scheduler via PM2:

```bash
pm2 start scripts/scheduled-runner.js --name hotel-scheduler --cron "0 9,15,21 * * *"
pm2 save
```

This will:
- Run the scraping **3 times daily** (9AM, 3PM, 9PM)
- Load hotels from `userData.json`
- Write results into the Excel file configured in `settings.js`

3. [Optional – Windows] If using Windows:
```bash
npm install -g pm2-windows-startup
pm2-startup install
```

---

## ⚙️ Configuration

Edit the values inside:

```js
config/settings.js
```

| Setting         | Description                                      |
|----------------|--------------------------------------------------|
| `excelFilePath` | Full path to Excel file for output              |
| `threshold`     | Amount by which your price must be lower to alert (⚠️) |

---

## 📦 Dependencies

Install all dependencies:

```bash
npm install
```

Required packages include:
- `playwright`
- `exceljs`
- `pm2`
- `twilio` (if using alerts)

---

## ✅ Usage Commands

| Action                         | Command |
|-------------------------------|---------|
| Start UI Server               | `node server.js` |
| Start Scheduled Runner Once   | `node scripts/scheduled-runner.js` |
| Add Cron Run with PM2         | `pm2 start scripts/scheduled-runner.js --name hotel-scheduler --cron "0 9,15,21 * * *"` |
| Save PM2 Process              | `pm2 save` |
| View PM2 Processes            | `pm2 list` |
| Stop All PM2 Tasks            | `pm2 stop all` |
| Delete All PM2 Tasks          | `pm2 delete all` |
| Restart PM2                   | `pm2 restart all` |

---

## 📌 Future Enhancements

- Add a dashboard for price trend visualization 📈
- Export alerts to email or WhatsApp 📲
- Include multiple date ranges from UI
- Add hotel comparison chart to the UI

