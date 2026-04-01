const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Upstash Redis setup (REST based)
let redis = null;

try {
    const { Redis } = require("@upstash/redis");

    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    console.log("Upstash Redis connected successfully");

} catch (error) {
    console.log("Upstash Redis initialization failed:", error.message);
}

// Database setup (for permanent storage)
const { Pool } = require('pg');
let pool = null;

// Initialize database connection
async function initDatabase() {
  try {
    // Try to connect to PostgreSQL
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
    console.log('Attempting to connect to database...');
    
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully');

    // Create table if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS roadmaps (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255),
            field VARCHAR(255) NOT NULL UNIQUE,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            roadmap_data JSONB NOT NULL,
            difficulty_level VARCHAR(50) DEFAULT 'intermediate',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            generated_by VARCHAR(100) DEFAULT 'gemini-2.5-flash-preview-04-17',
            usage_count INTEGER DEFAULT 0,
            last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            is_public VARCHAR(10) DEFAULT 'true'
        );
        
        CREATE INDEX IF NOT EXISTS idx_roadmaps_field ON roadmaps(field);
        CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);
    `);
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Falling back to Redis-only mode');
    pool = null;
    return false;
  }
}

// Initialize database on startup
initDatabase();

// Helper function to save roadmap to database
async function saveRoadmapToDB(field, roadmapData, userId = null) {
    if (!pool) {
        console.log('Database not available, skipping database save');
        return null;
    }
    
    try {
        const title = roadmapData.title || `${field.charAt(0).toUpperCase() + field.slice(1)} Roadmap`;
        const description = roadmapData.description || `Comprehensive learning roadmap for ${field}`;
        
        const query = `
            INSERT INTO roadmaps (field, title, description, roadmap_data, user_id, is_public)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (field) 
            DO UPDATE SET 
                roadmap_data = EXCLUDED.roadmap_data,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP,
                usage_count = roadmaps.usage_count + 1,
                last_accessed = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        
        const values = [
            field.toLowerCase(),
            title,
            description,
            JSON.stringify(roadmapData),
            userId,
            userId ? 'false' : 'true'
        ];
        
        const result = await pool.query(query, values);
        console.log(`Roadmap saved to database: ${field}`);
        return result.rows[0];
    } catch (error) {
        console.error('Error saving roadmap to database:', error);
        return null;
    }
}

// Helper function to get roadmap from database
async function getRoadmapFromDB(field, userId = null) {
    if (!pool) {
        console.log('Database not available, skipping database lookup');
        return null;
    }
    
    try {
        const query = `
            SELECT * FROM roadmaps 
            WHERE field = $1 
            AND (user_id = $2 OR is_public = 'true' OR user_id IS NULL)
            ORDER BY 
                CASE WHEN user_id = $2 THEN 1 ELSE 2 END,
                created_at DESC
            LIMIT 1;
        `;
        
        const result = await pool.query(query, [field.toLowerCase(), userId]);
        
        if (result.rows.length > 0) {
            // Update usage stats
            await pool.query(
                'UPDATE roadmaps SET usage_count = usage_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = $1',
                [result.rows[0].id]
            );
            
            return {
                data: result.rows[0].roadmap_data,
                fromDatabase: true,
                usage_count: result.rows[0].usage_count,
                created_at: result.rows[0].created_at
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting roadmap from database:', error);
        return null;
    }
}

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());

// Normalize key — "Node.js Developer" → "nodejs-developer"
const normalizeKey = (field) =>
  field.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

router.get('/generate', async (req, res) => {
  const { field } = req.query;
  const userId = req.user?.id || null; // Get user ID if authenticated

  if (!field) {
    return res.status(400).json({ error: "Field parameter is required" });
  }

  const normalizedField = normalizeKey(field);
  console.log(`Checking cache for: ${normalizedField}`);

  try {
    // Stage 1: Check Database First (Permanent Storage)
    console.log(`Checking database for: ${normalizedField}`);
    const dbRoadmap = await getRoadmapFromDB(normalizedField, userId);
    
    if (dbRoadmap) {
      console.log(`Database HIT for: ${normalizedField}`);
      
      // Also cache in Redis for faster access
      if (redis) {
        try {
          await redis.set(
            `roadmap:${normalizedField}`, 
            JSON.stringify({
              data: dbRoadmap.data,
              fromCache: true,
              fromDatabase: true,
              usage_count: dbRoadmap.usage_count
            }),
            { ex: 3600 }
          );
        } catch (e) {
          console.log('Redis cache set error:', e.message);
        }
      }
      
      return res.json({ 
        data: dbRoadmap.data, 
        fromCache: true, 
        fromDatabase: true,
        usage_count: dbRoadmap.usage_count 
      });
    }

    // Stage 2: Check Redis Cache (Temporary Cache)
    if (redis) {
      try {
        const cached = await redis.get(`roadmap:${normalizedField}`);
        if (cached) {
          console.log(`Redis Cache HIT for: ${normalizedField}`);
          
          // Save to database for permanent storage
          const cachedData = JSON.parse(cached);
          await saveRoadmapToDB(normalizedField, cachedData.data, userId);
          
          return res.json({ 
            data: cachedData.data, 
            fromCache: true, 
            fromDatabase: false 
          });
        }
      } catch (e) {
        console.log('Redis get error:', e.message);
      }
    }

    // Stage 3: Generate with Gemini API
    console.log(`Calling Gemini for: ${normalizedField}`);
    const gemini_key = process.env.GEMINI_API_KEY;
    if (!gemini_key) {
        throw new Error('GEMINI_API_KEY is missing in your backend .env file');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });
    const prompt = `Generate a comprehensive learning roadmap for: "${field}"

Return ONLY valid JSON in this exact structure, no explanation, no markdown, no backticks:
{
  "title": "Role Name Roadmap",
  "description": "One line description of this role",
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "description": "Section description",
      "duration": "2-3 weeks",
      "topics": [
        {
          "id": "topic-1",
          "title": "Topic Title",
          "description": "Topic description",
          "resources": [
            {
              "title": "Resource Title",
              "type": "course/book/tutorial",
              "url": "https://example.com",
              "difficulty": "beginner"
            }
          ],
          "skills": ["skill1", "skill2"]
        }
      ]
    }
  ]
}

Rules:
- Return ONLY the raw JSON
- No markdown formatting
- No explanations
- No code blocks
- Valid JSON only`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    // Clean and parse JSON
    let roadmapData;
    try {
      // Remove any markdown formatting
      const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
      roadmapData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse JSON from Gemini:', parseError);
      throw new Error('Failed to parse roadmap data from Gemini API');
    }

    // Stage 4: Save to Database (Permanent Storage)
    await saveRoadmapToDB(normalizedField, roadmapData, userId);

    // Stage 5: Cache in Redis (Temporary Cache)
    if (redis) {
      try {
        await redis.set(`roadmap:${normalizedField}`, JSON.stringify({
          data: roadmapData,
          fromCache: false,
          fromDatabase: true
        }), { ex: 604800 });
        console.log('Saved to cache: roadmap:' + normalizedField);
      } catch (e) {
        console.log('Redis cache set error:', e.message);
      }
    }

    res.json({ 
      data: roadmapData, 
      fromCache: false, 
      fromDatabase: true 
    });

  } catch (error) {
    console.error('Roadmap error:', error);
    res.status(500).json({ 
      error: 'Failed to generate roadmap', 
      details: error.message 
    });
  }
});

// Get user's saved roadmaps
router.get('/my-roadmaps', async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!pool) {
    return res.json({ roadmaps: [], count: 0, warning: 'Database not available' });
  }

  try {
    const query = `
      SELECT id, field, title, description, created_at, updated_at, usage_count, is_public
      FROM roadmaps 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({ 
      roadmaps: result.rows, 
      count: result.rows.length 
    });
  } catch (error) {
    console.error('Error getting user roadmaps:', error);
    res.status(500).json({ error: 'Failed to get roadmaps' });
  }
});

// Get all public roadmaps
router.get('/public-roadmaps', async (req, res) => {
  if (!pool) {
    return res.json({ roadmaps: [], count: 0, warning: 'Database not available' });
  }

  try {
    const query = `
      SELECT id, field, title, description, created_at, updated_at, usage_count, is_public
      FROM roadmaps 
      WHERE is_public = 'true' OR user_id IS NULL
      ORDER BY usage_count DESC, created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    
    res.json({ 
      roadmaps: result.rows, 
      count: result.rows.length 
    });
  } catch (error) {
    console.error('Error getting public roadmaps:', error);
    res.status(500).json({ error: 'Failed to get public roadmaps' });
  }
});

// Delete a roadmap
router.delete('/roadmap/:id', async (req, res) => {
  const userId = req.user?.id;
  const roadmapId = req.params.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!pool) {
    return res.status(503).json({ error: "Database not available" });
  }

  try {
    const query = `
      DELETE FROM roadmaps 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [roadmapId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Roadmap not found or you don't have permission to delete it" });
    }
    
    // Also remove from Redis cache
    if (redis) {
      try {
        await redis.del(`roadmap:${result.rows[0].field}`);
      } catch (e) {
        console.log('Redis delete error:', e.message);
      }
    }
    
    res.json({ message: "Roadmap deleted successfully" });
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    res.status(500).json({ error: 'Failed to delete roadmap' });
  }
});

// Get roadmap statistics
router.get('/stats', async (req, res) => {
  if (!pool) {
    return res.json({ 
      total_roadmaps: 0,
      public_roadmaps: 0,
      total_usage: 0,
      popular_roadmaps: [],
      warning: 'Database not available'
    });
  }

  try {
    const queries = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM roadmaps'),
      pool.query('SELECT COUNT(*) as public FROM roadmaps WHERE is_public = \'true\''),
      pool.query('SELECT SUM(usage_count) as total_usage FROM roadmaps'),
      pool.query('SELECT field, usage_count FROM roadmaps ORDER BY usage_count DESC LIMIT 10')
    ]);
    
    const stats = {
      total_roadmaps: parseInt(queries[0].rows[0].total),
      public_roadmaps: parseInt(queries[1].rows[0].public),
      total_usage: parseInt(queries[2].rows[0].total_usage) || 0,
      popular_roadmaps: queries[3].rows
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get all cached roadmaps list - Return 200 [] even if Redis fails
router.get('/cached', async (req, res) => {
  try {
    if (!redis) {
        return res.json({ roadmaps: [], count: 0, warning: 'Redis not configured or not connected' });
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
    if (!redis) throw new Error('Redis not configured or not connected');
    const key = `roadmap:${normalizeKey(req.params.field)}`;
    await redis.del(key);
    return res.json({ deleted: key });
  } catch (err) {
    console.error('Cache delete error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
