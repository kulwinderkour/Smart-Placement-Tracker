require("dotenv").config();
const { Pool } = require('pg');

async function fixAdminJobsStructure() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    console.log("--- Executing Step 8: Fix admin_jobs structure ---");
    
    const queries = [
      "ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;",
      "UPDATE admin_jobs SET is_active = true WHERE is_active IS NULL;",
      "ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS package_lpa DECIMAL;",
      "ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS required_skills TEXT[];",
      "ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS min_cgpa DECIMAL DEFAULT 0;",
      "ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS openings INTEGER DEFAULT 1;",
      "ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS company_logo TEXT;"
    ];

    for (const q of queries) {
      console.log(`Executing: ${q}`);
      try {
        await pool.query(q);
      } catch (err) {
        console.warn(`Warning during structure fix: ${err.message}`);
      }
    }
    
    console.log("Structure fix complete.");

  } catch (err) {
    console.error("Error fixing structure:", err.message);
  } finally {
    await pool.end();
  }
}

fixAdminJobsStructure();
