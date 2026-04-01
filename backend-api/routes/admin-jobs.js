const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { Redis } = require("@upstash/redis");
require('dotenv').config();

// Upstash Redis setup
let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("Upstash Redis initialized for admin-jobs");
  } else {
    console.warn("Upstash Redis credentials missing in .env - sync disabled");
  }
} catch (err) {
  console.error("Upstash Redis init error:", err.message);
}

// Database setup
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Auth token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Initialize database table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        description TEXT,
        posted_by UUID REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        package_lpa DECIMAL,
        application_deadline DATE,
        job_type TEXT DEFAULT 'Full-time',
        required_skills TEXT[],
        min_cgpa DECIMAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        apply_link TEXT,
        company_logo TEXT,
        openings INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES users(id),
        job_id UUID NOT NULL REFERENCES admin_jobs(id),
        resume_url TEXT,
        cover_letter TEXT,
        applied_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'Applied',
        agent_applied BOOLEAN DEFAULT false,
        notes TEXT,
        UNIQUE(student_id, job_id)
      );

      CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
      CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    `);
    console.log('admin_jobs and applications tables initialized');
  } catch (err) {
    console.error('Error initializing admin_jobs table:', err.message);
  }
}
initDB();

// GET /api/admin-jobs/active
// Returns all active jobs posted by admin — more robust version for debugging
router.get('/active', async (req, res) => {
  try {
    // First try strict query on admin_jobs
    let result = await pool.query(`
      SELECT
        id, title, company, location, package_lpa,
        job_type, required_skills, min_cgpa,
        application_deadline, apply_link, company_logo,
        openings, created_at, description, is_active
      FROM admin_jobs
      WHERE is_active = true
      AND (
        application_deadline IS NULL
        OR application_deadline >= CURRENT_DATE
      )
      ORDER BY created_at DESC
      LIMIT 20
    `);

    // If nothing found in admin_jobs, try querying the 'jobs' table (Verfied Admin postings)
    if (result.rows.length === 0) {
      console.log('No active jobs in admin_jobs, checking "jobs" table...');
      result = await pool.query(`
        SELECT 
          id, 
          role_title as title, 
          company_name as company, 
          location, 
          salary_min as package_lpa, 
          job_type, 
          description,
          deadline as application_deadline,
          created_at,
          is_active
        FROM jobs
        WHERE is_active = true 
        AND company_profile_id IS NOT NULL
        AND (deadline IS NULL OR deadline >= CURRENT_DATE)
        ORDER BY created_at DESC
        LIMIT 20
      `);
    }

    // If STILL nothing, return ALL jobs regardless of is_active (for debugging only)
    if (result.rows.length === 0) {
      console.log('No active jobs at all, returning all jobs for debug...');
      result = await pool.query(`
        SELECT id, role_title as title, company_name as company FROM jobs ORDER BY created_at DESC LIMIT 5
      `);
    }

    console.log(`Returning ${result.rows.length} jobs`);
    res.json({ 
      jobs: result.rows, 
      total: result.rows.length,
      source: result.rows.length > 0 ? (result.rows[0].title ? 'admin_jobs or jobs' : 'none') : 'none'
    });

  } catch (err) {
    console.error('Error fetching admin jobs:', err);
    
    // Check if table exists
    if (err.message.includes('does not exist')) {
      return res.status(500).json({ 
        error: 'Table admin_jobs does not exist',
        hint: 'Run the migration to create admin_jobs table',
        sqlError: err.message
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Add a debug route temporarily
router.get('/debug-all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM admin_jobs ORDER BY created_at DESC');
    res.json({
      total: result.rows.length,
      jobs: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'Table may not exist' });
  }
});

// GET /api/admin-jobs/active/:id
// Single job detail
router.get('/active/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM admin_jobs WHERE id = $1 AND is_active = true',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update job (for admin)
router.post('/', async (req, res) => {
  const {
    title, company, location, package_lpa, job_type,
    required_skills, min_cgpa, application_deadline,
    apply_link, openings, description, company_logo,
    is_active, posted_by
  } = req.body;

  try {
    const query = `
      INSERT INTO admin_jobs (
        title, company, location, package_lpa, job_type,
        required_skills, min_cgpa, application_deadline,
        apply_link, openings, description, company_logo,
        is_active, posted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      title,
      company,
      location || null,
      package_lpa || null,
      job_type || 'Full-time',
      required_skills || [],
      min_cgpa || 0,
      application_deadline || null,
      apply_link || null,
      openings || 1,
      description || null,
      company_logo || null,
      is_active !== undefined ? is_active : true,
      posted_by || null
    ];
    const result = await pool.query(query, values);
    const newJob = result.rows[0];

    // --- Sync to Upstash Redis ---
    if (redis) {
      try {
        console.log(`Attempting to sync job:${newJob.id} to Upstash...`);
        
        // Match user's requested structure
        await redis.hset(`job:${newJob.id}`, {
          title: newJob.title,
          company: newJob.company,
          salary_min: newJob.package_lpa,
          salary_max: newJob.package_lpa, // Fallback since package_lpa is singular
          exp_min: 0,
          exp_max: 5,
          deadline: newJob.application_deadline,
          description: newJob.description,
          is_active: true
        });

        // Add to the job list
        await redis.lpush("jobs", `job:${newJob.id}`);
        
        console.log(`✅ SUCCESS: Job ${newJob.id} automatically saved to Upstash Redis`);
      } catch (redisErr) {
        console.error(`❌ FAILED to sync to Redis: ${redisErr.message}`);
        if (redisErr.message.includes("NOPERM")) {
          console.error("HINT: The current Upstash token does not have 'set' permissions. Please check your Upstash console Access Control.");
        }
      }
    }

    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin-jobs/apply
// Called by student or agent to submit application
router.post('/apply', authenticateToken, async (req, res) => {
  const { jobId, resumeUrl, coverLetter, agentApplied = false } = req.body;
  const studentId = req.user.id;

  try {
    // Check job exists and is active
    const jobCheck = await pool.query(
      'SELECT id FROM admin_jobs WHERE id = $1 AND is_active = true',
      [jobId]
    );
    if (!jobCheck.rows.length) {
      return res.status(404).json({ error: 'Job not found or no longer active' });
    }

    // Check already applied
    const existing = await pool.query(
      'SELECT id FROM applications WHERE student_id = $1 AND job_id = $2',
      [studentId, jobId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Already applied to this job' });
    }

    // Insert application
    const result = await pool.query(`
      INSERT INTO applications (student_id, job_id, resume_url, cover_letter, agent_applied, status)
      VALUES ($1, $2, $3, $4, $5, 'Applied')
      RETURNING *
    `, [studentId, jobId, resumeUrl, coverLetter, agentApplied]);

    res.json({ success: true, application: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin-jobs/my-applications
// Student sees their own applications
router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.*,
        j.title, j.company, j.package_lpa, j.location,
        j.job_type, j.application_deadline
      FROM applications a
      JOIN admin_jobs j ON a.job_id = j.id
      WHERE a.student_id = $1
      ORDER BY a.applied_at DESC
    `, [req.user.id]);
    res.json({ applications: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
