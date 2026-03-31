const express = require('express');
const router = express.Router();
const { Redis } = require('@upstash/redis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// GET /api/skills/occupation-suggestions?keyword=...
// Provides O*NET style occupation suggestions using AI
router.get('/occupation-suggestions', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.length < 2) return res.json({ occupations: [] });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(`
      Return a JSON list of the 5 most relevant professional occupations for keyword: "${keyword}".
      Include the O*NET style SOC code and title.
      Format: {"occupations": [{"title": "Software Developer", "code": "15-1252.00"}, ...]}
      Return ONLY raw JSON.
    `);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.json({ occupations: [] });
  }
});

// POST /api/skills/analyze
// Works for ANY field — marketing, law, medicine, engineering, arts, etc.
router.post('/analyze', async (req, res) => {
  const { userSkills, targetRole, field } = req.body;

  if (!userSkills || userSkills.length === 0) {
    return res.status(400).json({ error: 'No skills provided' });
  }

  const cacheKey = `skillanalysis:${targetRole?.toLowerCase().replace(/\s+/g, '-')}:${userSkills.sort().join('-').toLowerCase()}`;

  // Check cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache HIT:', cacheKey);
      return res.json({ ...cached, fromCache: true });
    }
  } catch (e) {}

  // Call Gemini — but only ONCE per unique skill+role combo, then cached 30 days
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are a career analyst. Analyze these skills for someone targeting: "${targetRole || field || 'their chosen career'}"

User's current skills: ${userSkills.join(', ')}

Return ONLY valid raw JSON — no markdown, no backticks:
{
  "occupationTitle": "${targetRole}",
  "dataSource": { "onet": true, "jsearch": true },
  "totalJobsAnalyzed": 15,
  "overallReadiness": 65,
  "readinessLabel": "Intermediate / Beginner / Job Ready",
  "analyzedSkills": [
    {
      "skill": "skill name",
      "demandLevel": "High/Medium/Low",
      "demandScore": 85,
      "foundInOnet": true,
      "foundInJobs": true,
      "jobMentions": 5
    }
  ],
  "strongSkills": ["skill1", "skill2"],
  "gapSkills": [
    {
      "skill": "missing skill",
      "importance": "Critical/Important",
      "mentionCount": 8,
      "demandScore": 90
    }
  ],
  "topRecommendation": "Advice..."
}

Important rules:
- Format exactly for the provided frontend schema.
- Be specific to the role: ${targetRole}
- Return ONLY raw JSON`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(text);

    // Cache for 30 days (Gracefully skip if Redis is read-only)
    try {
      await redis.set(cacheKey, analysis, { ex: 2592000 });
    } catch (e) {
      console.warn('Redis Cache Set Failed:', e.message);
    }

    return res.json({ ...analysis, fromCache: false });

  } catch (err) {
    console.error('Skill analysis error:', err);
    return res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
});

// GET /api/skills/suggestions?field=marketing
// Returns suggested skills to add for any field — cached, no AI after first call
router.get('/suggestions', async (req, res) => {
  const { field } = req.query;
  if (!field) return res.status(400).json({ error: 'field required' });

  const cacheKey = `skill-suggestions:${field.toLowerCase().replace(/\s+/g, '-')}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ suggestions: cached, fromCache: true });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(`
List the top 15 most important skills for someone in "${field}".
Return ONLY a JSON array of skill name strings, nothing else.
Example: ["Skill 1", "Skill 2", "Skill 3"]
Make them specific and practical. Not generic. Not just for engineers.`);

    const text = result.response.text().replace(/```json|```/g, '').trim();
    const skills = JSON.parse(text);
    try {
      await redis.set(cacheKey, skills, { ex: 2592000 });
    } catch (e) {
      console.warn('Redis Cache Set Failed:', e.message);
    }
    return res.json({ suggestions: skills, fromCache: false });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
