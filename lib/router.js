// lib/router.js
// A tiny router built on Node's http module. No Express, no dependencies.

const { verify } = require("./auth");

class Router {
  constructor() {
    this.routes = []; // { method, pattern (regex), keys, handler }
  }

  _add(method, path, handler) {
    const keys = [];
    const pattern = path
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          keys.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    this.routes.push({
      method,
      regex: new RegExp(`^${pattern}/?$`),
      keys,
      handler,
    });
  }

  get(path, handler) {
    this._add("GET", path, handler);
  }
  post(path, handler) {
    this._add("POST", path, handler);
  }
  patch(path, handler) {
    this._add("PATCH", path, handler);
  }
  delete(path, handler) {
    this._add("DELETE", path, handler);
  }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = pathname.match(route.regex);
      if (m) {
        const params = {};
        route.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])));
        return { handler: route.handler, params };
      }
    }
    return null;
  }
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// Extracts and verifies the bearer token, returns payload or null.
function getAuthUser(req) {
  const header = req.headers["authorization"] || "";
  const [, token] = header.split(" ");
  if (!token) return null;
  return verify(token);
}

// Wraps a handler so unhandled errors become clean JSON 500s instead of crashing.
function safe(handler) {
  return async (req, res, params) => {
    try {
      await handler(req, res, params);
    } catch (err) {
      console.error("Request error:", err);
      sendJson(res, 500, { error: "Something went wrong on the server." });
    }
  };
}

// Requires a valid token, optionally restricted to certain roles.
function requireAuth(roles) {
  return (handler) =>
    safe(async (req, res, params) => {
      const user = getAuthUser(req);
      if (!user) {
        return sendJson(res, 401, { error: "Please log in to continue." });
      }
      if (roles && !roles.includes(user.role)) {
        return sendJson(res, 403, { error: "You don't have access to do that." });
      }
      req.user = user;
      return handler(req, res, params);
    });
}

module.exports = {
  Router,
  sendJson,
  readJsonBody,
  getAuthUser,
  safe,
  requireAuth,
};
