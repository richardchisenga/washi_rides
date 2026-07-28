// lib/places.js
// Mock coordinates for Manyinga-area destinations, laid out on a small local
// grid (not real-world GPS) purely so we can compute distances and animate
// a simulated route between two points.

const DESTINATIONS = [
  { name: "Tabora Market", x: 20, y: 80 },
  { name: "CGC Area", x: 35, y: 65 },
  { name: "Downtown", x: 50, y: 50 },
  { name: "Loloma Mission Hospital", x: 70, y: 30 },
  { name: "Manyinga Mini Hospital", x: 60, y: 70 },
  { name: "Muzama", x: 15, y: 40 },
  { name: "Masumba", x: 80, y: 60 },
  { name: "Mundanya", x: 45, y: 20 },
  { name: "Airport", x: 90, y: 15 },
  { name: "Manyinga Town Council", x: 55, y: 45 },
  { name: "Elders Joint Pub", x: 30, y: 30 },
  { name: "Miselo Guesthouse", x: 75, y: 80 },
];

function findPlace(name) {
  const match = DESTINATIONS.find(
    (d) => d.name.toLowerCase() === String(name || "").toLowerCase()
  );
  // Fall back to a stable pseudo-random point near the centre of the grid so
  // free-typed pickup points still animate sensibly on the map.
  if (match) return match;
  const seed = String(name || "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    name: name || "Unknown location",
    x: 30 + (seed % 40),
    y: 30 + ((seed * 7) % 40),
  };
}

function distanceKm(pointA, pointB) {
  // Treat the 0-100 grid as roughly a 10km x 10km area for fare purposes.
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  const gridDistance = Math.sqrt(dx * dx + dy * dy);
  return +(gridDistance * 0.1).toFixed(1);
}

module.exports = { DESTINATIONS, findPlace, distanceKm };
