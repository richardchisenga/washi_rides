const express = require('express');
const auth = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

router.get('/my', auth, (req, res) => {
  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND expiry > datetime('now')").get(req.user.id);
  res.json(sub || null);
});

router.post('/', auth, (req, res) => {
  const { plan, days } = req.body;
  if (!plan || !days) return res.status(400).json({ error: 'Plan and days required.' });
  const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(req.user.id);
  if (existing) db.prepare("UPDATE subscriptions SET plan = ?, expiry = ? WHERE user_id = ?").run(plan, expiry.toISOString(), req.user.id);
  else db.prepare("INSERT INTO subscriptions (user_id, plan, expiry) VALUES (?, ?, ?)").run(req.user.id, plan, expiry.toISOString());
  res.json({ message: 'Subscription activated.', expiry: expiry.toISOString() });
});

module.exports = router;
