// routes/driver.js
const { pool } = require("../lib/database");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");
const { buildTrackingPlan } = require("../lib/tracking");

function register(router) {
  // ---- Go online / offline ----
  router.patch(
    "/api/driver/status",
    requireAuth(["driver"])(async (req, res) => {
      const body = await readJsonBody(req);
      const driverRes = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.user.sub]);
      const driver = driverRes.rows[0];
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      if (driver.status !== "approved") {
        return sendJson(res, 403, { error: "Your account isn't approved yet." });
      }
      await pool.query('UPDATE drivers SET online = $1 WHERE id = $2', [!!body.online, driver.id]);
      return sendJson(res, 200, { online: !!body.online });
    })
  );

  // ---- My bike ----
  router.get(
    "/api/driver/me",
    requireAuth(["driver"])(async (req, res) => {
      const driverRes = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.user.sub]);
      const driver = driverRes.rows[0];
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      const bikeRes = await pool.query('SELECT * FROM bikes WHERE id = $1', [driver.bike_id]);
      const bike = bikeRes.rows[0] || null;
      return sendJson(res, 200, {
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          status: driver.status,
          online: driver.online,
        },
        bike,
      });
    })
  );

  // ---- Ride requests for this driver ----
  router.get(
    "/api/driver/rides",
    requireAuth(["driver"])(async (req, res) => {
      const result = await pool.query(
        `SELECT r.*, rd.name as rider_name
         FROM rides r
         JOIN riders rd ON r.rider_id = rd.id
         WHERE r.driver_id = $1 AND r.status != 'cancelled'
         ORDER BY r.created_at DESC`,
        [req.user.sub]
      );
      const rides = result.rows.map(r => {
        const { tracking_plan, ...rest } = r;
        return rest;
      });
      return sendJson(res, 200, { rides });
    })
  );

  // ---- Accept a ride ----
  router.post(
    "/api/driver/rides/:id/accept",
    requireAuth(["driver"])(async (req, res, params) => {
      const rideRes = await pool.query(
        'SELECT * FROM rides WHERE id = $1 AND driver_id = $2',
        [params.id, req.user.sub]
      );
      const ride = rideRes.rows[0];
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      if (ride.status !== "requested") {
        return sendJson(res, 400, { error: "Ride no longer awaiting acceptance." });
      }
      const trackingPlan = buildTrackingPlan(ride.pickup, ride.destination);
      await pool.query(
        `UPDATE rides SET status = 'accepted', accepted_at = NOW(), tracking_plan = $1 WHERE id = $2`,
        [trackingPlan, ride.id]
      );
      const updated = await pool.query('SELECT * FROM rides WHERE id = $1', [ride.id]);
      const { tracking_plan, ...publicRide } = updated.rows[0];
      return sendJson(res, 200, { ride: publicRide });
    })
  );

  // ---- Decline a ride ----
  router.post(
    "/api/driver/rides/:id/decline",
    requireAuth(["driver"])(async (req, res, params) => {
      const result = await pool.query(
        'UPDATE rides SET status = $1 WHERE id = $2 AND driver_id = $3 RETURNING *',
        ['cancelled', params.id, req.user.sub]
      );
      if (result.rowCount === 0) return sendJson(res, 404, { error: "Ride not found." });
      return sendJson(res, 200, { message: "Ride declined." });
    })
  );
}

module.exports = { register };
