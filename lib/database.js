// lib/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // needed for Render's managed Postgres
});

module.exports = { pool };
