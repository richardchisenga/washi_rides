# Washi Rides

A ride-booking platform for Manyinga with three apps: **rider**, **driver**, and **admin**.
Built with plain Node.js (no npm packages), vanilla HTML/CSS/JS, and a local JSON-file database.

## Features

- **Riders**: book a ride, see live (simulated) tracking on a map, pay by mobile money, subscribe to a discount plan.
- **Drivers**: apply to drive (with bike details), go online/offline, accept or decline ride requests.
- **Admin**: approve/reject driver applications, manage the bike fleet, view riders/rides, edit subscription plans, see dashboard stats.

Live tracking and mobile money are both **simulated** for demo purposes - there's no real GPS feed and no real money moves. See "How the simulations work" below.

## Requirements

- [Node.js](https://nodejs.org) version 18 or later. No `npm install` needed - this project has zero dependencies.

## Running it

```bash
cd washi-rides
node server.js
```

You should see:

```
Washi Rides running at http://localhost:3000
 - Rider app:  http://localhost:3000/index.html
 - Driver app: http://localhost:3000/driver.html
 - Admin app:  http://localhost:3000/admin.html
```

Open those three URLs in your browser (or on your phone, if you expose the port on your network).

To use a different port: `PORT=8080 node server.js`.

## First-time setup

The first time you run the server it creates a `data/` folder with JSON files and seeds:

- A default **admin login**: username `admin`, password `admin123`. **Change this password after logging in for the first time** (there's no in-app password-change screen yet - edit `data/admins.json` directly, or add one).
- Three subscription plans: Pay As You Go (free), Weekly Rider (K50/week, 10% off), Monthly Rider (K150/month, 20% off). Edit these anytime from the admin panel's "Subscription Plans" tab.

## Typical flow to try everything out

1. **Driver app** (`/driver.html`) → "Apply to drive" → fill in name, phone, password, license number, and bike details → submit.
2. **Admin app** (`/admin.html`) → log in with `admin` / `admin123` → "Drivers" tab → Approve the new driver.
3. Back in the **driver app**, log in with the phone/password used to apply → flip "Go online".
4. **Rider app** (`/index.html`) → sign up → pick a pickup point and destination → Proceed → choose the online driver → Request Ride.
5. In the **driver app**, the ride request appears under "Ride Requests" → Accept.
6. In the **rider app**, the waiting screen switches to live tracking with a moving dot on the map.
7. Once the simulated trip finishes, a "Pay fare" button appears → choose a mobile money provider, enter any phone number, then any 4-digit PIN to simulate approval.
8. Try the "Plans" tab in the rider app to subscribe - same mock payment flow.

## How the simulations work

- **Live tracking**: there's no real GPS. When a driver accepts a ride, the server picks a plausible random starting point and mathematically interpolates the driver's position over time (20s to reach pickup, 30s to reach the destination), based on timestamps rather than a background timer. The rider's browser polls this every 2 seconds and animates a dot on a simple SVG map.
- **Mobile money**: choosing a provider (MTN/Airtel/Zamtel) and phone number creates a pending payment, then any **4-digit PIN** approves it (anything else fails), returning a mock reference number. No aggregator is contacted and no real funds move - swap in a real provider's API in `routes/payments.js` if you want to go live with this.

## Project structure

```
washi-rides/
  server.js              - HTTP server, static file serving, route wiring
  package.json
  lib/
    db.js                - tiny JSON-file "database" (read/write/find/update)
    auth.js              - scrypt password hashing + signed (JWT-like) tokens
    router.js            - minimal HTTP router, auth middleware
    places.js            - mock coordinates for named destinations
    fare.js              - fare calculation
    tracking.js          - simulated live-tracking math
    seed.js              - seeds default admin + subscription plans on first run
  routes/
    auth.js              - register/login for riders, drivers, and the unified login
    rider.js             - destinations, ride creation/polling, subscriptions
    driver.js            - online status, ride requests, accept/decline
    admin.js             - driver approvals, bike management, riders/rides, plans, stats
    payments.js          - mock mobile money initiate/confirm
  data/                  - JSON "database" files (created on first run)
  public/
    index.html, driver.html, admin.html
    css/style.css
    js/shared.js, rider.js, driver.js, admin.js
```

## Notes on going to production

This is built to be easy to read and extend, but a few things you'd want before going live:

- Swap the JSON-file database for a real database (Postgres, SQLite, etc.) - it's a straightforward change since `lib/db.js` is the only place that touches storage.
- Replace the mock mobile money flow in `routes/payments.js` with a real aggregator's API (e.g. an MTN/Airtel mobile money API), including webhook confirmation instead of a client-supplied PIN.
- Replace simulated tracking with a real driver-side location feed (e.g. the driver's phone posting GPS coordinates periodically) and a real map (Leaflet/Google Maps) instead of the SVG grid.
- Add HTTPS (e.g. behind a reverse proxy like nginx or Caddy) since this server runs plain HTTP.
- Add a password-reset flow and an in-app way for the admin to change their own password.
- **Replace the WhatsApp placeholder number** `260123456789` in `public/js/rider.js` and `public/js/driver.js` with your real support number.
