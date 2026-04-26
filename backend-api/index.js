require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const { scrapeInternshala } = require("./scrapers/internshala");
const { startScheduler } = require("./scrapers/scheduler");
const roadmapRouter = require("./routes/roadmap");
const questionsRouter = require("./routes/questions");
const jobsRouter = require("./routes/jobs");
const path = require('path');

const app = express();
const port = 8081;

app.use(cors());
app.use(express.json());

// Scraper routes
const scraperCache = new Map();
app.get("/api/jobs/internshala", async (req, res) => {
  const skills = req.query.skills?.split(",") || ["software"];
  const cacheKey = skills.join("-");

  if (scraperCache.has(cacheKey)) {
    const { data, time } = scraperCache.get(cacheKey);
    if (Date.now() - time < 3600000) {
      // 1 hour
      return res.json(data);
    }
  }

  try {
    const jobs = await scrapeInternshala(skills);
    scraperCache.set(cacheKey, { data: jobs, time: Date.now() });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Scraping failed", message: err.message });
  }
});

// Roadmap routes
app.use("/api/roadmap", roadmapRouter);

// Questions routes
app.use("/questions", questionsRouter);

// mount the jobs route
app.use("/api/jobs", jobsRouter);

// start the scraper scheduler
startScheduler().catch((err) => {
  console.error("Scheduler failed to start:", err.message);
});

app.listen(port, () => {
  console.log(`Scraper & Roadmap server listening at http://localhost:${port}`);
});
