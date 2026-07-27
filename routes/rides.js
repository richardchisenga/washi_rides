const express = require('express');
const auth = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

router.post('/', auth, (req, res) => {
  if (req.user.role !== 'rider') return res.status(403).json({ error: 'Only riders can book.' });
  const { pickup, destination } = req.body;
  if (!pickup || !destination) return res.status(400).json({ error: 'Pickup and destination required.' });
  const result = db.prepare("INSERT INTO rides (rider_id, pickup, destination) VALUES (?, ?, ?)").run(req.user.id, pickup, destination);
  res.status(201).json(db.prepare("SELECT * FROM rides WHERE id = ?").get(result.lastInsertRowid));
});

router.get('/my', auth, (req, res) => {
  let rides;
  if (req.user.role === 'rider') rides = db.prepare("SELECT * FROM rides WHERE rider_id = ? ORDER BY created_at DESC").all(req.user.id);
  else if (req.user.role === 'driver') rides = db.prepare("SELECT * FROM rides WHERE driver_id = ? ORDER BY created_at DESC").all(req.user.id);
  else return res.status(403).json({ error: 'Invalid role.' });
  res.json(rides);
});

router.patch('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found.' });
  if (status === 'accepted' && req.user.role === 'driver') db.prepare("UPDATE rides SET driver_id = ?, status = ? WHERE id = ?").run(req.user.id, status, req.params.id);
  else if (status === 'completed' && req.user.role === 'driver' && ride.driver_id === req.user.id) db.prepare("UPDATE rides SET status = ? WHERE id = ?").run(status, req.params.id);
  else if (status === 'cancelled' && req.user.role === 'rider' && ride.rider_id === req.user.id) db.prepare("UPDATE rides SET status = ? WHERE id = ?").run(status, req.params.id);
  else return res.status(403).json({ error: 'Not authorized.' });
  res.json(db.prepare("SELECT * FROM rides WHERE id = ?").get(req.params.id));
});

router.get('/available-drivers', auth, (req, res) => {
  const drivers = db.prepare(`SELECT u.id, u.name, u.phone, d.bike_model, d.plate_number FROM users u JOIN drivers d ON u.id = d.user_id WHERE u.role = 'driver' AND d.status = 'approved'`).all();
  res.json(drivers);
});

module.exports = router;
