const cron = require("node-cron");
const { scrapeAllJobs } = require("./index");

const startScheduler = async () => {
  // run immediately on startup
  await scrapeAllJobs();

  // then every 24 hours
  cron.schedule("0 0 * * *", async () => {
    console.log("24h cron triggered, re-scraping...");
    await scrapeAllJobs();
  });

  console.log("Scheduler started. Jobs will refresh every 24h.");
};




module.exports = { startScheduler };
