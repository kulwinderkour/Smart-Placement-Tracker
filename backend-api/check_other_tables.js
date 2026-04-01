require("dotenv").config();
const { Pool } = require('pg');

async function checkOtherTables() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    console.log("--- Checking table 'jobs' ---");
    const jobs = await pool.query("SELECT * FROM jobs LIMIT 10;");
    console.log("Jobs found in 'jobs' table:", JSON.stringify(jobs.rows, null, 2));

    console.log("\n--- Checking Amazon in 'jobs' ---");
    const amazonJobs = await pool.query("SELECT * FROM jobs WHERE LOWER(title) LIKE '%amazon%' OR LOWER(company) LIKE '%amazon%';");
    console.log("Amazon jobs found count in 'jobs':", amazonJobs.rows.length);
    console.log("Amazon jobs data from 'jobs':", JSON.stringify(amazonJobs.rows, null, 2));

  } catch (err) {
    console.error("Error during checking other tables:", err.message);
  } finally {
    await pool.end();
  }
}

checkOtherTables();
