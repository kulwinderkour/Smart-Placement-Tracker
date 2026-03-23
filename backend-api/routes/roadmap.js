const express = require('express');
const router = express.Router();
const { Redis } = require('@upstash/redis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load env if not done elsewhere
// require('dotenv').config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Normalize key — "Node.js Developer" → "nodejs-developer"
const normalizeKey = (field) =>
  field.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

router.get('/generate', async (req, res) => {
  const { field } = req.query;

  if (!field) {
    return res.status(400).json({ error: 'field is required' });
  }

  const cacheKey = `roadmap:${normalizeKey(field)}`;

  try {
    // Step 1 — Check Redis cache first
    console.log(`Checking cache for: ${cacheKey}`);
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log(`Cache HIT for: ${field}`);
      return res.json({ data: cached, fromCache: true });
    }

    // Step 2 — Not in cache, call Gemini
    console.log(`Cache MISS — calling Gemini for: ${field}`);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Generate a comprehensive learning roadmap for: "${field}"

Return ONLY valid JSON in this exact structure, no explanation, no markdown, no backticks:
{
  "title": "Role Name Roadmap",
  "description": "One line description of this role",
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "level": "beginner",
      "topics": [
        {
          "id": "topic-1-1",
          "title": "Topic Name",
          "description": "Brief 1 sentence what this topic covers",
          "resources": ["Free resource 1", "Free resource 2"]
        }
      ]
    }
  ]
}

Requirements:
- Exactly 5 sections ordered from beginner to advanced
- Each section has exactly 5 topics
- levels must be: "beginner", "intermediate", "intermediate", "advanced", "advanced"
- Make topics VERY specific and practical for ${field}
- resources should be real free resources (MDN, freeCodeCamp, official docs etc)
- Return ONLY the raw JSON object, nothing else`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Clean response — remove any accidental markdown
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Step 3 — Save to Redis with 30 day expiry
    // TTL: 2592000 seconds = 30 days
    await redis.set(cacheKey, parsed, { ex: 2592000 });
    console.log(`Saved to cache: ${cacheKey}`);

    return res.json({ data: parsed, fromCache: false });

  } catch (err) {
    console.error('Roadmap generation error:', err);

    // If Gemini fails, try to return stale cache if exists
    try {
      const stale = await redis.get(cacheKey);
      if (stale) {
        return res.json({ data: stale, fromCache: true, stale: true });
      }
    } catch {}

    return res.status(500).json({
      error: 'Generation failed',
      message: err.message
    });
  }
});

// Get all cached roadmaps list
router.get('/cached', async (req, res) => {
  try {
    const keys = await redis.keys('roadmap:*');
    const names = keys.map(k => k.replace('roadmap:', '').replace(/-/g, ' '));
    return res.json({ roadmaps: names, count: keys.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete specific cached roadmap (admin use)
router.delete('/cache/:field', async (req, res) => {
  const key = `roadmap:${normalizeKey(req.params.field)}`;
  await redis.del(key);
  return res.json({ deleted: key });
});

module.exports = router;
