// routes/driver.js
const db = require("../lib/db");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");
const { buildTrackingPlan } = require("../lib/tracking");

function register(router) {
  // ---- Go online / offline ----
  router.patch(
    "/api/driver/status",
    requireAuth(["driver"])(async (req, res) => {
      const body = await readJsonBody(req);
      const driver = db.findOne("drivers", (d) => d.id === req.user.sub);
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      if (driver.status !== "approved") {
        return sendJson(res, 403, { error: "Your account isn't approved yet." });
      }
      const updated = db.update("drivers", (d) => d.id === driver.id, (d) => ({
        ...d,
        online: Boolean(body.online),
      }));
      return sendJson(res, 200, { online: updated.online });
    })
  );

  // ---- My bike ----
  router.get(
    "/api/driver/me",
    requireAuth(["driver"])(async (req, res) => {
      const driver = db.findOne("drivers", (d) => d.id === req.user.sub);
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      const bike = db.findOne("bikes", (b) => b.id === driver.bikeId);
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
      return sendJson(res, 200, { ride: publicRide });
    })
  );

  // ---- Decline a ride request ----
  router.post(
    "/api/driver/rides/:id/decline",
    requireAuth(["driver"])(async (req, res, params) => {
      const ride = db.findOne("rides", (r) => r.id === params.id && r.driverId === req.user.sub);
      if (!ride) return sendJson(res, 404, { error: "Ride not found." });
      db.update("rides", (r) => r.id === ride.id, (r) => ({ ...r, status: "cancelled" }));
      return sendJson(res, 200, { message: "Ride declined." });
    })
  );
}

module.exports = { register };
