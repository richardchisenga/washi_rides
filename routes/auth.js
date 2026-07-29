// routes/auth.js
const { pool } = require("../lib/database");
const { hashPassword, verifyPassword, sign } = require("../lib/auth");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");

function publicRider(r) {
  return { id: r.id, name: r.name, phone: r.phone, created_at: r.created_at };
}
function publicDriver(d) {
  return {
    id: d.id,
    name: d.name,
    phone: d.phone,
    license_number: d.license_number,
    status: d.status,
    online: d.online,
    bike_id: d.bike_id,
    created_at: d.created_at,
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

      // Check if already exists
      const exists = await pool.query('SELECT id FROM riders WHERE phone = $1', [phone]);
      if (exists.rows.length > 0) {
        return sendJson(res, 409, { error: "An account with this phone number already exists." });
      }

      const { salt, hash } = hashPassword(password);
      const id = `rider-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO riders (id, name, phone, password_salt, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, name, phone, salt, hash]
      );

      const token = sign({ sub: id, role: "rider" });
      const newRider = { id, name, phone };
      return sendJson(res, 201, { token, user: newRider, role: "rider" });
    })
  );

  // ---- Driver registration ----
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
        return sendJson(res, 400, { error: "Name, phone, password and license number are required." });
      }
      if (!bike.plate || !bike.model) {
        return sendJson(res, 400, { error: "Bike plate number and model are required." });
      }

      // Check if phone already used
      const exists = await pool.query('SELECT id FROM drivers WHERE phone = $1', [phone]);
      if (exists.rows.length > 0) {
        return sendJson(res, 409, { error: "An account with this phone number already exists." });
      }

      const { salt, hash } = hashPassword(password);
      const driverId = `driver-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const bikeId = `bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Insert bike
      await pool.query(
        `INSERT INTO bikes (id, plate, model, color, driver_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
        [bikeId, bike.plate.trim(), bike.model.trim(), (bike.color || "").trim(), driverId]
      );

      // Insert driver
      await pool.query(
        `INSERT INTO drivers (id, name, phone, password_salt, password_hash,
          license_number, bike_id, status, online, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', false, NOW())`,
        [driverId, name, phone, salt, hash, licenseNumber, bikeId]
      );

      return sendJson(res, 201, {
        message: "Application submitted. An admin will review your details.",
        driver: { id: driverId, name, phone, license_number: licenseNumber, status: "pending", online: false },
      });
    })
  );

  // ---- Unified login ----
  router.post(
    "/api/auth/login",
    safe(async (req, res) => {
      const body = await readJsonBody(req);
      const phone = (body.phone || "").trim();
      const password = body.password || "";
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
      return sendJson(res, 200, { token, user: publicUser, role });
    })
  );

  // ---- Current user ----
  router.get(
    "/api/auth/me",
    requireAuth()(async (req, res) => {
      const { sub, role } = req.user;
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
      return sendJson(res, 200, { user: publicUser, role });
    })
  );
}

module.exports = { register, publicRider, publicDriver };
