const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const db = new Database(path.join(__dirname, 'washi.db'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'rider',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    bike_model TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    license_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS bikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT UNIQUE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER NOT NULL,
    driver_id INTEGER,
    pickup TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    fare REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES users(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id INTEGER,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    network TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    plan TEXT NOT NULL,
    expiry DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Admin
const adminCheck = db.prepare("SELECT id FROM users WHERE phone = 'admin'").get();
if (!adminCheck) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (phone, name, password, role) VALUES (?, ?, ?, ?)").run('admin', 'Admin', hashed, 'admin');
}

// Seed Bikes
const bikeCount = db.prepare("SELECT COUNT(*) as count FROM bikes").get().count;
if (bikeCount === 0) {
  const models = ['Bajaj Boxer', 'TVS XL', 'Honda Wave', 'Yamaha FZ'];
  const insert = db.prepare("INSERT INTO bikes (model) VALUES (?)");
  models.forEach(m => insert.run(m));
}

module.exports = db;
