// public/js/rider.js
const ROLE = "rider";
const WHATSAPP_NUMBER = "260123456789"; // Replace this number with your own WhatsApp number

let state = {
  user: null,
  destinations: [],
  selectedDestination: "",
  pickup: "",
  chosenDriverId: null,
  currentRide: null,
  waitTimer: null,
  waitSecondsLeft: 55,
  pollTimer: null,
  paymentContext: null, // { type: 'ride'|'plan', rideId, planId, amount, paymentId }
  selectedProvider: null,
};

const screens = ["auth", "home", "riders", "waiting", "history", "subscribe", "account"];

function showScreen(name) {
  screens.forEach((s) => el(`screen-${s}`).classList.remove("active"));
  el(`screen-${name}`).classList.add("active");
  document.querySelectorAll("#bottom-nav button").forEach((b) => b.classList.remove("active"));
  const navBtn = document.querySelector(`#bottom-nav button[data-nav="${name}"]`);
  if (navBtn) navBtn.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------- INIT ----------------
async function init() {
  const token = WashiAPI.getToken(ROLE);
  if (token) {
    try {
      const { user } = await WashiAPI.get(ROLE, "/api/auth/me");
      state.user = user;
      onLoggedIn();
    } catch (e) {
      WashiAPI.clearToken(ROLE);
      showScreen("auth");
    }
  } else {
    showScreen("auth");
  }
  await loadDestinations();
  bindEvents();
}

async function loadDestinations() {
  try {
    const { destinations } = await WashiAPI.get(ROLE, "/api/destinations");
    state.destinations = destinations;
    const shortcuts = el("shortcuts-list");
    shortcuts.innerHTML = "";
    destinations.forEach((dest) => {
      const card = document.createElement("div");
      card.className = "shortcut-card";
      card.textContent = dest;
      card.addEventListener("click", () => {
        document.querySelectorAll(".shortcut-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        el("destination-input").value = dest;
        state.selectedDestination = dest;
        refreshFareEstimate();
      });
      shortcuts.appendChild(card);
    });
    const datalist = el("places-datalist");
    datalist.innerHTML = destinations.map((d) => `<option value="${d}">`).join("");
  } catch (e) {
    // Destinations are non-critical for auth screen; ignore silently.
  }
}

function onLoggedIn() {
  el("header-account").style.display = "block";
  el("header-name").textContent = state.user.name;
  el("bottom-nav").style.display = "flex";
  showScreen("home");
}

// ---------------- AUTH ----------------
function bindAuthEvents() {
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.getAttribute("data-auth-tab");
      el("login-form").style.display = which === "login" ? "block" : "none";
      el("register-form").style.display = which === "register" ? "block" : "none";
    });
  });

  el("login-btn").addEventListener("click", async () => {
    el("login-error").textContent = "";
    const phone = el("login-phone").value.trim();
    const password = el("login-password").value;
    if (!phone || !password) {
      el("login-error").textContent = "Enter your phone number and password.";
      return;
    }
    try {
      const { token, user } = await WashiAPI.post(ROLE, "/api/auth/login", { phone, password, role: "rider" });
      WashiAPI.setToken(ROLE, token);
      state.user = user;
      onLoggedIn();
    } catch (e) {
      el("login-error").textContent = e.message;
    }
  });

  el("register-btn").addEventListener("click", async () => {
    el("reg-error").textContent = "";
    const name = el("reg-name").value.trim();
    const phone = el("reg-phone").value.trim();
    const password = el("reg-password").value;
    if (!name || !phone || !password) {
      el("reg-error").textContent = "All fields are required.";
      return;
    }
    try {
      const { token, user } = await WashiAPI.post(ROLE, "/api/auth/register/rider", { name, phone, password });
      WashiAPI.setToken(ROLE, token);
      state.user = user;
      onLoggedIn();
    } catch (e) {
      el("reg-error").textContent = e.message;
    }
  });

  el("logout-link").addEventListener("click", () => {
    WashiAPI.clearToken(ROLE);
    state.user = null;
    el("header-account").style.display = "none";
    el("bottom-nav").style.display = "none";
    showScreen("auth");
  });
}

// ---------------- HOME / FARE ESTIMATE ----------------
let estimateDebounce = null;
function refreshFareEstimate() {
  clearTimeout(estimateDebounce);
  estimateDebounce = setTimeout(async () => {
    const pickup = el("pickup-input").value.trim();
    const destination = el("destination-input").value.trim();
    if (!pickup || !destination) {
      el("fare-estimate-card").style.display = "none";
      return;
    }
    try {
      const { estimate, subscription } = await WashiAPI.post(ROLE, "/api/rides/estimate", { pickup, destination });
      el("fare-estimate-card").style.display = "block";
      el("fare-estimate-amount").textContent = formatMoney(estimate.fare);
      el("fare-estimate-detail").textContent = subscription
        ? `${estimate.distanceKm} km · ${subscription} discount applied`
        : `${estimate.distanceKm} km estimated distance`;
    } catch (e) {
      // Ignore estimate errors silently - not blocking.
    }
  }, 350);
}

function bindHomeEvents() {
  el("pickup-input").addEventListener("input", refreshFareEstimate);
  el("destination-input").addEventListener("input", (e) => {
    state.selectedDestination = e.target.value;
    document.querySelectorAll(".shortcut-card").forEach((c) => c.classList.toggle("selected", c.textContent === e.target.value));
    refreshFareEstimate();
  });

  el("proceed-btn").addEventListener("click", async () => {
    const pickup = el("pickup-input").value.trim();
    const destination = el("destination-input").value.trim();
    if (!pickup) return showToast("Enter your pickup point.", true);
    if (!destination) return showToast("Enter or tap a destination.", true);
    state.pickup = pickup;
    state.selectedDestination = destination;
    await loadRiders();
    showScreen("riders");
  });
}

// ---------------- RIDERS ----------------
async function loadRiders() {
  el("route-label-riders").textContent = `${state.pickup} → ${state.selectedDestination}`;
  const list = el("rider-list");
  list.innerHTML = `<div class="empty-state">Loading available riders...</div>`;
  try {
    const { drivers } = await WashiAPI.get(ROLE, "/api/drivers/available");
    if (drivers.length === 0) {
      list.innerHTML = `<div class="empty-state">No riders online right now. Please try again shortly.</div>`;
      return;
    }
    list.innerHTML = "";
    drivers.forEach((driver) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700;">${driver.name}</div>
            ${driver.bike ? `<div class="muted">${driver.bike}</div>` : ""}
          </div>
          <span class="badge green"><span class="dot green"></span> Online</span>
        </div>
        <div style="margin-top:12px;">
          <button class="btn request-btn" data-driver-id="${driver.id}">Request Ride</button>
        </div>
      `;
      list.appendChild(card);
    });
    document.querySelectorAll(".request-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => requestRide(e.target.getAttribute("data-driver-id")));
    });
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

async function requestRide(driverId) {
  try {
    const { ride } = await WashiAPI.post(ROLE, "/api/rides", {
      pickup: state.pickup,
      destination: state.selectedDestination,
      driverId,
    });
    state.currentRide = ride;
    startWaitingScreen();
  } catch (e) {
    showToast(e.message, true);
  }
}

// ---------------- WAITING / TRACKING ----------------
async function startWaitingScreen() {
  showScreen("waiting");
  el("waiting-message").textContent = "Waiting for a driver to accept...";
  el("route-label-waiting").textContent = `${state.currentRide.pickup} → ${state.currentRide.destination}`;
  el("timer-wrap").style.display = "block";
  el("pay-now-btn").style.display = "none";
  el("cancel-btn").style.display = "inline-flex";
  el("cancel-btn").textContent = "Cancel";

  await refreshRideStats();
  setupMapMarkers();

  state.waitSecondsLeft = 55;
  el("timer-display").textContent = state.waitSecondsLeft;
  el("tracking-status-label").textContent = "Waiting for driver to accept...";

  clearInterval(state.waitTimer);
  state.waitTimer = setInterval(() => {
    state.waitSecondsLeft--;
    if (state.currentRide.status === "requested") {
      el("timer-display").textContent = Math.max(state.waitSecondsLeft, 0);
    }
    if (state.waitSecondsLeft <= 0 && state.currentRide.status === "requested") {
      clearInterval(state.waitTimer);
      handleRequestTimeout();
    }
  }, 1000);

  clearInterval(state.pollTimer);
  pollRide();
  state.pollTimer = setInterval(pollRide, 2000);
}

async function refreshRideStats() {
  try {
    const { rides } = await WashiAPI.get(ROLE, "/api/rides");
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = rides.filter((r) => new Date(r.createdAt) > weekAgo).length;
    el("stat-week").textContent = thisWeek;
    el("stat-lifetime").textContent = rides.length;
  } catch (e) {
    /* non-critical */
  }
}

function setupMapMarkers() {
  // Coordinates come from the server on the first tracking poll; until then
  // keep the map hidden-ish with markers off-canvas.
  el("pickup-marker").setAttribute("cx", "-10");
  el("pickup-marker").setAttribute("cy", "-10");
  el("dest-marker").setAttribute("cx", "-10");
  el("dest-marker").setAttribute("cy", "-10");
  el("driver-marker").setAttribute("cx", "-10");
  el("driver-marker").setAttribute("cy", "-10");
}

async function handleRequestTimeout() {
  try {
    await WashiAPI.post(ROLE, `/api/rides/${state.currentRide.id}/cancel`, {});
  } catch (e) {
    /* ignore */
  }
  clearInterval(state.pollTimer);
  showToast("No response from that rider - choose another.", true);
  await loadRiders();
  showScreen("riders");
}

async function pollRide() {
  if (!state.currentRide) return;
  try {
    const { ride, tracking, driverName } = await WashiAPI.get(ROLE, `/api/rides/${state.currentRide.id}`);
    state.currentRide = ride;

    if (ride.status === "cancelled") {
      clearInterval(state.pollTimer);
      clearInterval(state.waitTimer);
      showToast("This ride was cancelled.", true);
      await loadRiders();
      showScreen("riders");
      return;
    }

    if (ride.status === "requested") {
      el("waiting-message").textContent = "Waiting for a driver to accept...";
      return;
    }

    // Driver has accepted - switch to live tracking view.
    clearInterval(state.waitTimer);
    el("timer-wrap").style.display = tracking && tracking.phase !== "completed" ? "block" : "none";
    el("waiting-message").textContent = driverName ? `${driverName} is on the way` : "Driver assigned";

    if (tracking) {
      el("tracking-status-label").textContent = tracking.statusLabel;
      el("timer-display").textContent = tracking.etaSeconds;

      updateMap(tracking);

      if (tracking.phase === "completed" || ride.status === "completed") {
        clearInterval(state.pollTimer);
        el("cancel-btn").style.display = "none";
        el("pay-now-btn").style.display = "inline-flex";
        el("tracking-status-label").textContent = "Ride complete - please pay your fare below.";
        await refreshRideStats();
      }
    }
  } catch (e) {
    // transient network hiccup - keep polling
  }
}

function updateMap(tracking) {
  const { pickup, destination, position } = tracking;
  el("pickup-marker").setAttribute("cx", pickup.x);
  el("pickup-marker").setAttribute("cy", pickup.y);
  el("dest-marker").setAttribute("cx", destination.x);
  el("dest-marker").setAttribute("cy", destination.y);
  el("driver-marker").setAttribute("cx", position.x);
  el("driver-marker").setAttribute("cy", position.y);

  const line = el("route-line");
  line.setAttribute("x1", pickup.x);
  line.setAttribute("y1", pickup.y);
  line.setAttribute("x2", destination.x);
  line.setAttribute("y2", destination.y);
}

function bindWaitingEvents() {
  el("cancel-btn").addEventListener("click", async () => {
    clearInterval(state.waitTimer);
    clearInterval(state.pollTimer);
    try {
      await WashiAPI.post(ROLE, `/api/rides/${state.currentRide.id}/cancel`, {});
    } catch (e) {
      /* ignore */
    }
    await loadRiders();
    showScreen("riders");
  });

  el("pay-now-btn").addEventListener("click", () => {
    openPaymentModal({ type: "ride", rideId: state.currentRide.id, amount: state.currentRide.fare });
  });

  el("whatsapp-btn").addEventListener("click", openWhatsApp);
  el("whatsapp-btn-2").addEventListener("click", openWhatsApp);
  el("footer-support-link").addEventListener("click", (e) => {
    e.preventDefault();
    openWhatsApp();
  });
}

function openWhatsApp() {
  const message = encodeURIComponent("Hi, I need help with my Washi Rides booking.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
}

// ---------------- HISTORY ----------------
async function loadHistory() {
  const list = el("history-list");
  list.innerHTML = `<div class="empty-state">Loading...</div>`;
  try {
    const { rides } = await WashiAPI.get(ROLE, "/api/rides");
    if (rides.length === 0) {
      list.innerHTML = `<div class="empty-state">No rides yet. Book your first ride from the Book tab.</div>`;
      return;
    }
    list.innerHTML = rides
      .map(
        (r) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:700;">${r.pickup} → ${r.destination}</div>
            <div class="muted">${formatDate(r.createdAt)}</div>
          </div>
          ${statusBadge(r.status)}
        </div>
        <div style="margin-top:8px; display:flex; justify-content:space-between;">
          <span class="muted">${r.distanceKm} km</span>
          <strong>${formatMoney(r.fare)}</strong>
        </div>
      </div>
    `
      )
      .join("");
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

// ---------------- SUBSCRIPTIONS ----------------
async function loadSubscriptions() {
  const list = el("plans-list");
  list.innerHTML = `<div class="empty-state">Loading plans...</div>`;
  try {
    const [{ plans }, { subscription }] = await Promise.all([
      WashiAPI.get(ROLE, "/api/subscriptions/plans"),
      WashiAPI.get(ROLE, "/api/subscriptions/me"),
    ]);

    if (subscription) {
      el("current-plan-card").style.display = "block";
      el("current-plan-name").textContent = subscription.plan.name;
      el("current-plan-expiry").textContent = `Renews/expires ${formatDate(subscription.expiresAt)}`;
    } else {
      el("current-plan-card").style.display = "none";
    }

    list.innerHTML = plans
      .map((plan) => {
        const isCurrent = subscription && subscription.planId === plan.id;
        return `
        <div class="card plan-card ${isCurrent ? "current" : ""}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <h3>${plan.name}</h3>
            ${isCurrent ? '<span class="badge green">Current plan</span>' : ""}
          </div>
          <div class="plan-price">${plan.priceKwacha === 0 ? "Free" : formatMoney(plan.priceKwacha) + (plan.durationDays ? ` / ${plan.durationDays}d` : "")}</div>
          <ul class="plan-perks">${plan.perks.map((p) => `<li>${p}</li>`).join("")}</ul>
          ${
            plan.priceKwacha > 0 && !isCurrent
              ? `<div style="margin-top:12px;"><button class="btn subscribe-btn" data-plan-id="${plan.id}" data-plan-amount="${plan.priceKwacha}">Subscribe</button></div>`
              : ""
          }
        </div>
      `;
      })
      .join("");

    document.querySelectorAll(".subscribe-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        openPaymentModal({
          type: "plan",
          planId: btn.getAttribute("data-plan-id"),
          amount: Number(btn.getAttribute("data-plan-amount")),
        });
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

// ---------------- ACCOUNT ----------------
function loadAccount() {
  el("account-name").textContent = state.user.name;
  el("account-phone").textContent = state.user.phone;
}

// ---------------- PAYMENT MODAL ----------------
function openPaymentModal(context) {
  state.paymentContext = context;
  state.selectedProvider = null;
  el("payment-modal").classList.add("active");
  el("payment-step-provider").style.display = "block";
  el("payment-step-pin").style.display = "none";
  el("payment-step-success").style.display = "none";
  el("pay-error").textContent = "";
  el("pin-error").textContent = "";
  el("pay-phone").value = state.user ? state.user.phone : "";
  el("pay-amount-label").textContent = `Amount due: ${formatMoney(context.amount)}`;
  document.querySelectorAll(".pill[data-provider]").forEach((p) => p.classList.remove("selected"));
}

function closePaymentModal() {
  el("payment-modal").classList.remove("active");
}

function bindPaymentModalEvents() {
  document.querySelectorAll(".pill[data-provider]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".pill[data-provider]").forEach((p) => p.classList.remove("selected"));
      pill.classList.add("selected");
      state.selectedProvider = pill.getAttribute("data-provider");
    });
  });

  el("pay-continue-btn").addEventListener("click", async () => {
    el("pay-error").textContent = "";
    const phoneNumber = el("pay-phone").value.trim();
    if (!state.selectedProvider) return (el("pay-error").textContent = "Choose a mobile money provider.");
    if (!phoneNumber) return (el("pay-error").textContent = "Enter your mobile money number.");

    try {
      const body = { provider: state.selectedProvider, phoneNumber };
      if (state.paymentContext.type === "ride") body.rideId = state.paymentContext.rideId;
      else body.planId = state.paymentContext.planId;

      const { payment } = await WashiAPI.post(ROLE, "/api/payments/initiate", body);
      state.paymentContext.paymentId = payment.id;
      el("payment-step-provider").style.display = "none";
      el("payment-step-pin").style.display = "block";
      el("pay-pin").value = "";
      el("pay-pin").focus();
    } catch (e) {
      el("pay-error").textContent = e.message;
    }
  });

  el("pay-confirm-btn").addEventListener("click", async () => {
    el("pin-error").textContent = "";
    const pin = el("pay-pin").value.trim();
    if (!/^\d{4}$/.test(pin)) {
      el("pin-error").textContent = "Enter the 4-digit PIN.";
      return;
    }
    try {
      const { payment } = await WashiAPI.post(ROLE, `/api/payments/${state.paymentContext.paymentId}/confirm`, { pin });
      el("payment-step-pin").style.display = "none";
      el("payment-step-success").style.display = "block";
      el("payment-success-ref").textContent = `Reference: ${payment.reference}`;
    } catch (e) {
      el("pin-error").textContent = e.message;
    }
  });

  el("payment-done-btn").addEventListener("click", async () => {
    closePaymentModal();
    if (state.paymentContext.type === "ride") {
      el("pay-now-btn").style.display = "none";
      showToast("Payment complete. Thanks for riding with Washi!");
      await loadHistory();
      showScreen("history");
    } else {
      showToast("Subscription activated!");
      await loadSubscriptions();
    }
  });

  el("modal-close-btn").addEventListener("click", closePaymentModal);
}

// ---------------- BOTTOM NAV ----------------
function bindNavEvents() {
  document.querySelectorAll("#bottom-nav button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-nav");
      if (target === "history") await loadHistory();
      if (target === "subscribe") await loadSubscriptions();
      if (target === "account") loadAccount();
      showScreen(target);
    });
  });
}

function bindEvents() {
  bindAuthEvents();
  bindHomeEvents();
  bindWaitingEvents();
  bindPaymentModalEvents();
  bindNavEvents();
}

init();
