const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const router = express.Router();

router.post('/register', (req, res) => {
  const { phone, name, password, role, bike_model, plate_number, license_number } = req.body;
  if (!phone || !name || !password) return res.status(400).json({ error: 'Phone, name, and password required.' });
  const hashed = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare("INSERT INTO users (phone, name, password, role) VALUES (?, ?, ?, ?)").run(phone, name, hashed, role || 'rider');
    const userId = info.lastInsertRowid;
    if (role === 'driver') {
      if (!bike_model || !plate_number || !license_number) return res.status(400).json({ error: 'Bike details required.' });
      db.prepare("INSERT INTO drivers (user_id, bike_model, plate_number, license_number) VALUES (?, ?, ?, ?)").run(userId, bike_model, plate_number, license_number);
    }
    const token = jwt.sign({ id: userId, phone, role: role || 'rider' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, phone, name, role: role || 'rider' } });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Phone already registered.' : err.message });
  }
});

router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });
  const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials.' });
  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
});

module.exports = router;
