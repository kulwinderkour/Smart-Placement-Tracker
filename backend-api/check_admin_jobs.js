require("dotenv").config();
const { Pool } = require('pg');

async function checkTable() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartplacement';
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'admin_jobs'
    `);
    
    if (res.rows.length > 0) {
      console.log("Table 'admin_jobs' exists.");
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'admin_jobs'
      `);
      console.log("Columns:", columns.rows);
    } else {
      console.log("Table 'admin_jobs' does NOT exist.");
    }
  } catch (err) {
    console.error("Error checking table:", err.message);
  } finally {
    await pool.end();
  }
}

checkTable();
