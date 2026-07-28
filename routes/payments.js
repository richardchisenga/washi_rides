// routes/payments.js
// Simulated mobile money payments. No real network calls are made and no
// real money moves - this mimics the request-a-PIN flow riders are used to
// (MTN Mobile Money / Airtel Money) so the UI can be built against it.

const db = require("../lib/db");
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");

const VALID_PROVIDERS = ["mtn", "airtel", "zamtel"];

function register(router) {
  // ---- Start a payment for a ride or a subscription plan ----
  router.post(
    "/api/payments/initiate",
    requireAuth(["rider"])(async (req, res) => {
      const body = await readJsonBody(req);
      const { rideId, planId, provider, phoneNumber } = body;

      if (!provider || !VALID_PROVIDERS.includes(provider)) {
        return sendJson(res, 400, { error: "Choose a valid mobile money provider." });
      }
      if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 9) {
        return sendJson(res, 400, { error: "Enter a valid mobile money phone number." });
      }
      if (!rideId && !planId) {
        return sendJson(res, 400, { error: "Nothing to pay for was specified." });
      }

      let amount = 0;
      let purpose = "";
      if (rideId) {
        const ride = db.findOne("rides", (r) => r.id === rideId && r.riderId === req.user.sub);
        if (!ride) return sendJson(res, 404, { error: "Ride not found." });
        amount = ride.fare;
        purpose = `Ride payment (${ride.pickup} → ${ride.destination})`;
      } else {
        const plan = db.findOne("subscription_plans", (p) => p.id === planId);
        if (!plan) return sendJson(res, 404, { error: "Subscription plan not found." });
        amount = plan.priceKwacha;
        purpose = `${plan.name} subscription`;
      }

      const payment = {
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        riderId: req.user.sub,
        rideId: rideId || null,
        planId: planId || null,
        provider,
        phoneNumber,
        amount,
        purpose,
        status: "awaiting_pin", // awaiting_pin | success | failed
        reference: null,
        createdAt: new Date().toISOString(),
      };
      db.insert("payments", payment);
      return sendJson(res, 201, { payment });
    })
  );

  // ---- Confirm with the mock PIN prompt ----
  router.post(
    "/api/payments/:id/confirm",
    requireAuth(["rider"])(async (req, res, params) => {
      const body = await readJsonBody(req);
      const pin = String(body.pin || "");
      const payment = db.findOne("payments", (p) => p.id === params.id && p.riderId === req.user.sub);
      if (!payment) return sendJson(res, 404, { error: "Payment not found." });
      if (payment.status !== "awaiting_pin") {
        return sendJson(res, 400, { error: "This payment has already been processed." });
      }

      // Simulated rule: any 4-digit PIN succeeds, anything else fails - this
      // stands in for the real approval that would come back from a mobile
      // money aggregator.
      const success = /^\d{4}$/.test(pin);
      const reference = success
        ? `WR${Date.now().toString().slice(-8)}`
        : null;

      const updated = db.update(
        "payments",
        (p) => p.id === payment.id,
        (p) => ({
          ...p,
          status: success ? "success" : "failed",
          reference,
        })
      );

      if (success && payment.planId) {
        const plan = db.findOne("subscription_plans", (pl) => pl.id === payment.planId);
        if (plan) {
          const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();
          db.insert("subscriptions", {
            id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            riderId: req.user.sub,
            planId: plan.id,
            paymentId: payment.id,
            startedAt: new Date().toISOString(),
            expiresAt,
          });
        }
      }

      if (!success) {
        return sendJson(res, 400, { error: "Incorrect PIN. Payment declined.", payment: updated });
      }
      return sendJson(res, 200, { message: "Payment successful.", payment: updated });
    })
  );

  router.get(
    "/api/payments/:id",
    requireAuth(["rider"])(async (req, res, params) => {
      const payment = db.findOne("payments", (p) => p.id === params.id && p.riderId === req.user.sub);
      if (!payment) return sendJson(res, 404, { error: "Payment not found." });
      return sendJson(res, 200, { payment });
    })
  );
}

module.exports = { register };
