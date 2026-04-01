require("dotenv").config();
const { Pool } = require('pg');

async function debugSteps() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    console.log("--- Step 1: Check all tables ---");
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log("Tables found:", tables.rows.map(r => r.table_name).join(", "));

    const tableExists = tables.rows.some(r => r.table_name === 'admin_jobs');
    if (!tableExists) {
      console.log("Table 'admin_jobs' DOES NOT EXIST!");
      return;
    }

    console.log("\n--- Step 1: Amazon job search ---");
    const amazonJobs = await pool.query("SELECT * FROM admin_jobs WHERE LOWER(title) LIKE '%amazon%' OR LOWER(company) LIKE '%amazon%';");
    console.log("Amazon jobs found count:", amazonJobs.rows.length);
    console.log("Amazon jobs data:", JSON.stringify(amazonJobs.rows, null, 2));

    console.log("\n--- Step 2: Check is_active values ---");
    const activeCheck = await pool.query("SELECT id, title, company, is_active, application_deadline FROM admin_jobs ORDER BY created_at DESC;");
    console.log("All jobs active status:", JSON.stringify(activeCheck.rows, null, 2));

    // Fix is_active immediately if false or null
    const needsFix = activeCheck.rows.filter(r => r.is_active === null || r.is_active === false);
    if (needsFix.length > 0) {
      console.log(`\nFixing ${needsFix.length} jobs with is_active = null or false...`);
      await pool.query("UPDATE admin_jobs SET is_active = true WHERE is_active IS NULL OR is_active = false;");
      console.log("Fix complete.");
    }

    console.log("\n--- Step 2: Check application_deadline ---");
    const deadlineCheck = await pool.query(`
      SELECT id, title, application_deadline,
        CASE WHEN application_deadline < CURRENT_DATE THEN 'EXPIRED' ELSE 'ACTIVE' END as status
      FROM admin_jobs;
    `);
    console.log("Deadline status:", JSON.stringify(deadlineCheck.rows, null, 2));

    // Fix expired deadlines
    const expired = deadlineCheck.rows.filter(r => r.status === 'EXPIRED');
    if (expired.length > 0) {
      console.log(`\nFixing ${expired.length} expired jobs to '2026-12-31' for testing...`);
      for (const job of expired) {
        await pool.query("UPDATE admin_jobs SET application_deadline = '2026-12-31' WHERE id = $1;", [job.id]);
      }
      console.log("Fix complete.");
    }

  } catch (err) {
    console.error("Error during debug script:", err.message);
  } finally {
    await pool.end();
  }
}

debugSteps();
