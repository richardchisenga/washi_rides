// public/js/admin.js
const ROLE = "admin";

let state = {
  user: null,
  editingBikeId: null,
  editingPlanId: null,
  driversCache: [],
};

function showScreen(name) {
  ["auth", "dashboard"].forEach((s) => el(`screen-${s}`).classList.remove("active"));
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
  showScreen("dashboard");
  loadOverview();
}

function bindAuthEvents() {
  el("login-btn").addEventListener("click", async () => {
    el("login-error").textContent = "";
    const phone = el("login-phone").value.trim();
    const password = el("login-password").value;
    if (!phone || !password) {
      el("login-error").textContent = "Enter your username and password.";
      return;
    }
    try {
      const { token, user } = await WashiAPI.post(ROLE, "/api/auth/login", { phone, password, role: "admin" });
      WashiAPI.setToken(ROLE, token);
      state.user = user;
      onLoggedIn();
    } catch (e) {
      el("login-error").textContent = e.message;
    }
  });

  el("logout-link").addEventListener("click", () => {
    WashiAPI.clearToken(ROLE);
    state.user = null;
    el("header-account").style.display = "none";
    showScreen("auth");
  });
}

// ---------------- TABS ----------------
function bindTabEvents() {
  document.querySelectorAll(".tab[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab[data-tab]").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      el(`panel-${target}`).style.display = "block";
      if (target === "overview") loadOverview();
      if (target === "drivers") loadDrivers();
      if (target === "bikes") loadBikes();
      if (target === "riders") loadRiders();
      if (target === "rides") loadRides();
      if (target === "plans") loadPlans();
    });
  });
}

// ---------------- OVERVIEW ----------------
async function loadOverview() {
  try {
    const { stats } = await WashiAPI.get(ROLE, "/api/admin/stats");
    el("stat-riders").textContent = stats.totalRiders;
    el("stat-drivers").textContent = stats.totalDrivers;
    el("stat-pending").textContent = stats.pendingDriverApprovals;
    el("stat-online").textContent = stats.onlineDrivers;
    el("stat-rides-today").textContent = stats.ridesToday;
    el("stat-rides-total").textContent = stats.totalRides;
    el("stat-revenue").textContent = formatMoney(stats.revenueKwacha);
  } catch (e) {
    showToast(e.message, true);
  }
}

// ---------------- DRIVERS ----------------
async function loadDrivers() {
  const tbody = el("drivers-table-body");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const { drivers } = await WashiAPI.get(ROLE, "/api/admin/drivers");
    state.driversCache = drivers;
    if (drivers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No drivers have applied yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = drivers
      .map(
        (d) => `
      <tr>
        <td>${d.name}</td>
        <td>${d.phone}</td>
        <td>${d.bike ? `${d.bike.model} (${d.bike.plate})` : "-"}</td>
        <td>${statusBadge(d.status)}</td>
        <td>${d.online ? '<span class="badge green">Online</span>' : '<span class="badge grey">Offline</span>'}</td>
        <td>
          ${
            d.status === "pending"
              ? `<div class="btn-row"><button class="btn small success approve-btn" data-id="${d.id}">Approve</button><button class="btn small danger reject-btn" data-id="${d.id}">Reject</button></div>`
              : d.status === "approved"
              ? `<button class="btn small danger reject-btn" data-id="${d.id}">Revoke</button>`
              : `<button class="btn small success approve-btn" data-id="${d.id}">Re-approve</button>`
          }
        </td>
      </tr>
    `
      )
      .join("");

    document.querySelectorAll(".approve-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try {
          await WashiAPI.post(ROLE, `/api/admin/drivers/${btn.getAttribute("data-id")}/approve`, {});
          showToast("Driver approved.");
          await loadDrivers();
        } catch (e) {
          showToast(e.message, true);
        }
      })
    );
    document.querySelectorAll(".reject-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try {
          await WashiAPI.post(ROLE, `/api/admin/drivers/${btn.getAttribute("data-id")}/reject`, {});
          showToast("Driver rejected.");
          await loadDrivers();
        } catch (e) {
          showToast(e.message, true);
        }
      })
    );
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6">${e.message}</td></tr>`;
  }
}

// ---------------- BIKES ----------------
async function loadBikes() {
  const tbody = el("bikes-table-body");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const { bikes } = await WashiAPI.get(ROLE, "/api/admin/bikes");
    if (bikes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No bikes yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = bikes
      .map(
        (b) => `
      <tr>
        <td>${b.plate}</td>
        <td>${b.model}</td>
        <td>${b.color || "-"}</td>
        <td>${b.driverName || "Unassigned"}</td>
        <td>${statusBadge(b.status)}</td>
        <td>
          <div class="btn-row">
            <button class="btn small secondary edit-bike-btn" data-id="${b.id}">Edit</button>
            <button class="btn small danger delete-bike-btn" data-id="${b.id}">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");

    document.querySelectorAll(".edit-bike-btn").forEach((btn) =>
      btn.addEventListener("click", () => openBikeModal(bikes.find((b) => b.id === btn.getAttribute("data-id"))))
    );
    document.querySelectorAll(".delete-bike-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Remove this bike from the fleet?")) return;
        try {
          await WashiAPI.del(ROLE, `/api/admin/bikes/${btn.getAttribute("data-id")}`);
          showToast("Bike removed.");
          await loadBikes();
        } catch (e) {
          showToast(e.message, true);
        }
      })
    );
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6">${e.message}</td></tr>`;
  }
}

function bindAddBike() {
  el("add-bike-btn").addEventListener("click", async () => {
    const plate = el("new-bike-plate").value.trim();
    const model = el("new-bike-model").value.trim();
    const color = el("new-bike-color").value.trim();
    if (!plate || !model) return showToast("Plate and model are required.", true);
    try {
      await WashiAPI.post(ROLE, "/api/admin/bikes", { plate, model, color });
      el("new-bike-plate").value = "";
      el("new-bike-model").value = "";
      el("new-bike-color").value = "";
      showToast("Bike added.");
      await loadBikes();
    } catch (e) {
      showToast(e.message, true);
    }
  });
}

async function openBikeModal(bike) {
  state.editingBikeId = bike.id;
  el("edit-bike-plate").value = bike.plate;
  el("edit-bike-model").value = bike.model;
  el("edit-bike-color").value = bike.color || "";

  const select = el("edit-bike-driver");
  const approvedDrivers = state.driversCache.length
    ? state.driversCache.filter((d) => d.status === "approved")
    : (await WashiAPI.get(ROLE, "/api/admin/drivers")).drivers.filter((d) => d.status === "approved");
  select.innerHTML =
    `<option value="">Unassigned</option>` +
    approvedDrivers.map((d) => `<option value="${d.id}" ${d.id === bike.driverId ? "selected" : ""}>${d.name}</option>`).join("");

  el("bike-modal").classList.add("active");
}

function bindBikeModal() {
  el("close-bike-modal").addEventListener("click", () => el("bike-modal").classList.remove("active"));
  el("save-bike-btn").addEventListener("click", async () => {
    try {
      await WashiAPI.patch(ROLE, `/api/admin/bikes/${state.editingBikeId}`, {
        plate: el("edit-bike-plate").value.trim(),
        model: el("edit-bike-model").value.trim(),
        color: el("edit-bike-color").value.trim(),
        driverId: el("edit-bike-driver").value || null,
        status: el("edit-bike-driver").value ? "active" : "unassigned",
      });
      el("bike-modal").classList.remove("active");
      showToast("Bike updated.");
      await loadBikes();
    } catch (e) {
      showToast(e.message, true);
    }
  });
}

// ---------------- RIDERS ----------------
async function loadRiders() {
  const tbody = el("riders-table-body");
  tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;
  try {
    const { riders } = await WashiAPI.get(ROLE, "/api/admin/riders");
    if (riders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">No riders yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = riders
      .map((r) => `<tr><td>${r.name}</td><td>${r.phone}</td><td>${formatDate(r.createdAt)}</td><td>${r.activePlan || "Pay As You Go"}</td></tr>`)
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4">${e.message}</td></tr>`;
  }
}

// ---------------- RIDES ----------------
async function loadRides() {
  const tbody = el("rides-table-body");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const { rides } = await WashiAPI.get(ROLE, "/api/admin/rides");
    if (rides.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No rides yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = rides
      .map(
        (r) => `
      <tr>
        <td>${r.pickup} → ${r.destination}</td>
        <td>${r.riderName}</td>
        <td>${r.driverName}</td>
        <td>${formatMoney(r.fare)}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${formatDate(r.createdAt)}</td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6">${e.message}</td></tr>`;
  }
}

// ---------------- PLANS ----------------
async function loadPlans() {
  const list = el("plans-list");
  list.innerHTML = `<div class="empty-state">Loading...</div>`;
  try {
    const { plans } = await WashiAPI.get(ROLE, "/api/admin/subscriptions/plans");
    list.innerHTML = plans
      .map(
        (p) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h3>${p.name}</h3>
            <div class="muted">${p.priceKwacha === 0 ? "Free" : formatMoney(p.priceKwacha) + " / " + p.durationDays + "d"} · ${p.discountPercent}% ride discount</div>
          </div>
          <button class="btn small secondary edit-plan-btn" data-id="${p.id}">Edit</button>
        </div>
        <ul class="plan-perks">${p.perks.map((perk) => `<li>${perk}</li>`).join("")}</ul>
      </div>
    `
      )
      .join("");

    document.querySelectorAll(".edit-plan-btn").forEach((btn) =>
      btn.addEventListener("click", () => openPlanModal(plans.find((p) => p.id === btn.getAttribute("data-id"))))
    );
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

function openPlanModal(plan) {
  state.editingPlanId = plan.id;
  el("edit-plan-name").value = plan.name;
  el("edit-plan-price").value = plan.priceKwacha;
  el("edit-plan-duration").value = plan.durationDays;
  el("edit-plan-discount").value = plan.discountPercent;
  el("edit-plan-perks").value = plan.perks.join("\n");
  el("plan-modal").classList.add("active");
}

function bindPlanModal() {
  el("close-plan-modal").addEventListener("click", () => el("plan-modal").classList.remove("active"));
  el("save-plan-btn").addEventListener("click", async () => {
    try {
      await WashiAPI.patch(ROLE, `/api/admin/subscriptions/plans/${state.editingPlanId}`, {
        name: el("edit-plan-name").value.trim(),
        priceKwacha: Number(el("edit-plan-price").value),
        durationDays: Number(el("edit-plan-duration").value),
        discountPercent: Number(el("edit-plan-discount").value),
        perks: el("edit-plan-perks").value.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      el("plan-modal").classList.remove("active");
      showToast("Plan updated.");
      await loadPlans();
    } catch (e) {
      showToast(e.message, true);
    }
  });
}

function bindEvents() {
  bindAuthEvents();
  bindTabEvents();
  bindAddBike();
  bindBikeModal();
  bindPlanModal();
}

init();
