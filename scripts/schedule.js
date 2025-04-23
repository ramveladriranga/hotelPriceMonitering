import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';

const scriptPath = path.resolve('./scripts/scheduled-runner.js');

// Schedule to run at 9:00 AM, 3:00 PM, and 9:00 PM every day
const schedule = ['0 9 * * *', '0 15 * * *', '0 21 * * *'];

//const schedule = ['5 0-23 * * *'];

schedule.forEach(cronTime => {
  cron.schedule(cronTime, () => {
    console.log(`🕘 Running scheduled-runner.js at ${new Date().toLocaleString()} (${cronTime})`);

    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❗ Error executing script: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`⚠️ stderr: ${stderr}`);
      }
      console.log(`📜 stdout:\n${stdout}`);
    });
  });
});
