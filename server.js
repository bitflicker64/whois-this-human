'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3333;

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
// Keyed by "type:username", TTL of 5 minutes

const cache    = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── GITHUB HEADERS ──────────────────────────────────────────────────────────

const PLACEHOLDER_TOKEN = 'your_token_here';

function githubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token && token !== PLACEHOLDER_TOKEN) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ─── PROXY HELPERS ───────────────────────────────────────────────────────────

async function ghFetch(url) {
  const res = await fetch(url, { headers: githubHeaders() });

  // Surface rate-limit info in logs
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    console.log(`[GitHub] ${url} → ${res.status} (rate limit remaining: ${remaining})`);
  }

  return res;
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /api/user/:username
app.get('/api/user/:username', async (req, res) => {
  const { username } = req.params;
  const cacheKey = `user:${username}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return res.json(cached);
  }

  try {
    const ghRes = await ghFetch(`https://api.github.com/users/${encodeURIComponent(username)}`);

    if (ghRes.status === 404) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    if (!ghRes.ok) {
      const text = await ghRes.text();
      console.error(`[GitHub error] ${ghRes.status}: ${text}`);
      return res.status(ghRes.status).json({ error: 'GITHUB_ERROR' });
    }

    const data = await ghRes.json();
    cacheSet(cacheKey, data);
    res.json(data);

  } catch (err) {
    console.error('[/api/user error]', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/repos/:username
app.get('/api/repos/:username', async (req, res) => {
  const { username } = req.params;
  const cacheKey = `repos:${username}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return res.json(cached);
  }

  try {
    const ghRes = await ghFetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`
    );

    if (!ghRes.ok) {
      const text = await ghRes.text();
      console.error(`[GitHub error] ${ghRes.status}: ${text}`);
      return res.status(ghRes.status).json({ error: 'GITHUB_ERROR' });
    }

    const data = await ghRes.json();
    cacheSet(cacheKey, data);
    res.json(data);

  } catch (err) {
    console.error('[/api/repos error]', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});


// ─── STATIC FILES ────────────────────────────────────────────────────────────
// Serve index.html, style.css, script.js from the same directory

app.use(express.static(path.join(__dirname)));

// ─── START ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const token = process.env.GITHUB_TOKEN;
  const tokenStatus = (token && token !== PLACEHOLDER_TOKEN)
    ? '✓ GitHub token loaded'
    : '⚠  No GITHUB_TOKEN — using unauthenticated API (60 req/hr limit)';
  console.log(`\n  🎵  Server running at http://localhost:${PORT}`);
  console.log(`  ${tokenStatus}\n`);
});
