const express = require('express');
const auth = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

router.post('/', auth, (req, res) => {
  const { ride_id, amount, network, phone } = req.body;
  if (!amount || !network || !phone) return res.status(400).json({ error: 'Amount, network, and phone required.' });
  const result = db.prepare("INSERT INTO payments (ride_id, user_id, amount, network, phone, status) VALUES (?, ?, ?, ?, ?, 'success')").run(ride_id || null, req.user.id, amount, network, phone);
  res.status(201).json({ paymentId: result.lastInsertRowid, status: 'success' });
});

router.get('/my', auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id));
});

module.exports = router;
