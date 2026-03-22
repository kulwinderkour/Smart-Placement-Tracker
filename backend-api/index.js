const express = require('express');
const cors = require('cors');
const { scrapeInternshala } = require('./scrapers/internshala');

const app = express();
const port = 8081;

app.use(cors());
app.use(express.json());

// Cache results for 1 hour to avoid re-scraping
const cache = new Map();

app.get('/api/jobs/internshala', async (req, res) => {
  const skills = req.query.skills?.split(',') || ['software'];
  const cacheKey = skills.join('-');

  if (cache.has(cacheKey)) {
    const { data, time } = cache.get(cacheKey);
    if (Date.now() - time < 3600000) { // 1 hour
      return res.json(data);
    }
  }

  try {
    const jobs = await scrapeInternshala(skills);
    cache.set(cacheKey, { data: jobs, time: Date.now() });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Scraper server listening at http://localhost:${port}`);
});
