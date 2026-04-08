'use strict';

const API_BASE = '/api';

// 4 simple personas — easy to explain
const PERSONAS = {
  CREATIVE: {
    label: 'Creative Coder',
    description: 'You build interactive and user-focused apps.',
    song: 'Blinding Lights',
  },
  BACKEND: {
    label: 'Backend Builder',
    description: 'You focus on logic and system design.',
    song: 'Till I Collapse',
  },
  GRINDER: {
    label: 'Consistent Grinder',
    description: 'You build regularly and improve steadily.',
    song: 'Lose Yourself',
  },
  BEGINNER: {
    label: 'Explorer',
    description: 'You are learning and experimenting.',
    song: 'A Sky Full of Stars',
  },
};

// Simple persona logic — explainable in 10 seconds
function getPersona(topLang, totalRepos) {
  if (topLang === 'JavaScript' || topLang === 'TypeScript') return PERSONAS.CREATIVE;
  if (topLang === 'Java' || topLang === 'C++' || topLang === 'C' || topLang === 'Python') return PERSONAS.BACKEND;
  if (totalRepos > 10) return PERSONAS.GRINDER;
  return PERSONAS.BEGINNER;
}

// Count languages and stars from repos
function analyze(repos) {
  let stars = 0;
  const langs = {};

  for (const r of repos) {
    stars += r.stargazers_count || 0;
    if (r.language) {
      langs[r.language] = (langs[r.language] || 0) + 1;
    }
  }

  const topLang = Object.keys(langs).sort((a, b) => langs[b] - langs[a])[0];
  return { topLang, totalStars: stars };
}

// DOM elements
const input     = document.getElementById('github-input');
const genBtn    = document.getElementById('generate-btn');
const errorEl   = document.getElementById('error-msg');
const loadingEl = document.getElementById('loading');
const resultEl  = document.getElementById('result');
const avatarEl  = document.getElementById('avatar');
const usernameEl= document.getElementById('username');
const topLangEl = document.getElementById('top-lang');
const statsEl   = document.getElementById('stats');
const personaEl = document.getElementById('persona');
const descEl    = document.getElementById('persona-desc');
const songEl    = document.getElementById('song');
const playBtn   = document.getElementById('play-btn');
const resetBtn  = document.getElementById('reset-btn');

// Helpers
function showError(msg) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
function hideError()    { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
function fmt(n)         { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

// Fetch user profile from our server
async function fetchUser(username) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(username)}`);
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (!res.ok) throw new Error('API_ERROR');
  return res.json();
}

// Fetch repos from our server
async function fetchRepos(username) {
  const res = await fetch(`${API_BASE}/repos/${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error('API_ERROR');
  return res.json();
}

// Main flow
async function generate(username) {
  hideError();
  genBtn.disabled = true;
  genBtn.textContent = 'Loading...';
  loadingEl.classList.remove('hidden');
  resultEl.classList.add('hidden');

  try {
    // Step 1: Fetch user + repos in parallel
    const [user, repos] = await Promise.all([
      fetchUser(username),
      fetchRepos(username),
    ]);

    if (!repos.length) {
      showError('No public repos found.');
      return;
    }

    // Step 2: Analyze repos
    const { topLang, totalStars } = analyze(repos);

    // Step 3: Pick persona based on top language + repo count
    const persona = getPersona(topLang, user.public_repos || 0);

    // Step 4: Show result
    avatarEl.src = user.avatar_url || '';
    usernameEl.textContent = user.login;
    topLangEl.textContent = topLang || 'Unknown';
    statsEl.textContent = `${fmt(user.public_repos || 0)} repos · ${fmt(totalStars)} stars`;
    personaEl.textContent = persona.label;
    descEl.textContent = persona.description;
    songEl.textContent = persona.song;

    // Store song for play button
    playBtn.onclick = () => {
      window.open(`https://open.spotify.com/search/${encodeURIComponent(persona.song)}`, '_blank');
    };

    loadingEl.classList.add('hidden');
    resultEl.classList.remove('hidden');

  } catch (err) {
    loadingEl.classList.add('hidden');
    showError(err.message === 'NOT_FOUND' ? 'User not found.' : 'Something went wrong.');
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = 'Generate';
  }
}

// Events
genBtn.addEventListener('click', () => {
  const u = input.value.trim();
  if (!u) { showError('Enter a username.'); return; }
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(u)) { showError('Invalid username.'); return; }
  generate(u);
});

input.addEventListener('keydown', e => { if (e.key === 'Enter') genBtn.click(); });
input.addEventListener('input', () => { if (errorEl.classList.contains('visible')) hideError(); });

resetBtn.addEventListener('click', () => {
  resultEl.classList.add('hidden');
  input.value = '';
  input.focus();
});

input.focus();
