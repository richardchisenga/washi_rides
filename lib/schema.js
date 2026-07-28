// lib/schema.js
const { pool } = require('./database');

async function initSchema() {
  const client = await pool.connect();
  try {
    console.log('📦 Creating database tables if they don’t exist...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS riders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        license_number TEXT NOT NULL,
        bike_id TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        online BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bikes (
        id TEXT PRIMARY KEY,
        plate TEXT UNIQUE NOT NULL,
        model TEXT NOT NULL,
        color TEXT,
        driver_id TEXT,
        status TEXT DEFAULT 'unassigned' CHECK (status IN ('pending','active','inactive','unassigned')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY,
        rider_id TEXT NOT NULL REFERENCES riders(id),
        driver_id TEXT NOT NULL REFERENCES drivers(id),
        pickup TEXT NOT NULL,
        destination TEXT NOT NULL,
        status TEXT DEFAULT 'requested' CHECK (status IN ('requested','accepted','in_progress','completed','cancelled')),
        fare DECIMAL(10,2),
        distance_km DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT NOW(),
        accepted_at TIMESTAMP,
        completed_at TIMESTAMP,
        tracking_plan JSONB
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        rider_id TEXT NOT NULL REFERENCES riders(id),
        ride_id TEXT REFERENCES rides(id),
        plan_id TEXT,
        provider TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        purpose TEXT,
        status TEXT DEFAULT 'awaiting_pin' CHECK (status IN ('awaiting_pin','success','failed')),
        reference TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_kwacha DECIMAL(10,2) NOT NULL,
        duration_days INTEGER NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        perks TEXT[]
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        rider_id TEXT NOT NULL REFERENCES riders(id),
        plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
        payment_id TEXT REFERENCES payments(id),
        started_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database schema ready.');
  } catch (err) {
    console.error('❌ Schema init failed:', err);
  } finally {
    client.release();
  }
}

module.exports = { initSchema };
