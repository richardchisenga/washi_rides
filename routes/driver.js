// routes/driver.js
<<<<<<< HEAD
const { pool } = require("../lib/database");
=======
const db = require("../lib/db");
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");
const { buildTrackingPlan } = require("../lib/tracking");

function register(router) {
  // ---- Go online / offline ----
  router.patch(
    "/api/driver/status",
    requireAuth(["driver"])(async (req, res) => {
      const body = await readJsonBody(req);
<<<<<<< HEAD
      const driverRes = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.user.sub]);
      const driver = driverRes.rows[0];
=======
      const driver = db.findOne("drivers", (d) => d.id === req.user.sub);
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      if (driver.status !== "approved") {
        return sendJson(res, 403, { error: "Your account isn't approved yet." });
      }
<<<<<<< HEAD
      await pool.query('UPDATE drivers SET online = $1 WHERE id = $2', [!!body.online, driver.id]);
      return sendJson(res, 200, { online: !!body.online });
=======
      const updated = db.update("drivers", (d) => d.id === driver.id, (d) => ({
        ...d,
        online: Boolean(body.online),
      }));
      return sendJson(res, 200, { online: updated.online });
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
    })
  );

  // ---- My bike ----
  router.get(
    "/api/driver/me",
    requireAuth(["driver"])(async (req, res) => {
<<<<<<< HEAD
      const driverRes = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.user.sub]);
      const driver = driverRes.rows[0];
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      const bikeRes = await pool.query('SELECT * FROM bikes WHERE id = $1', [driver.bike_id]);
      const bike = bikeRes.rows[0] || null;
=======
      const driver = db.findOne("drivers", (d) => d.id === req.user.sub);
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      const bike = db.findOne("bikes", (b) => b.id === driver.bikeId);
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
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

<<<<<<< HEAD
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
=======
  // ---- Ride requests directed at this driver ----
  router.get(
    "/api/driver/rides",
    requireAuth(["driver"])(async (req, res) => {
      const rides = db
        .findAll("rides", (r) => r.driverId === req.user.sub && r.status !== "cancelled")
        .reverse();
      const riders = db.readTable("riders");
      const shaped = rides.map((r) => {
        const rider = riders.find((rd) => rd.id === r.riderId);
        const { trackingPlan, ...rest } = r;
        return { ...rest, riderName: rider ? rider.name : "Rider" };
      });
      return sendJson(res, 200, { rides: shaped });
    })
  );

  // ---- Accept a ride request ----
  router.post(
    "/api/driver/rides/:id/accept",
    requireAuth(["driver"])(async (req, res, params) => {
      const ride = db.findOne("rides", (r) => r.id === params.id && r.driverId === req.user.sub);
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      if (ride.status !== "requested") {
        return sendJson(res, 400, { error: "This ride is no longer awaiting acceptance." });
      }
      const trackingPlan = buildTrackingPlan(ride.pickup, ride.destination);
      const updated = db.update("rides", (r) => r.id === ride.id, (r) => ({
        ...r,
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        trackingPlan,
      }));
      const { trackingPlan: _omit, ...publicRide } = updated;
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 200, { ride: publicRide });
    })
  );

<<<<<<< HEAD
  // ---- Decline a ride ----
  router.post(
    "/api/driver/rides/:id/decline",
    requireAuth(["driver"])(async (req, res, params) => {
      const result = await pool.query(
        'UPDATE rides SET status = $1 WHERE id = $2 AND driver_id = $3 RETURNING *',
        ['cancelled', params.id, req.user.sub]
      );
      if (result.rowCount === 0) return sendJson(res, 404, { error: "Ride not found." });
=======
  // ---- Decline a ride request ----
  router.post(
    "/api/driver/rides/:id/decline",
    requireAuth(["driver"])(async (req, res, params) => {
      const ride = db.findOne("rides", (r) => r.id === params.id && r.driverId === req.user.sub);
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      db.update("rides", (r) => r.id === ride.id, (r) => ({ ...r, status: "cancelled" }));
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 200, { message: "Ride declined." });
    })
  );
}

module.exports = { register };
