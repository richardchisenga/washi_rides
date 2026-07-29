// server.js
// Zero-dependency Node.js server for Washi Rides.
// Serves the static frontend and a small JSON API, all from Node's built-in
// http/fs modules - no npm install required.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const { Router, sendJson } = require("./lib/router");
const { seed } = require("./lib/seed");

seed();

const router = new Router();
require("./routes/auth").register(router);
require("./routes/rider").register(router);
require("./routes/driver").register(router);
require("./routes/admin").register(router);
require("./routes/payments").register(router);

const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  // Prevent path traversal outside the public directory.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("Not found");
      }
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end("Server error");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/api/")) {
    const match = router.match(req.method, pathname);
    if (!match) {
      return sendJson(res, 404, { error: "Unknown API endpoint." });
    }
    return match.handler(req, res, match.params);
  }

  return serveStatic(req, res, pathname);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Washi Rides running at http://localhost:${PORT}`);
  console.log(` - Rider app:  http://localhost:${PORT}/index.html`);
  console.log(` - Driver app: http://localhost:${PORT}/driver.html`);
  console.log(` - Admin app:  http://localhost:${PORT}/admin.html`);
});
