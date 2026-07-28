// lib/fare.js
const { findPlace, distanceKm } = require("./places");

const BASE_FARE = 8; // Kwacha
const PER_KM_RATE = 4.5; // Kwacha per km

function calculateFare(pickupName, destinationName, discountPercent = 0) {
  const pickup = findPlace(pickupName);
  const destination = findPlace(destinationName);
  const km = distanceKm(pickup, destination);
  const rawFare = BASE_FARE + km * PER_KM_RATE;
  const discount = rawFare * (discountPercent / 100);
  const finalFare = Math.max(rawFare - discount, BASE_FARE);
  return {
    distanceKm: km,
    baseFare: BASE_FARE,
    rawFare: +rawFare.toFixed(2),
    discountApplied: +discount.toFixed(2),
    fare: +finalFare.toFixed(2),
    pickup,
    destination,
  };
}

module.exports = { calculateFare, BASE_FARE, PER_KM_RATE };
