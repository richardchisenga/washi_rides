// lib/db.js
// Tiny zero-dependency JSON-file "database".
// Each "table" is a JSON file in /data holding an array of records.
// Not built for high concurrency - fine for a demo / small deployment.

const fs = require("fs");
const path = require("path");

// 👇 This is the only line that changes – it reads the DATA_DIR env var
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");

function filePath(table) {
  return path.join(DATA_DIR, `${table}.json`);
}

function ensureFile(table, defaultValue) {
  const fp = filePath(table);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(defaultValue, null, 2));
  }
}

function readTable(table) {
  const fp = filePath(table);
  if (!fs.existsSync(fp)) return [];
  const raw = fs.readFileSync(fp, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${table}.json, returning empty array`, e);
    return [];
  }
}

function writeTable(table, data) {
  const fp = filePath(table);
  // Write to a temp file then rename, to avoid partial writes corrupting data.
  const tmp = fp + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, fp);
}

function insert(table, record) {
  const rows = readTable(table);
  rows.push(record);
  writeTable(table, rows);
  return record;
}

function findAll(table, predicate) {
  const rows = readTable(table);
  return predicate ? rows.filter(predicate) : rows;
}

function findOne(table, predicate) {
  const rows = readTable(table);
  return rows.find(predicate) || null;
}

function update(table, predicate, updater) {
  const rows = readTable(table);
  let updated = null;
  const next = rows.map((row) => {
    if (predicate(row)) {
      updated = updater(row);
      return updated;
    }
    return row;
  });
  writeTable(table, next);
  return updated;
}

function remove(table, predicate) {
  const rows = readTable(table);
  const next = rows.filter((row) => !predicate(row));
  const removedCount = rows.length - next.length;
  writeTable(table, next);
  return removedCount;
}

module.exports = {
  DATA_DIR,
  ensureFile,
  readTable,
  writeTable,
  insert,
  findAll,
  findOne,
  update,
  remove,
};