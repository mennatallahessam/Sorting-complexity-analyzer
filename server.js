// server.js — Express + SQLite backend for Sorting Complexity Analyzer

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static frontend files from the project root
app.use(express.static(path.join(__dirname)));

// ── Database setup ───────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'history.db'));

// Create runs table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT    NOT NULL,
    algorithm   TEXT    NOT NULL,
    time_ms     REAL    NOT NULL,
    comparisons INTEGER NOT NULL,
    swaps       INTEGER NOT NULL,
    array_size  INTEGER NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
  );
`);

// Prepared statements
const insertRun = db.prepare(`
  INSERT INTO runs (session_id, algorithm, time_ms, comparisons, swaps, array_size)
  VALUES (@session_id, @algorithm, @time_ms, @comparisons, @swaps, @array_size)
`);

const getAllRuns = db.prepare(`
  SELECT * FROM runs ORDER BY created_at DESC LIMIT 100
`);

const deleteRun = db.prepare(`DELETE FROM runs WHERE id = ?`);

const clearAll = db.prepare(`DELETE FROM runs`);

const getStats = db.prepare(`
  SELECT
    algorithm,
    COUNT(*)          AS total_runs,
    ROUND(AVG(time_ms), 2) AS avg_time_ms,
    MIN(time_ms)      AS best_time_ms,
    SUM(comparisons)  AS total_comparisons,
    SUM(swaps)        AS total_swaps
  FROM runs
  GROUP BY algorithm
  ORDER BY avg_time_ms ASC
`);

// ── API Routes ───────────────────────────────────────────────────────────────

// POST /api/runs — save a batch of results from one session run
app.post('/api/runs', (req, res) => {
  const { session_id, results } = req.body;

  if (!session_id || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'session_id and results[] are required.' });
  }

  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      insertRun.run({
        session_id,
        algorithm:   r.algorithm,
        time_ms:     r.time_ms,
        comparisons: r.comparisons,
        swaps:       r.swaps,
        array_size:  r.array_size,
      });
    }
  });

  try {
    insertMany(results);
    res.json({ ok: true, saved: results.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// GET /api/runs — fetch recent run history (last 100 rows)
app.get('/api/runs', (req, res) => {
  try {
    const rows = getAllRuns.all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// GET /api/stats — aggregate stats per algorithm
app.get('/api/stats', (req, res) => {
  try {
    const rows = getStats.all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// DELETE /api/runs/:id — remove a single run entry
app.delete('/api/runs/:id', (req, res) => {
  try {
    const info = deleteRun.run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// DELETE /api/runs — clear all history
app.delete('/api/runs', (req, res) => {
  try {
    clearAll.run();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// Fallback: serve index.html for any unmatched route (Express 5 wildcard syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Server running at http://localhost:${PORT}`);
});
