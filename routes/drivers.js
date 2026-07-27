const express = require('express');
const auth = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

router.post('/register', auth, (req, res) => {
  if (req.user.role !== 'rider') return res.status(403).json({ error: 'Only riders can become drivers.' });
  const { bike_model, plate_number, license_number } = req.body;
  if (!bike_model || !plate_number || !license_number) return res.status(400).json({ error: 'All bike details required.' });
  if (db.prepare("SELECT * FROM drivers WHERE user_id = ?").get(req.user.id)) return res.status(400).json({ error: 'Already registered.' });
  db.prepare("INSERT INTO drivers (user_id, bike_model, plate_number, license_number) VALUES (?, ?, ?, ?)").run(req.user.id, bike_model, plate_number, license_number);
  db.prepare("UPDATE users SET role = 'driver' WHERE id = ?").run(req.user.id);
  res.status(201).json({ message: 'Driver registration pending admin approval.' });
});

router.get('/status', auth, (req, res) => {
  const driver = db.prepare("SELECT * FROM drivers WHERE user_id = ?").get(req.user.id);
  res.json(driver ? { registered: true, status: driver.status } : { registered: false });
});

module.exports = router;
