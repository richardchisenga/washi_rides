// routes/payments.js
<<<<<<< HEAD
const { pool } = require("../lib/database");
=======
// Simulated mobile money payments. No real network calls are made and no
// real money moves - this mimics the request-a-PIN flow riders are used to
// (MTN Mobile Money / Airtel Money) so the UI can be built against it.

const db = require("../lib/db");
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
const { sendJson, readJsonBody, safe, requireAuth } = require("../lib/router");

const VALID_PROVIDERS = ["mtn", "airtel", "zamtel"];

function register(router) {
<<<<<<< HEAD
=======
  // ---- Start a payment for a ride or a subscription plan ----
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  router.post(
    "/api/payments/initiate",
    requireAuth(["rider"])(async (req, res) => {
      const body = await readJsonBody(req);
      const { rideId, planId, provider, phoneNumber } = body;

      if (!provider || !VALID_PROVIDERS.includes(provider)) {
        return sendJson(res, 400, { error: "Choose a valid mobile money provider." });
      }
      if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 9) {
<<<<<<< HEAD
        return sendJson(res, 400, { error: "Enter a valid phone number." });
=======
        return sendJson(res, 400, { error: "Enter a valid mobile money phone number." });
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      }
      if (!rideId && !planId) {
        return sendJson(res, 400, { error: "Nothing to pay for was specified." });
      }

      let amount = 0;
      let purpose = "";
      if (rideId) {
<<<<<<< HEAD
        const rideRes = await pool.query(
          'SELECT * FROM rides WHERE id = $1 AND rider_id = $2',
          [rideId, req.user.sub]
        );
        const ride = rideRes.rows[0];
=======
        const ride = db.findOne("rides", (r) => r.id === rideId && r.riderId === req.user.sub);
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
        if (!ride) return sendJson(res, 404, { error: "Ride not found." });
        amount = ride.fare;
        purpose = `Ride payment (${ride.pickup} → ${ride.destination})`;
      } else {
<<<<<<< HEAD
        const planRes = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
        const plan = planRes.rows[0];
        if (!plan) return sendJson(res, 404, { error: "Subscription plan not found." });
        amount = plan.price_kwacha;
        purpose = `${plan.name} subscription`;
      }

      const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO payments (id, rider_id, ride_id, plan_id, provider, phone_number, amount, purpose, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'awaiting_pin')`,
        [paymentId, req.user.sub, rideId || null, planId || null, provider, phoneNumber, amount, purpose]
      );

      const payment = (await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId])).rows[0];
=======
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
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      return sendJson(res, 201, { payment });
    })
  );

<<<<<<< HEAD
=======
  // ---- Confirm with the mock PIN prompt ----
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
  router.post(
    "/api/payments/:id/confirm",
    requireAuth(["rider"])(async (req, res, params) => {
      const body = await readJsonBody(req);
      const pin = String(body.pin || "");
<<<<<<< HEAD
      const paymentRes = await pool.query(
        'SELECT * FROM payments WHERE id = $1 AND rider_id = $2',
        [params.id, req.user.sub]
      );
      const payment = paymentRes.rows[0];
      if (!payment) return sendJson(res, 404, { error: "Payment not found." });
      if (payment.status !== "awaiting_pin") {
        return sendJson(res, 400, { error: "Payment already processed." });
      }

      const success = /^\d{4}$/.test(pin);
      const reference = success ? `WR${Date.now().toString().slice(-8)}` : null;
      const newStatus = success ? 'success' : 'failed';

      await pool.query(
        `UPDATE payments SET status = $1, reference = $2 WHERE id = $3`,
        [newStatus, reference, payment.id]
      );

      // If subscription was purchased, create subscription record
      if (success && payment.plan_id) {
        const planRes = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [payment.plan_id]);
        const plan = planRes.rows[0];
        if (plan) {
          const subId = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const expiresAt = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();
          await pool.query(
            `INSERT INTO subscriptions (id, rider_id, plan_id, payment_id, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [subId, req.user.sub, plan.id, payment.id, expiresAt]
          );
        }
      }

      const updated = (await pool.query('SELECT * FROM payments WHERE id = $1', [payment.id])).rows[0];
=======
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

>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
      if (!success) {
        return sendJson(res, 400, { error: "Incorrect PIN. Payment declined.", payment: updated });
      }
      return sendJson(res, 200, { message: "Payment successful.", payment: updated });
    })
  );

  router.get(
    "/api/payments/:id",
    requireAuth(["rider"])(async (req, res, params) => {
<<<<<<< HEAD
      const result = await pool.query(
        'SELECT * FROM payments WHERE id = $1 AND rider_id = $2',
        [params.id, req.user.sub]
      );
      if (result.rowCount === 0) return sendJson(res, 404, { error: "Payment not found." });
      return sendJson(res, 200, { payment: result.rows[0] });
=======
      const payment = db.findOne("payments", (p) => p.id === params.id && p.riderId === req.user.sub);
      if (!payment) return sendJson(res, 404, { error: "Payment not found." });
      return sendJson(res, 200, { payment });
>>>>>>> d2625106d9f91f3aef43ba7d1d4d4ebdd61c8264
    })
  );
}

module.exports = { register };
