
// lib/schema.js
const { pool } = require('./database');

async function initSchema() {
  const client = await pool.connect();
  try {
    console.log('📦 Creating database tables if they don\'t exist...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        name TEXT,
        password TEXT,
        role TEXT DEFAULT 'rider' CHECK (role IN ('rider', 'driver', 'admin'))
      );

      CREATE TABLE IF NOT EXISTS riders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        current_location TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vehicle_type TEXT,
        license_plate TEXT,
        is_available BOOLEAN DEFAULT true,
        current_location TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rides (
        id SERIAL PRIMARY KEY,
        rider_id INTEGER REFERENCES users(id),
        driver_id INTEGER REFERENCES users(id),
        pickup TEXT NOT NULL,
        dropoff TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
        fare DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        ride_id INTEGER REFERENCES rides(id),
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2),
        method TEXT,
        status TEXT DEFAULT 'pending',
        transaction_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database schema ready.');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err);
  } finally {
    client.release();
  }
}

module.exports = { initSchema };
