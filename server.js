require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();

// ----- Middleware -----
app.use(cors());
app.use(express.json());

// ✅ Serve static files from the "public" folder (MUST come before the catch‑all)
app.use(express.static(path.join(__dirname, 'public')));

// ----- API Routes -----
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const driverRoutes = require('./routes/drivers');
const adminRoutes = require('./routes/admin');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);

// ----- Catch‑all: serve index.html for any other request (SPA support) -----
// This MUST come after all API routes and static middleware.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----- Start server -----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚗 Washi Rides running on port ${PORT}`);
});
