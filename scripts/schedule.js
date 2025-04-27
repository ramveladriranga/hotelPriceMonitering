import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Needed because you are using ES modules (no __dirname natively)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct path to your scheduled-runner.js
const scriptPath = path.join(__dirname, 'scheduled-runner.js');

// Your cron timings
//const schedule = ['0 9 * * *', '0 15 * * *', '0 21 * * *'];
const schedule = ['18 0-23 * * *']; // Every hour at 49th minute

// Setting up each cron job
schedule.forEach(cronTime => {
  cron.schedule(cronTime, () => {
    console.log(`🕘 Running scheduled-runner.js at ${new Date().toLocaleString()} (${cronTime})`);

    // Now spawn a new process to run scheduled-runner.js
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit', // SUPER important so you SEE the child process logs
    });

    child.on('error', (error) => {
      console.error(`❗ Error spawning script: ${error.message}`);
    });

    child.on('exit', (code) => {
      console.log(`✅ scheduled-runner.js exited with code ${code}`);
    });
  });
});
