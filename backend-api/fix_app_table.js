require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runFix() {
  console.log("Checking and fixing 'applications' table schema for Python compatibility...");
  try {
    // 1. Check existing columns in applications table
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'applications'
    `);
    const columns = res.rows.map(r => r.column_name);
    console.log("Current columns in 'applications':", columns);

    // 2. Add missing columns I recently added to the Python model
    const missing = [
      { name: 'resume_url', type: 'TEXT' },
      { name: 'cover_letter', type: 'TEXT' },
      { name: 'agent_applied', type: 'BOOLEAN DEFAULT false' }
    ];

    for (const col of missing) {
      if (!columns.includes(col.name)) {
        console.log(`Adding missing column: ${col.name}...`);
        await pool.query(`ALTER TABLE applications ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name}`);
      }
    }

    // 3. Ensure student_id and job_id are UUID types (Node init used UUID, so should be fine)
    
    console.log("\n✅ Database schema updated successfully!");
  } catch (err) {
    console.error("❌ ERROR updating database schema:", err.message);
  } finally {
    await pool.end();
  }
}

runFix();
