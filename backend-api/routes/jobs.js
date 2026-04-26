const express = require("express");
const { scrapeAllJobs, getLastScrapedJobs } = require("../scrapers");

const router = express.Router();

// GET /api/jobs — returns cached jobs instantly, supports ?q= filter
router.get("/", (req, res) => {
  const { jobs, lastUpdated } = getLastScrapedJobs();
  const q = req.query.q?.toLowerCase();
  const source = req.query.source?.toLowerCase();
  const type = req.query.type?.toLowerCase();
  const location = req.query.location?.toLowerCase();

  const filtered = jobs.filter((j) => {
    const matchesQ = q
      ? j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q)
      : true;
    const matchesSource = source ? j.source?.toLowerCase() === source : true;
    const haystack = `${j.title || ""} ${j.description || ""}`.toLowerCase();
    const matchesType =
      type === "remote"
        ? haystack.includes("remote") || (j.location || "").toLowerCase().includes("remote")
        : type === "full-time" || type === "fulltime"
        ? haystack.includes("full-time") || haystack.includes("full time") || haystack.includes("fulltime")
        : true;
    const matchesLocation = location && location !== "all"
      ? (j.location || "").toLowerCase().includes(location)
      : true;

    return matchesQ && matchesSource && matchesType && matchesLocation;
  });

  res.json({ jobs: filtered, lastUpdated, total: filtered.length });
});

// POST /api/jobs/refresh — manual trigger from frontend Refresh button
router.post("/refresh", async (_req, res) => {
  const jobs = await scrapeAllJobs();
  res.json({
    message: "Jobs refreshed",
    total: jobs.length,
    lastUpdated: new Date().toISOString(),
  });
});

module.exports = router;
