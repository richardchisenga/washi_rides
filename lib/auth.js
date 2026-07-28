// lib/auth.js
// Password hashing (scrypt) and lightweight signed tokens (JWT-like, HMAC-SHA256).
// No external dependencies - built on Node's built-in "crypto" module.

const crypto = require("crypto");

// ---------- Server secret ----------
// Use environment variable, or generate a random one for local development.
// For production, ALWAYS set JWT_SECRET in your environment variables.
function getServerSecret() {
  return process.env.JWT_SECRET || crypto.randomBytes(48).toString("hex");
}

const SERVER_SECRET = getServerSecret();

// ---------- Password hashing ----------

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(plainPassword, salt, expectedHash) {
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------- Tokens (JWT-like) ----------
// header.payload.signature, base64url encoded, HMAC-SHA256 signed.

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";
  return Buffer.from(input, "base64").toString("utf8");
}

function sign(payload, expiresInSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac("sha256", SERVER_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest("hex");
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerEncoded, payloadEncoded, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", SERVER_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest("hex");

  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expectedSignature, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(payloadEncoded));
  } catch (e) {
    return null;
  }
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

module.exports = { hashPassword, verifyPassword, sign, verify };
