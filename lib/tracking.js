// lib/tracking.js
// There's no real GPS feed here, so a driver's movement is simulated:
// once a ride is accepted we pick a plausible starting point for the driver
// and interpolate their position toward the pickup, then toward the
// destination, purely based on elapsed time. Polling this is cheap and
// stateless - nothing to tick in the background.

const { findPlace } = require("./places");

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomNearbyStart(pickup) {
  // A driver "starts" a random plausible distance from the pickup point.
  const angle = Math.random() * Math.PI * 2;
  const radius = 15 + Math.random() * 15;
  return {
    x: clamp(pickup.x + Math.cos(angle) * radius, 0, 100),
    y: clamp(pickup.y + Math.sin(angle) * radius, 0, 100),
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function buildTrackingPlan(pickupName, destinationName) {
  const pickup = findPlace(pickupName);
  const destination = findPlace(destinationName);
  const driverStart = randomNearbyStart(pickup);
  return {
    driverStart,
    pickup,
    destination,
    toPickupDurationSec: 20,
    toDestinationDurationSec: 30,
    acceptedAt: Date.now(),
  };
}

// Returns the current simulated state for a ride's tracking plan.
function getTrackingState(plan) {
  if (!plan) return null;
  const { driverStart, pickup, destination, toPickupDurationSec, toDestinationDurationSec, acceptedAt } = plan;
  const elapsedSec = (Date.now() - acceptedAt) / 1000;

  if (elapsedSec < toPickupDurationSec) {
    const progress = elapsedSec / toPickupDurationSec;
    return {
      phase: "to_pickup",
      statusLabel: "Driver is heading to your pickup point",
      progress,
      position: { x: lerp(driverStart.x, pickup.x, progress), y: lerp(driverStart.y, pickup.y, progress) },
      etaSeconds: Math.max(0, Math.round(toPickupDurationSec - elapsedSec)),
      pickup,
      destination,
    };
  }

  const destElapsed = elapsedSec - toPickupDurationSec;
  if (destElapsed < toDestinationDurationSec) {
    const progress = destElapsed / toDestinationDurationSec;
    return {
      phase: "to_destination",
      statusLabel: "On the way to your destination",
      progress,
      position: { x: lerp(pickup.x, destination.x, progress), y: lerp(pickup.y, destination.y, progress) },
      etaSeconds: Math.max(0, Math.round(toDestinationDurationSec - destElapsed)),
      pickup,
      destination,
    };
  }

  return {
    phase: "completed",
    statusLabel: "Arrived at destination",
    progress: 1,
    position: { x: destination.x, y: destination.y },
    etaSeconds: 0,
    pickup,
    destination,
  };
}

module.exports = { buildTrackingPlan, getTrackingState };
