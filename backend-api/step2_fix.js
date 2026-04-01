require("dotenv").config();
const { Pool } = require('pg');

async function fixJobStatus() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    console.log("--- Fixing is_active on 'jobs' table ---");
    await pool.query("UPDATE jobs SET is_active = true WHERE is_active IS NULL OR is_active = false;");
    console.log("Fix complete for 'jobs'.");

    console.log("\n--- Fixing is_active on 'admin_jobs' table if it has data ---");
    await pool.query("UPDATE admin_jobs SET is_active = true WHERE is_active IS NULL OR is_active = false;");
    console.log("Fix complete for 'admin_jobs'.");

    console.log("\n--- Updating deadlines to 2026-12-31 on both ---");
    await pool.query("UPDATE jobs SET deadline = '2026-12-31' WHERE deadline < CURRENT_DATE OR deadline IS NULL;");
    await pool.query("UPDATE admin_jobs SET application_deadline = '2026-12-31' WHERE application_deadline < CURRENT_DATE OR application_deadline IS NULL;");
    console.log("Deadlines updated.");

  } catch (err) {
    console.error("Error during status fix:", err.message);
  } finally {
    await pool.end();
  }
}

fixJobStatus();
