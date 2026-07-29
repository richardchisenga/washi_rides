// routes/rider.js
const db = require("../lib/db");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");
const { DESTINATIONS } = require("../lib/places");
const { calculateFare } = require("../lib/fare");
const { buildTrackingPlan, getTrackingState } = require("../lib/tracking");

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
  return rest;
}

function register(router) {
  // ---- Destinations for the quick-book shortcuts ----
  router.get(
    "/api/destinations",
    safe(async (req, res) => sendJson(res, 200, { destinations: DESTINATIONS.map((d) => d.name) }))
  );

  // ---- Fare estimate before booking ----
  router.post(
    "/api/rides/estimate",
    requireAuth(["rider"])(async (req, res) => {
      const body = await readJsonBody(req);
      const sub = activeSubscription(req.user.sub);
      const estimate = calculateFare(body.pickup, body.destination, sub ? sub.plan.discountPercent : 0);
      return sendJson(res, 200, { estimate, subscription: sub ? sub.plan.name : null });
    })
  );

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
  router.post(
    "/api/rides",
    requireAuth(["rider"])(async (req, res) => {
      const body = await readJsonBody(req);
      const { pickup, destination, driverId } = body;
      if (!pickup || !destination || !driverId) {
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
      return sendJson(res, 201, { ride: publicRide(ride) });
    })
  );

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
        tracking,
      });
    })
  );

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
      return sendJson(res, 200, { message: "Ride cancelled." });
    })
  );

  // ---- Rider's own ride history ----
  router.get(
    "/api/rides",
    requireAuth(["rider"])(async (req, res) => {
      const rides = db.findAll("rides", (r) => r.riderId === req.user.sub).map(publicRide).reverse();
      return sendJson(res, 200, { rides });
    })
  );

  // ---- Subscription plans (public to logged-in riders) ----
  router.get(
    "/api/subscriptions/plans",
    requireAuth()(async (req, res) => {
      const plans = db.readTable("subscription_plans");
      return sendJson(res, 200, { plans });
    })
  );

  router.get(
    "/api/subscriptions/me",
    requireAuth(["rider"])(async (req, res) => {
      const sub = activeSubscription(req.user.sub);
      return sendJson(res, 200, { subscription: sub });
    })
  );

}

module.exports = { register, activeSubscription, publicRide };
