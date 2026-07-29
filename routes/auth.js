// routes/auth.js
const db = require("../lib/db");
const { hashPassword, verifyPassword, sign } = require("../lib/auth");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");

function publicRider(r) {
  return { id: r.id, name: r.name, phone: r.phone, createdAt: r.createdAt };
}
function publicDriver(d) {
  return {
    id: d.id,
    name: d.name,
    phone: d.phone,
    licenseNumber: d.licenseNumber,
    status: d.status,
    online: d.online,
    bikeId: d.bikeId,
    createdAt: d.createdAt,
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
      if (db.findOne("riders", (r) => r.phone === phone)) {
        return sendJson(res, 409, { error: "An account with this phone number already exists." });
      }

      const { salt, hash } = hashPassword(password);
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
        return sendJson(res, 400, {
          error: "Name, phone number, password and license number are all required.",
        });
      }
      if (!bike.plate || !bike.model) {
        return sendJson(res, 400, { error: "Bike plate number and model are required." });
      }
      if (db.findOne("drivers", (d) => d.phone === phone)) {
        return sendJson(res, 409, { error: "An account with this phone number already exists." });
      }

      const { salt, hash } = hashPassword(password);
      const driverId = `driver-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
      });
    })
  );

  // ---- Unified login for riders, drivers and admins ----
  router.post(
    "/api/auth/login",
    safe(async (req, res) => {
      const body = await readJsonBody(req);
      const phone = (body.phone || "").trim();
      const password = body.password || "";
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
      return sendJson(res, 200, { token, user: publicUser, role });
    })
  );

  // ---- Current user ----
  router.get(
    "/api/auth/me",
    requireAuth()(async (req, res) => {
      const { sub, role } = req.user;
      const table = role === "admin" ? "admins" : role === "driver" ? "drivers" : "riders";
      const account = db.findOne(table, (a) => a.id === sub);
      if (!account) return sendJson(res, 404, { error: "Account not found." });
      const publicUser =
        role === "rider" ? publicRider(account) : role === "driver" ? publicDriver(account) : { id: account.id, name: account.name };
      return sendJson(res, 200, { user: publicUser, role });
    })
  );
}

module.exports = { register, publicRider, publicDriver };
