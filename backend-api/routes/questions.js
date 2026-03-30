require("dotenv").config();
const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");

// ---------------------------------------------------------------------------
// Gemini client
// ---------------------------------------------------------------------------
const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || "").trim());

// ---------------------------------------------------------------------------
// Upstash Redis (optional – gracefully degrades if not configured)
// ---------------------------------------------------------------------------
let redis = null;
try {
  const { Redis } = require("@upstash/redis");
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log("[questions] Upstash Redis connected");
} catch (err) {
  console.log("[questions] Redis not available:", err.message);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip markdown fences that Gemini sometimes wraps around JSON */
function extractJSON(raw) {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/** Safe Redis get – returns null on any error */
async function redisGet(key) {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    console.warn("[questions] Redis GET error:", e.message);
    return null;
  }
}

/** Safe Redis set with TTL – silently swallows errors */
async function redisSet(key, value, ttlSeconds = 3600) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (e) {
    console.warn("[questions] Redis SET error:", e.message);
  }
}

/** Normalise a topic/field string into a cache-safe key */
const normalizeKey = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");

// ---------------------------------------------------------------------------
// POST /questions/generate
// Body: { topic, difficulty, type, count, userSkills, customQuestion }
// ---------------------------------------------------------------------------
router.post("/generate", async (req, res) => {
  const {
    topic,
    difficulty = "medium",
    type = "mixed",
    count = 10,
    userSkills = [],
    customQuestion = false,
  } = req.body;

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "topic is required" });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY is not set in backend .env" });
  }

  const cacheKey = `questions:${normalizeKey(topic)}:${difficulty}:${type}:${count}`;

  // ── 1. Cache check ────────────────────────────────────────────────────────
  const cached = await redisGet(cacheKey);
  if (cached) {
    console.log(`[questions] Cache HIT for key: ${cacheKey}`);
    const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
    return res.json({ ...parsed, fromCache: true });
  }

  // ── 2. Build Gemini prompt ────────────────────────────────────────────────
  const skillsContext =
    userSkills.length > 0
      ? `The student's current skills include: ${userSkills.join(", ")}.`
      : "";

  const typeInstruction =
    type === "mixed"
      ? 'Use a mix of "mcq", "coding", "theory", and "situational" question types.'
      : `All questions must be of type "${type}".`;

  const prompt = `
You are an expert technical interviewer. Generate exactly ${count} interview practice questions for the topic: "${topic}".
Difficulty level: ${difficulty}.
${typeInstruction}
${skillsContext}

Return ONLY valid JSON — no markdown, no backticks, no explanation — in this exact structure:

{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "type": "${type}",
  "totalQuestions": ${count},
  "questions": [
    {
      "id": "<uuid-string>",
      "type": "mcq" | "coding" | "theory" | "situational",
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctAnswer": "<the correct option text, verbatim>",
      "explanation": "<why this is the correct answer>",
      "topic": "<sub-topic>",
      "difficulty": "${difficulty}",
      "examples": [],
      "hints": ["<hint 1>", "<hint 2>"]
    }
  ]
}

Rules:
- For "mcq" type, always provide exactly 4 options and a correctAnswer matching one of them verbatim.
- For "coding" or "theory" types, options can be [] and correctAnswer is a short model answer.
- For "situational" types, options can be [] and correctAnswer is a suggested approach.
- Every question MUST have a non-empty "explanation".
- Return ONLY the raw JSON object. No surrounding text whatsoever.
`.trim();

  // ── 3. Call Gemini ────────────────────────────────────────────────────────
  try {
    console.log(`[questions] Calling Gemini for topic="${topic}" difficulty=${difficulty} type=${type} count=${count}`);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const raw = await result.response.text();

    let questionSet;
    try {
      questionSet = JSON.parse(extractJSON(raw));
    } catch (parseErr) {
      console.error("[questions] JSON parse error:", parseErr.message);
      console.error("[questions] Raw Gemini output:", raw.slice(0, 500));
      return res.status(502).json({
        error: "Failed to parse Gemini response as JSON",
        details: parseErr.message,
      });
    }

    // Ensure every question has a stable uuid id
    if (Array.isArray(questionSet.questions)) {
      questionSet.questions = questionSet.questions.map((q) => ({
        ...q,
        id: q.id || uuidv4(),
      }));
    }

    // Cache result for 1 hour
    await redisSet(cacheKey, questionSet, 3600);

    return res.json({ ...questionSet, fromCache: false });
  } catch (err) {
    console.error("[questions] Gemini API error:", err.message);
    return res.status(500).json({
      error: "Failed to generate questions",
      details: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /questions/topics
// Query: ?skills=react,nodejs,...
// Returns suggested topics based on provided skills (or defaults)
// ---------------------------------------------------------------------------
router.get("/topics", async (req, res) => {
  const skillsParam = req.query.skills || "";
  const skills = skillsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // If skills are provided, use them directly as topics plus add common ones
  const defaultTopics = [
    "Data Structures & Algorithms",
    "System Design",
    "Object-Oriented Programming",
    "Database Design & SQL",
    "Operating Systems",
    "Computer Networks",
    "JavaScript",
    "Python",
    "React",
    "Node.js",
    "REST APIs",
    "Git & Version Control",
    "Problem Solving",
    "Behavioral / HR",
  ];

  const skillTopics = skills.map((s) => {
    // Capitalise first letter of each word for display
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  });

  // Merge, deduplicate, and put skill-based topics first
  const merged = [
    ...skillTopics,
    ...defaultTopics.filter(
      (d) => !skillTopics.some((st) => st.toLowerCase() === d.toLowerCase())
    ),
  ];

  return res.json({ topics: merged });
});

// ---------------------------------------------------------------------------
// POST /questions/evaluate
// Body: { question, userAnswer, correctAnswer, topic }
// Returns AI-powered evaluation with score, feedback, and suggestions
// ---------------------------------------------------------------------------
router.post("/evaluate", async (req, res) => {
  const { question, userAnswer, correctAnswer, topic = "General" } = req.body;

  if (!question || !userAnswer) {
    return res
      .status(400)
      .json({ error: "question and userAnswer are required" });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY is not set in backend .env" });
  }

  const prompt = `
You are a strict but fair technical interviewer evaluating a candidate's answer.

Question: "${question}"
Topic: "${topic}"
Correct / Model Answer: "${correctAnswer}"
Candidate's Answer: "${userAnswer}"

Evaluate the candidate's answer and return ONLY valid JSON — no markdown, no backticks — in this exact structure:

{
  "score": <integer 0-10>,
  "maxScore": 10,
  "grade": "<A / B / C / D / F>",
  "feedback": "<2-3 sentences of constructive feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area to improve 1>", "<area to improve 2>"],
  "betterAnswer": "<a concise model answer the candidate could have given>"
}

Scoring guide: 9-10 = excellent, 7-8 = good, 5-6 = adequate, 3-4 = needs work, 0-2 = incorrect/missing.
Return ONLY the raw JSON object.
`.trim();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const raw = await result.response.text();

    let evaluation;
    try {
      evaluation = JSON.parse(extractJSON(raw));
    } catch (parseErr) {
      console.error("[questions/evaluate] JSON parse error:", parseErr.message);
      return res.status(502).json({
        error: "Failed to parse Gemini evaluation response",
        details: parseErr.message,
      });
    }

    return res.json(evaluation);
  } catch (err) {
    console.error("[questions/evaluate] Gemini error:", err.message);
    return res.status(500).json({
      error: "Failed to evaluate answer",
      details: err.message,
    });
  }
});

module.exports = router;
