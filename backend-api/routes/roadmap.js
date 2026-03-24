const express = require('express');
const router = express.Router();
const { Redis } = require('@upstash/redis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Check for environment variables
const redis_url = process.env.UPSTASH_REDIS_REST_URL;
const redis_token = process.env.UPSTASH_REDIS_REST_TOKEN;
const gemini_key = process.env.GEMINI_API_KEY;

// Only initialize Redis if both URL and Token are present
let redis = null;
if (redis_url && redis_token) {
  try {
    redis = new Redis({
      url: redis_url,
      token: redis_token,
    });
    console.log('Redis initialized correctly.');
  } catch (e) {
    console.error('Failed to initialize Redis:', e.message);
  }
} else {
  console.warn('RE-NOTICE: Redis credentials missing in .env (UPSTASH_REDIS_REST_URL/TOKEN). Recent lists will be disabled.');
}

const genAI = new GoogleGenerativeAI((gemini_key || '').trim());

// Normalize key — "Node.js Developer" → "nodejs-developer"
const normalizeKey = (field) =>
  field.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

router.get('/generate', async (req, res) => {
  const { field } = req.query;

  if (!field) {
    return res.status(400).json({ error: 'field query parameter is required' });
  }

  const cacheKey = `roadmap:${normalizeKey(field)}`;

  try {
    // Stage 1: Try Cache
    let cached = null;
    if (redis) {
      try {
        console.log(`Checking cache for: ${cacheKey}`);
        cached = await redis.get(cacheKey);
      } catch (err) {
        console.error('Redis GET failed:', err.message);
      }
    }

    if (cached) {
      console.log(`Cache HIT for: ${field}`);
      return res.json({ data: cached, fromCache: true });
    }

    // Stage 2: Call Gemini
    console.log(`Calling Gemini for: ${field}`);
    if (!gemini_key) {
        throw new Error('GEMINI_API_KEY is missing in your backend .env file');
    }

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

    // Stage 3: Extract and Parse JSON
    let parsed;
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Gemini returned invalid or missing JSON');
      }
      const cleaned = text.substring(jsonStart, jsonEnd + 1);
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error(`Invalid JSON format from AI: ${parseErr.message}`);
    }

    // Stage 4: Try Save to Cache
    if (redis) {
      try {
        await redis.set(cacheKey, parsed, { ex: 2592000 });
        console.log(`Saved to cache: ${cacheKey}`);
      } catch (cacheErr) {
        console.error('Redis SET failed:', cacheErr.message);
      }
    }

    return res.json({ data: parsed, fromCache: false });

  } catch (err) {
    console.error('Roadmap error:', err);
    return res.status(500).json({
      error: 'Roadmap generation failed',
      message: err.message
    });
  }
});

// Get all cached roadmaps list - Return 200 [] even if Redis fails
router.get('/cached', async (req, res) => {
  try {
    if (!redis) {
        return res.json({ roadmaps: [], count: 0, warning: 'Redis not configured' });
    }
    const keys = await redis.keys('roadmap:*');
    const names = keys.map(k => k.replace('roadmap:', '').replace(/-/g, ' '));
    return res.json({ roadmaps: names, count: keys.length });
  } catch (err) {
    console.error('Cached list error:', err.message);
    return res.json({ roadmaps: [], count: 0, error: err.message });
  }
});

router.delete('/cache/:field', async (req, res) => {
  try {
    if (!redis) throw new Error('Redis not configured');
    const key = `roadmap:${normalizeKey(req.params.field)}`;
    await redis.del(key);
    return res.json({ deleted: key });
  } catch (err) {
      return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
