require("dotenv").config();
const { Pool } = require('pg');

async function checkStructure() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    console.log("--- Structure of 'jobs' ---");
    const jobsCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs' ORDER BY ordinal_position;");
    console.log("Columns in 'jobs':", JSON.stringify(jobsCols.rows, null, 2));

    console.log("\n--- Structure of 'admin_jobs' ---");
    const adminJobsCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_jobs' ORDER BY ordinal_position;");
    console.log("Columns in 'admin_jobs':", JSON.stringify(adminJobsCols.rows, null, 2));

  } catch (err) {
    console.error("Error checking structures:", err.message);
  } finally {
    await pool.end();
  }
}

checkStructure();
