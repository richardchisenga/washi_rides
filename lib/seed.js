// lib/seed.js
// Creates the data files and a default admin account the first time the
// server runs, so there's always a way in.

const db = require("./db");
const { hashPassword } = require("./auth");

function seed() {
  db.ensureFile("riders", []);
  db.ensureFile("drivers", []);
  db.ensureFile("bikes", []);
  db.ensureFile("rides", []);
  db.ensureFile("payments", []);
  db.ensureFile("subscription_plans", []);
  db.ensureFile("subscriptions", []);
  db.ensureFile("admins", []);

  const admins = db.readTable("admins");
  if (admins.length === 0) {
    const { salt, hash } = hashPassword("admin123");
    db.insert("admins", {
      id: "admin-1",
      name: "Washi Admin",
      phone: "admin",
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    });
    console.log('Seeded default admin login -> phone: "admin", password: "admin123"');
    console.log("Change this password after first login.");
  }

  const plans = db.readTable("subscription_plans");
  if (plans.length === 0) {
    db.writeTable("subscription_plans", [
      {
        id: "plan-payg",
        name: "Pay As You Go",
        priceKwacha: 0,
        durationDays: 0,
        discountPercent: 0,
        perks: ["No commitment", "Standard fares", "Cancel anytime"],
      },
      {
        id: "plan-weekly",
        name: "Weekly Rider",
        priceKwacha: 50,
        durationDays: 7,
        discountPercent: 10,
        perks: ["10% off every ride", "Priority driver matching", "Valid for 7 days"],
      },
      {
        id: "plan-monthly",
        name: "Monthly Rider",
        priceKwacha: 150,
        durationDays: 30,
        discountPercent: 20,
        perks: ["20% off every ride", "Priority driver matching", "Valid for 30 days"],
      },
    ]);
  }
}

module.exports = { seed };
