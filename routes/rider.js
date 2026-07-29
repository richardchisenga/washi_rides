// routes/rider.js
<<<<<<< HEAD
const { pool } = require("../lib/database");
=======
const db = require("../lib/db");
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");
const { DESTINATIONS } = require("../lib/places");
const { calculateFare } = require("../lib/fare");
const { buildTrackingPlan, getTrackingState } = require("../lib/tracking");

<<<<<<< HEAD
async function activeSubscription(riderId) {
  const res = await pool.query(
    `SELECT s.*, p.*
     FROM subscriptions s
     JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.rider_id = $1 AND s.expires_at > NOW()
     ORDER BY s.expires_at DESC LIMIT 1`,
    [riderId]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return { ...row, plan: { id: row.plan_id, name: row.name, price_kwacha: row.price_kwacha, duration_days: row.duration_days, discount_percent: row.discount_percent, perks: row.perks } };
}

function publicRide(ride) {
  const { tracking_plan, ...rest } = ride;
=======
function activeSubscription(riderId) {
  const sub = db.findOne(
    "subscriptions",
    (s) => s.riderId === riderId && new Date(s.expiresAt).getTime() > Date.now()
  );
  if (!sub) return null;
  const plan = db.findOne("subscription_plans", (p) => p.id === sub.planId);
  return plan ? { ...sub, plan } : null;
}

function publicRide(ride) {
  const { trackingPlan, ...rest } = ride;
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  return rest;
}

function register(router) {
<<<<<<< HEAD
  router.get(
    "/api/destinations",
    safe(async (req, res) => sendJson(res, 200, { destinations: DESTINATIONS.map(d => d.name) }))
  );

=======
  // ---- Destinations for the quick-book shortcuts ----
  router.get(
    "/api/destinations",
    safe(async (req, res) => sendJson(res, 200, { destinations: DESTINATIONS.map((d) => d.name) }))
  );

  // ---- Fare estimate before booking ----
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  router.post(
    "/api/rides/estimate",
    requireAuth(["rider"])(async (req, res) => {
      const body = await readJsonBody(req);
<<<<<<< HEAD
      const sub = await activeSubscription(req.user.sub);
      const discount = sub ? sub.plan.discount_percent : 0;
      const estimate = calculateFare(body.pickup, body.destination, discount);
=======
      const sub = activeSubscription(req.user.sub);
      const estimate = calculateFare(body.pickup, body.destination, sub ? sub.plan.discountPercent : 0);
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 200, { estimate, subscription: sub ? sub.plan.name : null });
    })
  );

<<<<<<< HEAD
  router.get(
    "/api/drivers/available",
    requireAuth(["rider"])(async (req, res) => {
      const result = await pool.query(
        `SELECT d.id, d.name, d.online, b.model, b.color
         FROM drivers d
         LEFT JOIN bikes b ON d.bike_id = b.id
         WHERE d.status = 'approved' AND d.online = true`
      );
      const drivers = result.rows.map(d => ({
        id: d.id,
        name: d.name,
        online: d.online,
        bike: d.model ? `${d.model}${d.color ? ' - ' + d.color : ''}` : null,
      }));
      return sendJson(res, 200, { drivers });
    })
  );

=======
  // ---- Available drivers for the rider to choose from ----
  router.get(
    "/api/drivers/available",
    requireAuth(["rider"])(async (req, res) => {
      const drivers = db.findAll("drivers", (d) => d.status === "approved" && d.online);
      const bikes = db.readTable("bikes");
      const shaped = drivers.map((d) => ({
        id: d.id,
        name: d.name,
        online: d.online,
        bike: (() => {
          const bike = bikes.find((b) => b.id === d.bikeId);
          return bike ? `${bike.model}${bike.color ? " - " + bike.color : ""}` : null;
        })(),
      }));
      return sendJson(res, 200, { drivers: shaped });
    })
  );

  // ---- Create a ride request ----
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  router.post(
    "/api/rides",
    requireAuth(["rider"])(async (req, res) => {
      const body = await readJsonBody(req);
      const { pickup, destination, driverId } = body;
      if (!pickup || !destination || !driverId) {
<<<<<<< HEAD
        return sendJson(res, 400, { error: "Pickup, destination and driver are required." });
      }
      // Check driver exists and is approved
      const driverCheck = await pool.query(
        'SELECT id FROM drivers WHERE id = $1 AND status = $2',
        [driverId, 'approved']
      );
      if (driverCheck.rowCount === 0) {
        return sendJson(res, 404, { error: "That driver is no longer available." });
      }

      const sub = await activeSubscription(req.user.sub);
      const discount = sub ? sub.plan.discount_percent : 0;
      const fareBreakdown = calculateFare(pickup, destination, discount);

      const rideId = `ride-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO rides (id, rider_id, driver_id, pickup, destination, status, fare, distance_km)
         VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7)`,
        [rideId, req.user.sub, driverId, pickup, destination, fareBreakdown.fare, fareBreakdown.distanceKm]
      );

      const ride = (await pool.query('SELECT * FROM rides WHERE id = $1', [rideId])).rows[0];
=======
        return sendJson(res, 400, { error: "Pickup, destination and a chosen rider are required." });
      }
      const driver = db.findOne("drivers", (d) => d.id === driverId && d.status === "approved");
      if (!driver) return sendJson(res, 404, { error: "That rider is no longer available." });

      const sub = activeSubscription(req.user.sub);
      const fareBreakdown = calculateFare(pickup, destination, sub ? sub.plan.discountPercent : 0);

      const ride = {
        id: `ride-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        riderId: req.user.sub,
        driverId,
        pickup,
        destination,
        status: "requested", // requested | accepted | in_progress | completed | cancelled
        fare: fareBreakdown.fare,
        distanceKm: fareBreakdown.distanceKm,
        createdAt: new Date().toISOString(),
        acceptedAt: null,
        completedAt: null,
        trackingPlan: null,
      };
      db.insert("rides", ride);
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 201, { ride: publicRide(ride) });
    })
  );

<<<<<<< HEAD
  router.get(
    "/api/rides/:id",
    requireAuth()(async (req, res, params) => {
      const rideRes = await pool.query('SELECT * FROM rides WHERE id = $1', [params.id]);
      const ride = rideRes.rows[0];
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      if (req.user.role === 'rider' && ride.rider_id !== req.user.sub) {
        return sendJson(res, 403, { error: "Not your ride." });
      }
      if (req.user.role === 'driver' && ride.driver_id !== req.user.sub) {
        return sendJson(res, 403, { error: "Not your ride." });
      }

      let tracking = null;
      if (ride.tracking_plan) {
        tracking = getTrackingState(ride.tracking_plan);
        if (tracking.phase === 'completed' && ride.status !== 'completed') {
          await pool.query(
            `UPDATE rides SET status = 'completed', completed_at = NOW() WHERE id = $1`,
            [ride.id]
          );
          ride.status = 'completed';
        }
      }

      const driverRes = await pool.query('SELECT name FROM drivers WHERE id = $1', [ride.driver_id]);
      const driverName = driverRes.rows[0]?.name || null;

      return sendJson(res, 200, {
        ride: publicRide(ride),
        driverName,
=======
  // ---- Poll a ride's status + simulated tracking ----
  router.get(
    "/api/rides/:id",
    requireAuth()(async (req, res, params) => {
      const ride = db.findOne("rides", (r) => r.id === params.id);
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      if (req.user.role === "rider" && ride.riderId !== req.user.sub) {
        return sendJson(res, 403, { error: "This isn't your ride." });
      }
      if (req.user.role === "driver" && ride.driverId !== req.user.sub) {
        return sendJson(res, 403, { error: "This isn't your ride." });
      }

      let tracking = null;
      if (ride.trackingPlan) {
        tracking = getTrackingState(ride.trackingPlan);
        if (tracking.phase === "completed" && ride.status !== "completed") {
          db.update("rides", (r) => r.id === ride.id, (r) => ({
            ...r,
            status: "completed",
            completedAt: new Date().toISOString(),
          }));
          ride.status = "completed";
        }
      }

      const driver = db.findOne("drivers", (d) => d.id === ride.driverId);
      return sendJson(res, 200, {
        ride: publicRide(ride),
        driverName: driver ? driver.name : null,
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
        tracking,
      });
    })
  );

<<<<<<< HEAD
  router.post(
    "/api/rides/:id/cancel",
    requireAuth(["rider"])(async (req, res, params) => {
      const rideRes = await pool.query(
        'SELECT * FROM rides WHERE id = $1 AND rider_id = $2',
        [params.id, req.user.sub]
      );
      const ride = rideRes.rows[0];
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      if (['completed', 'cancelled'].includes(ride.status)) {
        return sendJson(res, 400, { error: "Cannot cancel this ride now." });
      }
      await pool.query('UPDATE rides SET status = $1 WHERE id = $2', ['cancelled', ride.id]);
=======
  // ---- Cancel a ride (rider side) ----
  router.post(
    "/api/rides/:id/cancel",
    requireAuth(["rider"])(async (req, res, params) => {
      const ride = db.findOne("rides", (r) => r.id === params.id && r.riderId === req.user.sub);
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      if (["completed", "cancelled"].includes(ride.status)) {
        return sendJson(res, 400, { error: "This ride can no longer be cancelled." });
      }
      db.update("rides", (r) => r.id === ride.id, (r) => ({ ...r, status: "cancelled" }));
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 200, { message: "Ride cancelled." });
    })
  );

<<<<<<< HEAD
  router.get(
    "/api/rides",
    requireAuth(["rider"])(async (req, res) => {
      const result = await pool.query(
        'SELECT * FROM rides WHERE rider_id = $1 ORDER BY created_at DESC',
        [req.user.sub]
      );
      const rides = result.rows.map(publicRide);
=======
  // ---- Rider's own ride history ----
  router.get(
    "/api/rides",
    requireAuth(["rider"])(async (req, res) => {
      const rides = db.findAll("rides", (r) => r.riderId === req.user.sub).map(publicRide).reverse();
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 200, { rides });
    })
  );

<<<<<<< HEAD
  router.get(
    "/api/subscriptions/plans",
    requireAuth()(async (req, res) => {
      const result = await pool.query('SELECT * FROM subscription_plans');
      return sendJson(res, 200, { plans: result.rows });
=======
  // ---- Subscription plans (public to logged-in riders) ----
  router.get(
    "/api/subscriptions/plans",
    requireAuth()(async (req, res) => {
      const plans = db.readTable("subscription_plans");
      return sendJson(res, 200, { plans });
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
    })
  );

  router.get(
    "/api/subscriptions/me",
    requireAuth(["rider"])(async (req, res) => {
<<<<<<< HEAD
      const sub = await activeSubscription(req.user.sub);
      return sendJson(res, 200, { subscription: sub });
    })
  );
=======
      const sub = activeSubscription(req.user.sub);
      return sendJson(res, 200, { subscription: sub });
    })
  );

>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
}

module.exports = { register, activeSubscription, publicRide };
