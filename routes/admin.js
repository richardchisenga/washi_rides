// routes/admin.js
const db = require("../lib/db");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");

function register(router) {
  // ---- Drivers ----
  router.get(
    "/api/admin/drivers",
    requireAuth(["admin"])(async (req, res) => {
      const drivers = db.readTable("drivers").reverse();
      const bikes = db.readTable("bikes");
      const shaped = drivers.map((d) => {
        const { passwordHash, passwordSalt, ...rest } = d;
        const bike = bikes.find((b) => b.id === d.bikeId);
        return { ...rest, bike };
      });
      return sendJson(res, 200, { drivers: shaped });
    })
  );

  router.post(
    "/api/admin/drivers/:id/approve",
    requireAuth(["admin"])(async (req, res, params) => {
      const driver = db.update("drivers", (d) => d.id === params.id, (d) => ({ ...d, status: "approved" }));
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      db.update("bikes", (b) => b.id === driver.bikeId, (b) => ({ ...b, status: "active" }));
      return sendJson(res, 200, { message: `${driver.name} approved.` });
    })
  );

  router.post(
    "/api/admin/drivers/:id/reject",
    requireAuth(["admin"])(async (req, res, params) => {
      const driver = db.update("drivers", (d) => d.id === params.id, (d) => ({ ...d, status: "rejected", online: false }));
      if (!driver) return sendJson(res, 404, { error: "Driver not found." });
      db.update("bikes", (b) => b.id === driver.bikeId, (b) => ({ ...b, status: "inactive" }));
      return sendJson(res, 200, { message: `${driver.name} rejected.` });
    })
  );

  // ---- Bikes ----
  router.get(
    "/api/admin/bikes",
    requireAuth(["admin"])(async (req, res) => {
      const bikes = db.readTable("bikes").reverse();
      const drivers = db.readTable("drivers");
      const shaped = bikes.map((b) => {
        const driver = drivers.find((d) => d.id === b.driverId);
        return { ...b, driverName: driver ? driver.name : null };
      });
      return sendJson(res, 200, { bikes: shaped });
    })
  );

  router.post(
    "/api/admin/bikes",
    requireAuth(["admin"])(async (req, res) => {
      const body = await readJsonBody(req);
      if (!body.plate || !body.model) {
        return sendJson(res, 400, { error: "Plate number and model are required." });
      }
      const bike = {
        id: `bike-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        plate: body.plate.trim(),
        model: body.model.trim(),
        color: (body.color || "").trim(),
        driverId: body.driverId || null,
        status: body.driverId ? "active" : "unassigned",
        createdAt: new Date().toISOString(),
      };
      db.insert("bikes", bike);
      return sendJson(res, 201, { bike });
    })
  );

  router.patch(
    "/api/admin/bikes/:id",
    requireAuth(["admin"])(async (req, res, params) => {
      const body = await readJsonBody(req);
      const updated = db.update("bikes", (b) => b.id === params.id, (b) => ({
        ...b,
        plate: body.plate !== undefined ? body.plate.trim() : b.plate,
        model: body.model !== undefined ? body.model.trim() : b.model,
        color: body.color !== undefined ? body.color.trim() : b.color,
        driverId: body.driverId !== undefined ? body.driverId : b.driverId,
        status: body.status !== undefined ? body.status : b.status,
      }));
      if (!updated) return sendJson(res, 404, { error: "Bike not found." });
      return sendJson(res, 200, { bike: updated });
    })
  );

  router.delete(
    "/api/admin/bikes/:id",
    requireAuth(["admin"])(async (req, res, params) => {
      const removed = db.remove("bikes", (b) => b.id === params.id);
      if (!removed) return sendJson(res, 404, { error: "Bike not found." });
      return sendJson(res, 200, { message: "Bike removed." });
    })
  );

  // ---- Riders ----
  router.get(
    "/api/admin/riders",
    requireAuth(["admin"])(async (req, res) => {
      const riders = db.readTable("riders").reverse();
      const subs = db.readTable("subscriptions");
      const plans = db.readTable("subscription_plans");
      const shaped = riders.map((r) => {
        const { passwordHash, passwordSalt, ...rest } = r;
        const activeSub = subs.find((s) => s.riderId === r.id && new Date(s.expiresAt).getTime() > Date.now());
        const plan = activeSub ? plans.find((p) => p.id === activeSub.planId) : null;
        return { ...rest, activePlan: plan ? plan.name : null };
      });
      return sendJson(res, 200, { riders: shaped });
    })
  );

  // ---- Rides overview ----
  router.get(
    "/api/admin/rides",
    requireAuth(["admin"])(async (req, res) => {
      const rides = db.readTable("rides").reverse();
      const riders = db.readTable("riders");
      const drivers = db.readTable("drivers");
      const shaped = rides.map((r) => {
        const { trackingPlan, ...rest } = r;
        return {
          ...rest,
          riderName: riders.find((rd) => rd.id === r.riderId)?.name || "Unknown",
          driverName: drivers.find((d) => d.id === r.driverId)?.name || "Unknown",
        };
      });
      return sendJson(res, 200, { rides: shaped });
    })
  );

  // ---- Subscription plans management ----
  router.get(
    "/api/admin/subscriptions/plans",
    requireAuth(["admin"])(async (req, res) => sendJson(res, 200, { plans: db.readTable("subscription_plans") }))
  );

  router.patch(
    "/api/admin/subscriptions/plans/:id",
    requireAuth(["admin"])(async (req, res, params) => {
      const body = await readJsonBody(req);
      const updated = db.update("subscription_plans", (p) => p.id === params.id, (p) => ({
        ...p,
        name: body.name !== undefined ? body.name : p.name,
        priceKwacha: body.priceKwacha !== undefined ? Number(body.priceKwacha) : p.priceKwacha,
        durationDays: body.durationDays !== undefined ? Number(body.durationDays) : p.durationDays,
        discountPercent: body.discountPercent !== undefined ? Number(body.discountPercent) : p.discountPercent,
        perks: body.perks !== undefined ? body.perks : p.perks,
      }));
      if (!updated) return sendJson(res, 404, { error: "Plan not found." });
      return sendJson(res, 200, { plan: updated });
    })
  );

  router.get(
    "/api/admin/subscriptions",
    requireAuth(["admin"])(async (req, res) => {
      const subs = db.readTable("subscriptions").reverse();
      const riders = db.readTable("riders");
      const plans = db.readTable("subscription_plans");
      const shaped = subs.map((s) => ({
        ...s,
        riderName: riders.find((r) => r.id === s.riderId)?.name || "Unknown",
        planName: plans.find((p) => p.id === s.planId)?.name || "Unknown",
        active: new Date(s.expiresAt).getTime() > Date.now(),
      }));
      return sendJson(res, 200, { subscriptions: shaped });
    })
  );

  // ---- Dashboard stats ----
  router.get(
    "/api/admin/stats",
    requireAuth(["admin"])(async (req, res) => {
      const drivers = db.readTable("drivers");
      const riders = db.readTable("riders");
      const rides = db.readTable("rides");
      const payments = db.readTable("payments");
      const today = new Date().toDateString();

      const stats = {
        totalRiders: riders.length,
        totalDrivers: drivers.length,
        pendingDriverApprovals: drivers.filter((d) => d.status === "pending").length,
        onlineDrivers: drivers.filter((d) => d.online && d.status === "approved").length,
        ridesToday: rides.filter((r) => new Date(r.createdAt).toDateString() === today).length,
        totalRides: rides.length,
        revenueKwacha: payments
          .filter((p) => p.status === "success")
          .reduce((sum, p) => sum + p.amount, 0),
      };
      return sendJson(res, 200, { stats });
    })
  );
}

module.exports = { register };
