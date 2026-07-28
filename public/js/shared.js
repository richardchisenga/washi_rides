// public/js/shared.js
// Small helpers shared by the rider, driver and admin frontends.

const WashiAPI = (() => {
  function tokenKey(role) {
    return `washi_token_${role}`;
  }

  function getToken(role) {
    return localStorage.getItem(tokenKey(role));
  }
  function setToken(role, token) {
    localStorage.setItem(tokenKey(role), token);
  }
  function clearToken(role) {
    localStorage.removeItem(tokenKey(role));
  }

  async function request(role, method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken(role);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      // no body
    }
    if (!res.ok) {
      const error = new Error(data.error || "Something went wrong.");
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  return {
    getToken,
    setToken,
    clearToken,
    get: (role, path) => request(role, "GET", path),
    post: (role, path, body) => request(role, "POST", path, body),
    patch: (role, path, body) => request(role, "PATCH", path, body),
    del: (role, path) => request(role, "DELETE", path),
  };
})();

// Simple element helper
function el(id) {
  return document.getElementById(id);
}

function formatMoney(amount) {
  return `K${Number(amount).toFixed(2)}`;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status) {
  const map = {
    pending: ["Pending", "amber"],
    approved: ["Approved", "green"],
    rejected: ["Rejected", "red"],
    requested: ["Requested", "amber"],
    accepted: ["Accepted", "green"],
    in_progress: ["In progress", "green"],
    completed: ["Completed", "grey"],
    cancelled: ["Cancelled", "red"],
    active: ["Active", "green"],
    inactive: ["Inactive", "grey"],
    unassigned: ["Unassigned", "grey"],
    success: ["Success", "green"],
    failed: ["Failed", "red"],
    awaiting_pin: ["Awaiting PIN", "amber"],
  };
  const [label, cls] = map[status] || [status, "grey"];
  return `<span class="badge ${cls}">${label}</span>`;
}

function showToast(message, isError) {
  let toast = el("__toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "__toast";
    toast.style.position = "fixed";
    toast.style.bottom = "90px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "12px";
    toast.style.fontSize = "0.85rem";
    toast.style.fontWeight = "600";
    toast.style.color = "#fff";
    toast.style.zIndex = "200";
    toast.style.maxWidth = "90%";
    toast.style.textAlign = "center";
    toast.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
    document.body.appendChild(toast);
  }
  toast.style.background = isError ? "#c0392b" : "#4B0A7A";
  toast.textContent = message;
  toast.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => (toast.style.display = "none"), 3200);
}
