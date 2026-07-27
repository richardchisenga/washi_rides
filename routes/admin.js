const express = require('express');
const auth = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

router.use(auth);
router.use((req, res, next) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin required.' }); next(); });

router.get('/stats', (req, res) => {
  const drivers = db.prepare("SELECT COUNT(*) as count FROM drivers").get().count;
  const bikes = db.prepare("SELECT COUNT(*) as count FROM bikes").get().count;
  const subs = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE expiry > datetime('now')").get().count;
  res.json({ drivers, bikes, subscriptions: subs });
});

router.get('/drivers', (req, res) => {
  res.json(db.prepare(`SELECT u.id as user_id, u.name, u.phone, d.* FROM drivers d JOIN users u ON d.user_id = u.id`).all());
});

router.patch('/drivers/:userId/status', (req, res) => {
  const { status } = req.body;
  if (!['pending','approved','blocked'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare("UPDATE drivers SET status = ? WHERE user_id = ?").run(status, req.params.userId);
  res.json({ message: 'Driver status updated.' });
});

router.get('/bikes', (req, res) => res.json(db.prepare("SELECT * FROM bikes").all()));
router.post('/bikes', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Model required.' });
  db.prepare("INSERT INTO bikes (model) VALUES (?)").run(model);
  res.status(201).json({ message: 'Bike added.' });
});
router.delete('/bikes/:id', (req, res) => {
  db.prepare("DELETE FROM bikes WHERE id = ?").run(req.params.id);
  res.json({ message: 'Bike removed.' });
});

module.exports = router;
