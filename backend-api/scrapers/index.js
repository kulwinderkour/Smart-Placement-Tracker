const { scrapeInternshala } = require("./internshala");
const { scrapeNaukri } = require("./naukri");

let cachedJobs = [];
let lastUpdated = null;

const scrapeAllJobs = async (skills = "software developer") => {
  console.log("Starting scrape for:", skills);
  const results = await Promise.allSettled([
    scrapeInternshala(Array.isArray(skills) ? skills : [skills]),
    scrapeNaukri(skills),
  ]);

  const allJobs = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // deduplicate by applyUrl
  const seen = new Set();
  const unique = allJobs.filter((job) => {
    if (seen.has(job.applyUrl)) return false;
    seen.add(job.applyUrl);
    return true;
  });

  cachedJobs = unique;
  lastUpdated = new Date().toISOString();
  console.log(`Scraped ${unique.length} unique jobs, cached.`);
  return unique;
};

const getLastScrapedJobs = () => ({ jobs: cachedJobs, lastUpdated });

module.exports = { scrapeAllJobs, getLastScrapedJobs };
