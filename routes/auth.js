// routes/auth.js
<<<<<<< HEAD
const { pool } = require("../lib/database");
=======
const db = require("../lib/db");
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
const { hashPassword, verifyPassword, sign } = require("../lib/auth");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");

function publicRider(r) {
<<<<<<< HEAD
  return { id: r.id, name: r.name, phone: r.phone, created_at: r.created_at };
=======
  return { id: r.id, name: r.name, phone: r.phone, createdAt: r.createdAt };
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
}
function publicDriver(d) {
  return {
    id: d.id,
    name: d.name,
    phone: d.phone,
<<<<<<< HEAD
    license_number: d.license_number,
    status: d.status,
    online: d.online,
    bike_id: d.bike_id,
    created_at: d.created_at,
=======
    licenseNumber: d.licenseNumber,
    status: d.status,
    online: d.online,
    bikeId: d.bikeId,
    createdAt: d.createdAt,
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  };
}

function register(router) {
  // ---- Rider registration ----
  router.post(
    "/api/auth/register/rider",
    safe(async (req, res) => {
      const body = await readJsonBody(req);
      const name = (body.name || "").trim();
      const phone = (body.phone || "").trim();
      const password = body.password || "";

      if (!name || !phone || !password) {
        return sendJson(res, 400, { error: "Name, phone number and password are all required." });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { error: "Password must be at least 6 characters." });
      }
<<<<<<< HEAD

      // Check if already exists
      const exists = await pool.query('SELECT id FROM riders WHERE phone = $1', [phone]);
      if (exists.rows.length > 0) {
=======
      if (db.findOne("riders", (r) => r.phone === phone)) {
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
        return sendJson(res, 409, { error: "An account with this phone number already exists." });
      }

      const { salt, hash } = hashPassword(password);
<<<<<<< HEAD
      const id = `rider-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO riders (id, name, phone, password_salt, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, name, phone, salt, hash]
      );

      const token = sign({ sub: id, role: "rider" });
      const newRider = { id, name, phone };
      return sendJson(res, 201, { token, user: newRider, role: "rider" });
    })
  );

  // ---- Driver registration ----
=======
      const rider = {
        id: `rider-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        phone,
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
      };
      db.insert("riders", rider);
      const token = sign({ sub: rider.id, role: "rider" });
      return sendJson(res, 201, { token, user: publicRider(rider), role: "rider" });
    })
  );

  // ---- Driver registration (goes to "pending" until admin approves) ----
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  router.post(
    "/api/auth/register/driver",
    safe(async (req, res) => {
      const body = await readJsonBody(req);
      const name = (body.name || "").trim();
      const phone = (body.phone || "").trim();
      const password = body.password || "";
      const licenseNumber = (body.licenseNumber || "").trim();
      const bike = body.bike || {};

      if (!name || !phone || !password || !licenseNumber) {
<<<<<<< HEAD
        return sendJson(res, 400, { error: "Name, phone, password and license number are required." });
=======
        return sendJson(res, 400, {
          error: "Name, phone number, password and license number are all required.",
        });
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      }
      if (!bike.plate || !bike.model) {
        return sendJson(res, 400, { error: "Bike plate number and model are required." });
      }
<<<<<<< HEAD

      // Check if phone already used
      const exists = await pool.query('SELECT id FROM drivers WHERE phone = $1', [phone]);
      if (exists.rows.length > 0) {
=======
      if (db.findOne("drivers", (d) => d.phone === phone)) {
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
        return sendJson(res, 409, { error: "An account with this phone number already exists." });
      }

      const { salt, hash } = hashPassword(password);
      const driverId = `driver-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
<<<<<<< HEAD
      const bikeId = `bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Insert bike
      await pool.query(
        `INSERT INTO bikes (id, plate, model, color, driver_id, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [bikeId, bike.plate.trim(), bike.model.trim(), (bike.color || "").trim(), driverId]
      );

      // Insert driver
      await pool.query(
        `INSERT INTO drivers (id, name, phone, password_salt, password_hash,
          license_number, bike_id, status, online)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', false)`,
        [driverId, name, phone, salt, hash, licenseNumber, bikeId]
      );

      return sendJson(res, 201, {
        message: "Application submitted. An admin will review your details.",
        driver: { id: driverId, name, phone, license_number: licenseNumber, status: "pending", online: false },
=======

      const bikeRecord = {
        id: `bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        plate: bike.plate.trim(),
        model: bike.model.trim(),
        color: (bike.color || "").trim(),
        driverId,
        status: "pending", // becomes "active" once the driver is approved
        createdAt: new Date().toISOString(),
      };
      db.insert("bikes", bikeRecord);

      const driver = {
        id: driverId,
        name,
        phone,
        passwordSalt: salt,
        passwordHash: hash,
        licenseNumber,
        bikeId: bikeRecord.id,
        status: "pending", // pending | approved | rejected
        online: false,
        createdAt: new Date().toISOString(),
      };
      db.insert("drivers", driver);

      return sendJson(res, 201, {
        message: "Application submitted. An admin will review your details before you can go online.",
        driver: publicDriver(driver),
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      });
    })
  );

<<<<<<< HEAD
  // ---- Unified login ----
=======
  // ---- Unified login for riders, drivers and admins ----
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  router.post(
    "/api/auth/login",
    safe(async (req, res) => {
      const body = await readJsonBody(req);
      const phone = (body.phone || "").trim();
      const password = body.password || "";
<<<<<<< HEAD
      const role = body.role;

      if (!phone || !password || !role) {
        return sendJson(res, 400, { error: "Phone, password and role are required." });
      }

      let table, idField;
      if (role === "admin") { table = "admins"; idField = "id"; }
      else if (role === "driver") { table = "drivers"; idField = "id"; }
      else { table = "riders"; idField = "id"; }

      const result = await pool.query(`SELECT * FROM ${table} WHERE phone = $1`, [phone]);
      const account = result.rows[0];
      if (!account || !verifyPassword(password, account.password_salt, account.password_hash)) {
        return sendJson(res, 401, { error: "Incorrect phone or password." });
      }

      if (role === "driver") {
        if (account.status === "pending") {
          return sendJson(res, 403, { error: "Your driver application is still pending approval." });
        }
        if (account.status === "rejected") {
          return sendJson(res, 403, { error: "Your driver application was not approved." });
        }
      }

      const token = sign({ sub: account[idField], role });
      const publicUser = role === "rider" ? publicRider(account) :
                         role === "driver" ? publicDriver(account) :
                         { id: account.id, name: account.name };
=======
      const role = body.role; // "rider" | "driver" | "admin"

      if (!phone || !password || !role) {
        return sendJson(res, 400, { error: "Phone number, password and role are required." });
      }

      const table = role === "admin" ? "admins" : role === "driver" ? "drivers" : "riders";
      const account = db.findOne(table, (a) => a.phone === phone);
      if (!account || !verifyPassword(password, account.passwordSalt, account.passwordHash)) {
        return sendJson(res, 401, { error: "Incorrect phone number or password." });
      }

      if (role === "driver" && account.status === "pending") {
        return sendJson(res, 403, {
          error: "Your driver application is still pending admin approval.",
        });
      }
      if (role === "driver" && account.status === "rejected") {
        return sendJson(res, 403, { error: "Your driver application was not approved. Contact support." });
      }

      const token = sign({ sub: account.id, role });
      const publicUser =
        role === "rider" ? publicRider(account) : role === "driver" ? publicDriver(account) : { id: account.id, name: account.name };
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 200, { token, user: publicUser, role });
    })
  );

  // ---- Current user ----
  router.get(
    "/api/auth/me",
    requireAuth()(async (req, res) => {
      const { sub, role } = req.user;
<<<<<<< HEAD
      let table;
      if (role === "admin") table = "admins";
      else if (role === "driver") table = "drivers";
      else table = "riders";

      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [sub]);
      const account = result.rows[0];
      if (!account) return sendJson(res, 404, { error: "Account not found." });

      const publicUser = role === "rider" ? publicRider(account) :
                         role === "driver" ? publicDriver(account) :
                         { id: account.id, name: account.name };
=======
      const table = role === "admin" ? "admins" : role === "driver" ? "drivers" : "riders";
      const account = db.findOne(table, (a) => a.id === sub);
      if (!account) return sendJson(res, 404, { error: "Account not found." });
      const publicUser =
        role === "rider" ? publicRider(account) : role === "driver" ? publicDriver(account) : { id: account.id, name: account.name };
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 200, { user: publicUser, role });
    })
  );
}

module.exports = { register, publicRider, publicDriver };
