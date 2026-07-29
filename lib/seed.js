// lib/seed.js
const { pool } = require('./database');
const { hashPassword } = require('./auth');

async function seed() {
  const client = await pool.connect();
  try {
    // Check if admin exists
    const adminCheck = await client.query('SELECT * FROM admins LIMIT 1');
    if (adminCheck.rows.length === 0) {
      const { salt, hash } = hashPassword('admin123');
      await client.query(
        `INSERT INTO admins (id, name, phone, password_salt, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['admin-1', 'Washi Admin', 'admin', salt, hash]
      );
      console.log('✅ Seeded default admin login -> phone: "admin", password: "admin123"');
    }

    // Check if subscription plans exist
    const planCheck = await client.query('SELECT * FROM subscription_plans LIMIT 1');
    if (planCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO subscription_plans (id, name, price_kwacha, duration_days, discount_percent, perks)
        VALUES
          ('plan-payg', 'Pay As You Go', 0, 0, 0, ARRAY['No commitment', 'Standard fares', 'Cancel anytime']),
          ('plan-weekly', 'Weekly Rider', 50, 7, 10, ARRAY['10% off every ride', 'Priority driver matching', 'Valid for 7 days']),
          ('plan-monthly', 'Monthly Rider', 150, 30, 20, ARRAY['20% off every ride', 'Priority driver matching', 'Valid for 30 days'])
      `);
      console.log('✅ Seeded subscription plans.');
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
  }
}

module.exports = { seed };
