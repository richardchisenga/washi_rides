// routes/admin.js
const { pool } = require("../lib/database");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");

function register(router) {
  // ---- Get all drivers ----
  router.get(
    "/api/admin/drivers",
    requireAuth(["admin"])(async (req, res) => {
      const result = await pool.query(
        `SELECT d.*, b.plate, b.model, b.color
         FROM drivers d
         LEFT JOIN bikes b ON d.bike_id = b.id
         ORDER BY d.created_at DESC`
      );
      const drivers = result.rows.map(d => {
        const { password_salt, password_hash, ...rest } = d;
        return { ...rest, bike: { plate: d.plate, model: d.model, color: d.color } };
      });
      return sendJson(res, 200, { drivers });
    })
  );

  // ---- Approve driver ----
  router.post(
    "/api/admin/drivers/:id/approve",
    requireAuth(["admin"])(async (req, res, params) => {
      const update = await pool.query(
        `UPDATE drivers SET status = 'approved' WHERE id = $1 RETURNING *`,
        [params.id]
      );
      if (update.rowCount === 0) return sendJson(res, 404, { error: "Driver not found." });
      const driver = update.rows[0];
      if (driver.bike_id) {
        await pool.query('UPDATE bikes SET status = $1 WHERE id = $2', ['active', driver.bike_id]);
      }
      return sendJson(res, 200, { message: `${driver.name} approved.` });
    })
  );

  // ---- Reject driver ----
  router.post(
    "/api/admin/drivers/:id/reject",
    requireAuth(["admin"])(async (req, res, params) => {
      const update = await pool.query(
        `UPDATE drivers SET status = 'rejected', online = false WHERE id = $1 RETURNING *`,
        [params.id]
      );
      if (update.rowCount === 0) return sendJson(res, 404, { error: "Driver not found." });
      const driver = update.rows[0];
      if (driver.bike_id) {
        await pool.query('UPDATE bikes SET status = $1 WHERE id = $2', ['inactive', driver.bike_id]);
      }
      return sendJson(res, 200, { message: `${driver.name} rejected.` });
    })
  );

  // ---- Get all bikes ----
  router.get(
    "/api/admin/bikes",
    requireAuth(["admin"])(async (req, res) => {
      const result = await pool.query(
        `SELECT b.*, d.name as driver_name
         FROM bikes b
         LEFT JOIN drivers d ON b.driver_id = d.id
         ORDER BY b.created_at DESC`
      );
      return sendJson(res, 200, { bikes: result.rows });
    })
  );

  // ---- Create a bike ----
  router.post(
    "/api/admin/bikes",
    requireAuth(["admin"])(async (req, res) => {
      const body = await readJsonBody(req);
      if (!body.plate || !body.model) {
        return sendJson(res, 400, { error: "Plate and model are required." });
      }
      const id = `bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO bikes (id, plate, model, color, driver_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, body.plate.trim(), body.model.trim(), (body.color || "").trim(), body.driverId || null, body.driverId ? 'active' : 'unassigned']
      );
      const bike = (await pool.query('SELECT * FROM bikes WHERE id = $1', [id])).rows[0];
      return sendJson(res, 201, { bike });
    })
  );

  // ---- Update bike ----
  router.patch(
    "/api/admin/bikes/:id",
    requireAuth(["admin"])(async (req, res, params) => {
      const body = await readJsonBody(req);
      const fields = [];
      const values = [];
      let idx = 1;
      for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) {
          // map camelCase to snake_case
          let col = key;
          if (key === 'plate') col = 'plate';
          else if (key === 'model') col = 'model';
          else if (key === 'color') col = 'color';
          else if (key === 'driverId') col = 'driver_id';
          else if (key === 'status') col = 'status';
          else continue;
          fields.push(`${col} = $${idx}`);
          values.push(val);
          idx++;
        }
      }
      if (fields.length === 0) return sendJson(res, 400, { error: "No fields to update." });
      values.push(params.id);
      const query = `UPDATE bikes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await pool.query(query, values);
      if (result.rowCount === 0) return sendJson(res, 404, { error: "Bike not found." });
      return sendJson(res, 200, { bike: result.rows[0] });
    })
  );

  // ---- Delete bike ----
  router.delete(
    "/api/admin/bikes/:id",
    requireAuth(["admin"])(async (req, res, params) => {
      const result = await pool.query('DELETE FROM bikes WHERE id = $1 RETURNING *', [params.id]);
      if (result.rowCount === 0) return sendJson(res, 404, { error: "Bike not found." });
      return sendJson(res, 200, { message: "Bike removed." });
    })
  );

  // ---- Get all riders ----
  router.get(
    "/api/admin/riders",
    requireAuth(["admin"])(async (req, res) => {
      const ridersRes = await pool.query(
        `SELECT r.*, s.plan_id, p.name as plan_name
         FROM riders r
         LEFT JOIN subscriptions s ON r.id = s.rider_id AND s.expires_at > NOW()
         LEFT JOIN subscription_plans p ON s.plan_id = p.id
         ORDER BY r.created_at DESC`
      );
      const riders = ridersRes.rows.map(r => {
        const { password_salt, password_hash, ...rest } = r;
        return { ...rest, activePlan: r.plan_name || null };
      });
      return sendJson(res, 200, { riders });
    })
  );

  // ---- Get all rides ----
  router.get(
    "/api/admin/rides",
    requireAuth(["admin"])(async (req, res) => {
      const result = await pool.query(
        `SELECT r.*, rd.name as rider_name, d.name as driver_name
         FROM rides r
         LEFT JOIN riders rd ON r.rider_id = rd.id
         LEFT JOIN drivers d ON r.driver_id = d.id
         ORDER BY r.created_at DESC`
      );
      const rides = result.rows.map(r => {
        const { tracking_plan, ...rest } = r;
        return rest;
      });
      return sendJson(res, 200, { rides });
    })
  );

  // ---- Get subscription plans ----
  router.get(
    "/api/admin/subscriptions/plans",
    requireAuth(["admin"])(async (req, res) => {
      const result = await pool.query('SELECT * FROM subscription_plans');
      return sendJson(res, 200, { plans: result.rows });
    })
  );

  // ---- Update subscription plan ----
  router.patch(
    "/api/admin/subscriptions/plans/:id",
    requireAuth(["admin"])(async (req, res, params) => {
      const body = await readJsonBody(req);
      const fields = [];
      const values = [];
      let idx = 1;
      for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) {
          let col = key;
          if (key === 'name') col = 'name';
          else if (key === 'priceKwacha') col = 'price_kwacha';
          else if (key === 'durationDays') col = 'duration_days';
          else if (key === 'discountPercent') col = 'discount_percent';
          else if (key === 'perks') col = 'perks';
          else continue;
          fields.push(`${col} = $${idx}`);
          values.push(val);
          idx++;
        }
      }
      if (fields.length === 0) return sendJson(res, 400, { error: "No fields to update." });
      values.push(params.id);
      const query = `UPDATE subscription_plans SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await pool.query(query, values);
      if (result.rowCount === 0) return sendJson(res, 404, { error: "Plan not found." });
      return sendJson(res, 200, { plan: result.rows[0] });
    })
  );

  // ---- Get all subscriptions ----
  router.get(
    "/api/admin/subscriptions",
    requireAuth(["admin"])(async (req, res) => {
      const result = await pool.query(
        `SELECT s.*, r.name as rider_name, p.name as plan_name,
         (s.expires_at > NOW()) as active
         FROM subscriptions s
         JOIN riders r ON s.rider_id = r.id
         JOIN subscription_plans p ON s.plan_id = p.id
         ORDER BY s.started_at DESC`
      );
      return sendJson(res, 200, { subscriptions: result.rows });
    })
  );

  // ---- Dashboard stats ----
  router.get(
    "/api/admin/stats",
    requireAuth(["admin"])(async (req, res) => {
      const stats = {};
      const today = new Date().toISOString().split('T')[0];

      // Total riders
      const ridersCount = await pool.query('SELECT COUNT(*) FROM riders');
      stats.totalRiders = parseInt(ridersCount.rows[0].count);

      // Total drivers
      const driversCount = await pool.query('SELECT COUNT(*) FROM drivers');
      stats.totalDrivers = parseInt(driversCount.rows[0].count);

      // Pending drivers
      const pending = await pool.query("SELECT COUNT(*) FROM drivers WHERE status = 'pending'");
      stats.pendingDriverApprovals = parseInt(pending.rows[0].count);

      // Online drivers (approved)
      const online = await pool.query("SELECT COUNT(*) FROM drivers WHERE status = 'approved' AND online = true");
      stats.onlineDrivers = parseInt(online.rows[0].count);

      // Rides today
      const todayRides = await pool.query(
        "SELECT COUNT(*) FROM rides WHERE DATE(created_at) = $1",
        [today]
      );
      stats.ridesToday = parseInt(todayRides.rows[0].count);

      // Total rides
      const totalRides = await pool.query('SELECT COUNT(*) FROM rides');
      stats.totalRides = parseInt(totalRides.rows[0].count);

      // Revenue (sum of successful payments)
      const revenue = await pool.query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success'");
      stats.revenueKwacha = parseFloat(revenue.rows[0].coalesce);

      return sendJson(res, 200, { stats });
    })
  );
}

module.exports = { register };
