// public/js/driver.js
const ROLE = "driver";
const WHATSAPP_NUMBER = "260123456789"; // Replace this number with your own WhatsApp number

let state = {
  user: null,
  pollTimer: null,
};

const screens = ["auth", "pending", "dashboard"];
function showScreen(name) {
  screens.forEach((s) => el(`screen-${s}`).classList.remove("active"));
  el(`screen-${name}`).classList.add("active");
}

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
  bindEvents();
}

function onLoggedIn() {
  el("header-account").style.display = "block";
  el("header-name").textContent = state.user.name;
  if (state.user.status === "pending") {
    showScreen("pending");
    return;
  }
  if (state.user.status === "rejected") {
    showToast("Your application was not approved. Contact support.", true);
    showScreen("auth");
    return;
  }
  loadDashboard();
  showScreen("dashboard");
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(loadRides, 4000);
}

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
      const { token, user } = await WashiAPI.post(ROLE, "/api/auth/login", { phone, password, role: "driver" });
      WashiAPI.setToken(ROLE, token);
      state.user = user;
      onLoggedIn();
    } catch (e) {
      el("login-error").textContent = e.message;
    }
  });

  el("register-btn").addEventListener("click", async () => {
    el("reg-error").textContent = "";
    el("reg-success").textContent = "";
    const name = el("reg-name").value.trim();
    const phone = el("reg-phone").value.trim();
    const password = el("reg-password").value;
    const licenseNumber = el("reg-license").value.trim();
    const bike = {
      plate: el("reg-bike-plate").value.trim(),
      model: el("reg-bike-model").value.trim(),
      color: el("reg-bike-color").value.trim(),
    };
    if (!name || !phone || !password || !licenseNumber || !bike.plate || !bike.model) {
      el("reg-error").textContent = "Please fill in all required fields.";
      return;
    }
    try {
      const { message } = await WashiAPI.post(ROLE, "/api/auth/register/driver", {
        name,
        phone,
        password,
        licenseNumber,
        bike,
      });
      el("reg-success").textContent = message;
      showToast("Application submitted!");
    } catch (e) {
      el("reg-error").textContent = e.message;
    }
  });

  el("logout-link").addEventListener("click", () => {
    WashiAPI.clearToken(ROLE);
    state.user = null;
    clearInterval(state.pollTimer);
    el("header-account").style.display = "none";
    showScreen("auth");
  });
}

async function loadDashboard() {
  try {
    const { driver, bike } = await WashiAPI.get(ROLE, "/api/driver/me");
    el("online-toggle").checked = driver.online;
    el("online-status-label").textContent = driver.online ? "Online & available" : "Offline";
    el("bike-info").textContent = bike ? `${bike.model}${bike.color ? " · " + bike.color : ""} · ${bike.plate}` : "No bike on file";
  } catch (e) {
    showToast(e.message, true);
  }
  await loadRides();
}

function bindDashboardEvents() {
  el("online-toggle").addEventListener("change", async (e) => {
    try {
      const { online } = await WashiAPI.patch(ROLE, "/api/driver/status", { online: e.target.checked });
      el("online-status-label").textContent = online ? "Online & available" : "Offline";
      showToast(online ? "You're online" : "You're now offline");
    } catch (err) {
      e.target.checked = !e.target.checked;
      showToast(err.message, true);
    }
  });

  el("footer-support-link").addEventListener("click", (e) => {
    e.preventDefault();
    const message = encodeURIComponent("Hi, I need help with my Washi Rides driver account.");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  });
}

async function loadRides() {
  const list = el("rides-list");
  try {
    const { rides } = await WashiAPI.get(ROLE, "/api/driver/rides");
    if (rides.length === 0) {
      list.innerHTML = `<div class="empty-state">No ride requests yet. Go online to start receiving requests.</div>`;
      return;
    }
    list.innerHTML = rides
      .map((r) => {
        const actions =
          r.status === "requested"
            ? `<div class="btn-row" style="margin-top:10px;">
                 <button class="btn success accept-btn" data-ride-id="${r.id}">Accept</button>
                 <button class="btn danger decline-btn" data-ride-id="${r.id}">Decline</button>
               </div>`
            : "";
        return `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-weight:700;">${r.pickup} → ${r.destination}</div>
              <div class="muted">${r.riderName} · ${formatDate(r.createdAt)}</div>
            </div>
            ${statusBadge(r.status)}
          </div>
          <div style="margin-top:8px; display:flex; justify-content:space-between;">
            <span class="muted">${r.distanceKm} km</span>
            <strong>${formatMoney(r.fare)}</strong>
          </div>
          ${actions}
        </div>
      `;
      })
      .join("");

    document.querySelectorAll(".accept-btn").forEach((btn) =>
      btn.addEventListener("click", () => respondToRide(btn.getAttribute("data-ride-id"), "accept"))
    );
    document.querySelectorAll(".decline-btn").forEach((btn) =>
      btn.addEventListener("click", () => respondToRide(btn.getAttribute("data-ride-id"), "decline"))
    );
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

async function respondToRide(rideId, action) {
  try {
    await WashiAPI.post(ROLE, `/api/driver/rides/${rideId}/${action}`, {});
    showToast(action === "accept" ? "Ride accepted" : "Ride declined");
    await loadRides();
  } catch (e) {
    showToast(e.message, true);
  }
}

function bindEvents() {
  bindAuthEvents();
  bindDashboardEvents();
}

init();
