
// lib/database.js
const { Pool } = require('pg');

// Render automatically sets the DATABASE_URL environment variable
// if you attach a PostgreSQL database to your service.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render's managed PostgreSQL
  }
});

module.exports = { pool };
