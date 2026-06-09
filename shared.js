// ============================================================
//  WORLD CUP 2026 PREDICTOR — SHARED CONFIG & UTILITIES
// ============================================================

const CONFIG = {
  GITHUB_USERNAME: 'Bigmac-git',
  GITHUB_REPO:     'wc2026-predictor',
  WC_LEAGUE_ID:    1,
  WC_SEASON:       2026,
  API_FOOTBALL_KEY: '',
  JSONBIN_BIN_ID:   '',
  JSONBIN_MASTER_KEY: '',
  SUPER_ADMIN_PW: 'wc2026superadmin',
};

// ============================================================
//  AUTO-LOAD KEYS FROM SECRET GIST
// ============================================================
const GIST_ID = 'ab198939037b472c9892104e0aff6674';
const JSONBIN = { BASE_URL: 'https://api.jsonbin.io/v3' };

let keysLoaded = false;
let keysLoadPromise = null;

function ensureKeys() {
  if (keysLoaded) return Promise.resolve();
  if (keysLoadPromise) return keysLoadPromise;
  keysLoadPromise = fetch(`https://api.github.com/gists/${GIST_ID}`)
    .then(r => r.json())
    .then(data => {
      const file = data.files['wc2026-keys.json'];
      if (!file) return;
      const keys = JSON.parse(file.content);
      if (keys.API_FOOTBALL_KEY)   CONFIG.API_FOOTBALL_KEY   = keys.API_FOOTBALL_KEY;
      if (keys.JSONBIN_MASTER_KEY) CONFIG.JSONBIN_MASTER_KEY = keys.JSONBIN_MASTER_KEY;
      if (keys.JSONBIN_BIN_ID)     CONFIG.JSONBIN_BIN_ID     = keys.JSONBIN_BIN_ID;
      keysLoaded = true;
      console.log('Keys loaded ✓');
    })
    .catch(e => console.warn('Key load failed:', e.message));
  return keysLoadPromise;
}

// ============================================================
//  JSONBIN HELPERS
// ============================================================
async function binGet() {
  await ensureKeys();
  const r = await fetch(`${JSONBIN.BASE_URL}/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY }
  });
  if (!r.ok) return null;
  const d = await r.json();
  const rec = d.record || {};
  if (!rec.groups) rec.groups = {};
  if (!rec.users)  rec.users  = {};
  return rec;
}

async function binPut(data) {
  await ensureKeys();
  const r = await fetch(`${JSONBIN.BASE_URL}/b/${CONFIG.JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': CONFIG.JSONBIN_MASTER_KEY },
    body: JSON.stringify(data)
  });
  return r.ok;
}

// Group CRUD
async function getGroup(code) {
  const db = await binGet();
  return db?.groups?.[code] || null;
}

async function getAllGroups() {
  const db = await binGet();
  return db?.groups || {};
}

async function saveGroup(code, groupData) {
  const db = await binGet() || { groups: {} };
  if (!db.groups) db.groups = {};
  db.groups[code] = groupData;
  return await binPut(db);
}

async function saveSubmission(groupCode, playerName, prediction) {
  const db = await binGet() || { groups: {} };
  if (!db.groups[groupCode]) return false;
  if (!db.groups[groupCode].submissions) db.groups[groupCode].submissions = {};
  const key = playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  db.groups[groupCode].submissions[key] = { ...prediction, playerName, submittedAt: new Date().toISOString() };
  return await binPut(db);
}

async function getSubmissions(groupCode) {
  const group = await getGroup(groupCode);
  return Object.values(group?.submissions || {});
}

async function deleteSubmission(groupCode, playerKey) {
  const db = await binGet();
  if (!db?.groups?.[groupCode]?.submissions?.[playerKey]) return false;
  delete db.groups[groupCode].submissions[playerKey];
  return await binPut(db);
}

// Generate unique group code
function generateGroupCode(name) {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

// ============================================================
//  POINTS SYSTEM
// ============================================================
const POINTS = {
  A_CORRECT_RESULT: 1, A_CORRECT_SCORELINE: 6, A_CORRECT_SCORE_TEAM: 1,
  A_TOP_SCORER: 7, A_PLAYER_CARDED: 5, A_OWN_GOAL: 10,
  A_GROUP_WINNER: 5, A_GROUP_2ND_3RD: 6,
  B_CORRECT_RESULT: 1, B_CORRECT_SCORELINE: 6, B_CORRECT_SCORE_TEAM: 1,
  C_CORRECT_RESULT: 2, C_CORRECT_SCORELINE: 6, C_CORRECT_SCORE_TEAM: 1,
  C_TOURNAMENT_WINNER: 10,
  D_GOLDEN_BOOT: 7, D_GOLDEN_GLOVE: 7, D_PLAYER_OF_TOURNEY: 7,
  D_PLAYER_SENT_OFF: 10, D_TEAM_LOSE_PENS: 8, D_PLAYER_MISS_PEN: 10,
  D_TEAM_OF_TOURNEY: 3,
};

// ============================================================
//  GROUPS & FIXTURES
// ============================================================
const GROUPS = [
  { letter:'A', teams:['Mexico','South Korea','Czech Rep.','South Africa'] },
  { letter:'B', teams:['Canada','Qatar','Switzerland','Bosnia'] },
  { letter:'C', teams:['Haiti','Brazil','Scotland','Morocco'] },
  { letter:'D', teams:['USA','Australia','Turkey','Paraguay'] },
  { letter:'E', teams:['Ivory Coast','Germany','Ecuador','Curaçao'] },
  { letter:'F', teams:['Netherlands','Sweden','Japan','Tunisia'] },
  { letter:'G', teams:['Iran','Belgium','New Zealand','Egypt'] },
  { letter:'H', teams:['Saudi Arabia','Spain','Uruguay','Cape Verde'] },
  { letter:'I', teams:['France','Iraq','Norway','Senegal'] },
  { letter:'J', teams:['Argentina','Austria','Jordan','Algeria'] },
  { letter:'K', teams:['Portugal','Uzbekistan','Colombia','DR Congo'] },
  { letter:'L', teams:['Ghana','England','Panama','Croatia'] },
];

function groupMatchups(teams) {
  const m = [];
  for (let i = 0; i < teams.length; i++)
    for (let j = i+1; j < teams.length; j++)
      m.push([teams[i], teams[j]]);
  return m;
}

const KNOCKOUT_FIXTURES = {
  r32: [
    {no:73,home:'A: Runners Up',away:'B: Runners Up'},
    {no:74,home:'E: Winners',away:'A/B/C/D/F: Third'},
    {no:75,home:'F: Winners',away:'C: Runners Up'},
    {no:76,home:'C: Winners',away:'F: Runners Up'},
    {no:77,home:'I: Winners',away:'C/D/F/G/H: Third'},
    {no:78,home:'E: Runners Up',away:'I: Runners Up'},
    {no:79,home:'A: Winners',away:'C/E/F/H/I: Third'},
    {no:80,home:'L: Winners',away:'E/H/I/J/K: Third'},
    {no:81,home:'D: Winners',away:'B/E/F/I/J: Third'},
    {no:82,home:'G: Winners',away:'A/E/H/I/J: Third'},
    {no:83,home:'K: Runners Up',away:'L: Runners Up'},
    {no:84,home:'H: Winners',away:'J: Runners Up'},
    {no:85,home:'B: Winners',away:'E/F/G/I/J: Third'},
    {no:86,home:'J: Winners',away:'H: Runners Up'},
    {no:87,home:'K: Winners',away:'D/E/I/J/L: Third'},
    {no:88,home:'D: Runners Up',away:'G: Runners Up'},
  ],
  r16: [
    {no:89,home:'Winner 74',away:'Winner 77'},{no:90,home:'Winner 73',away:'Winner 75'},
    {no:91,home:'Winner 76',away:'Winner 78'},{no:92,home:'Winner 79',away:'Winner 80'},
    {no:93,home:'Winner 83',away:'Winner 84'},{no:94,home:'Winner 81',away:'Winner 82'},
    {no:95,home:'Winner 86',away:'Winner 88'},{no:96,home:'Winner 85',away:'Winner 87'},
  ],
  qf: [
    {no:97,home:'Winner 89',away:'Winner 90'},{no:98,home:'Winner 93',away:'Winner 94'},
    {no:99,home:'Winner 91',away:'Winner 92'},{no:100,home:'Winner 95',away:'Winner 96'},
  ],
  sf: [{no:101,home:'Winner 97',away:'Winner 98'},{no:102,home:'Winner 99',away:'Winner 100'}],
  final: [{no:104,home:'Winner 101',away:'Winner 102'}],
};

// ============================================================
//  API-FOOTBALL
// ============================================================
async function apiFootball(endpoint, params={}) {
  await ensureKeys();
  const qs = new URLSearchParams({league: CONFIG.WC_LEAGUE_ID, season: CONFIG.WC_SEASON, ...params});
  const apiUrl = `https://v3.football.api-sports.io/${endpoint}?${qs}`;
  const proxies = [
    async () => { const r = await fetch(apiUrl, {headers:{'x-apisports-key':CONFIG.API_FOOTBALL_KEY}}); if(!r.ok) throw new Error('direct'); return r.json(); },
    async () => { const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(apiUrl)}`, {headers:{'x-apisports-key':CONFIG.API_FOOTBALL_KEY}}); if(!r.ok) throw new Error('proxy1'); return r.json(); },
    async () => { const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`, {headers:{'x-apisports-key':CONFIG.API_FOOTBALL_KEY}}); if(!r.ok) throw new Error('proxy2'); return r.json(); },
  ];
  for (const p of proxies) {
    try { const d = await p(); if(d?.response !== undefined) return d.response; } catch(e) { continue; }
  }
  return null;
}

async function fetchAllFixtures() { return await apiFootball('fixtures'); }
async function fetchTopScorers() { return await apiFootball('players/topscorers'); }
async function fetchTopCards() { return await apiFootball('players/topcards'); }
async function fetchStandings() { return await apiFootball('standings'); }

// ============================================================
//  SCORING ENGINE
// ============================================================
function scoreSubmission(prediction, liveData) {
  let total = 0;
  const breakdown = {A:0, B:0, C:0, D:0};
  const detail = [];
  const {fixtures, standings, topScorers, topCards} = liveData;

  function findFixture(t1, t2) {
    return fixtures?.find(f => {
      const h = f.teams.home.name.toLowerCase(), a = f.teams.away.name.toLowerCase();
      const s1 = t1.toLowerCase(), s2 = t2.toLowerCase();
      return (h.includes(s1)||s1.includes(h)) && (a.includes(s2)||s2.includes(a)) ||
             (h.includes(s2)||s2.includes(h)) && (a.includes(s1)||s1.includes(a));
    });
  }

  GROUPS.forEach(g => {
    groupMatchups(g.teams).forEach(([t1,t2], mi) => {
      const ph = prediction[`g${g.letter}_m${mi}_h`], pa = prediction[`g${g.letter}_m${mi}_a`];
      if (ph === undefined || pa === undefined) return;
      const fix = findFixture(t1, t2);
      if (!fix || fix.fixture.status.short !== 'FT') return;
      const ah = fix.goals.home, aa = fix.goals.away;
      let pts = 0;
      if (+ph===ah && +pa===aa) {
        pts += POINTS.A_CORRECT_SCORELINE;
        detail.push({label:`Scoreline ${t1} ${ph}-${pa} ${t2}`, pts:POINTS.A_CORRECT_SCORELINE, section:'A'});
      } else {
        const pr = +ph>+pa?'H':+ph<+pa?'A':'D', ar = ah>aa?'H':ah<aa?'A':'D';
        if (pr===ar) { pts+=POINTS.A_CORRECT_RESULT; detail.push({label:`Result ${t1} vs ${t2}`,pts:1,section:'A'}); }
        if (+ph===ah||+pa===aa) { pts+=POINTS.A_CORRECT_SCORE_TEAM; detail.push({label:`Score team ${t1} vs ${t2}`,pts:1,section:'A'}); }
      }
      breakdown.A+=pts; total+=pts;
    });
    const ts = prediction[`g${g.letter}_topscorer`];
    if (ts && topScorers?.[0]?.player.name.toLowerCase().includes(ts.toLowerCase())) {
      breakdown.A+=POINTS.A_TOP_SCORER; total+=POINTS.A_TOP_SCORER;
      detail.push({label:`Top scorer ${ts}`,pts:POINTS.A_TOP_SCORER,section:'A'});
    }
    const carded = prediction[`g${g.letter}_carded`];
    if (carded && topCards?.find(p=>p.player.name.toLowerCase().includes(carded.toLowerCase()))) {
      breakdown.A+=POINTS.A_PLAYER_CARDED; total+=POINTS.A_PLAYER_CARDED;
      detail.push({label:`Carded ${carded}`,pts:POINTS.A_PLAYER_CARDED,section:'A'});
    }
    const og = prediction[`g${g.letter}_og`];
    if (og && fixtures?.some(f=>f.events?.some(e=>e.type==='Goal'&&e.detail==='Own Goal'&&e.player.name.toLowerCase().includes(og.toLowerCase())))) {
      breakdown.A+=POINTS.A_OWN_GOAL; total+=POINTS.A_OWN_GOAL;
      detail.push({label:`OG ${og}`,pts:POINTS.A_OWN_GOAL,section:'A'});
    }
    const gw = prediction[`g${g.letter}_winner`];
    if (gw && standings) {
      const gs = standings.find(s=>s[0]?.group===`Group ${g.letter}`);
      if (gs?.[0]?.team.name.toLowerCase().includes(gw.toLowerCase())) {
        breakdown.A+=POINTS.A_GROUP_WINNER; total+=POINTS.A_GROUP_WINNER;
        detail.push({label:`Grp ${g.letter} winner ${gw}`,pts:POINTS.A_GROUP_WINNER,section:'A'});
      }
    }
    ['2nd','3rd'].forEach((place,pi) => {
      const pt = prediction[`g${g.letter}_${place}`];
      if (pt && standings) {
        const gs = standings.find(s=>s[0]?.group===`Group ${g.letter}`);
        if (gs?.[pi+1]?.team.name.toLowerCase().includes(pt.toLowerCase())) {
          breakdown.A+=POINTS.A_GROUP_2ND_3RD; total+=POINTS.A_GROUP_2ND_3RD;
          detail.push({label:`Grp ${g.letter} ${place} ${pt}`,pts:POINTS.A_GROUP_2ND_3RD,section:'A'});
        }
      }
    });
  });

  [...KNOCKOUT_FIXTURES.r32,...KNOCKOUT_FIXTURES.r16].forEach(f => {
    const ph=prediction[`ko${f.no}_h`], pa=prediction[`ko${f.no}_a`];
    if (!ph||!pa) return;
    const fix=findFixture(f.home,f.away);
    if (!fix||fix.fixture.status.short!=='FT') return;
    const ah=fix.goals.home,aa=fix.goals.away;
    let pts=0;
    if (+ph===ah&&+pa===aa){pts+=POINTS.B_CORRECT_SCORELINE;detail.push({label:`Scoreline game ${f.no}`,pts:POINTS.B_CORRECT_SCORELINE,section:'B'});}
    else{const pr=+ph>+pa?'H':+ph<+pa?'A':'D',ar=ah>aa?'H':ah<aa?'A':'D';if(pr===ar){pts+=POINTS.B_CORRECT_RESULT;detail.push({label:`Result game ${f.no}`,pts:1,section:'B'});}}
    breakdown.B+=pts;total+=pts;
  });

  [...KNOCKOUT_FIXTURES.qf,...KNOCKOUT_FIXTURES.sf,...KNOCKOUT_FIXTURES.final].forEach(f => {
    const ph=prediction[`ko${f.no}_h`],pa=prediction[`ko${f.no}_a`];
    if (!ph||!pa) return;
    const fix=findFixture(f.home,f.away);
    if (!fix||fix.fixture.status.short!=='FT') return;
    const ah=fix.goals.home,aa=fix.goals.away;
    let pts=0;
    if (+ph===ah&&+pa===aa){pts+=POINTS.C_CORRECT_SCORELINE;detail.push({label:`Scoreline game ${f.no}`,pts:POINTS.C_CORRECT_SCORELINE,section:'C'});}
    else{const pr=+ph>+pa?'H':+ph<+pa?'A':'D',ar=ah>aa?'H':ah<aa?'A':'D';if(pr===ar){pts+=POINTS.C_CORRECT_RESULT;detail.push({label:`Result game ${f.no}`,pts:2,section:'C'});}}
    breakdown.C+=pts;total+=pts;
  });

  if (prediction.tournament_winner && fixtures) {
    const fin=fixtures.find(f=>f.fixture.status.short==='FT'&&f.league.round==='Final');
    if (fin) {
      const w=fin.goals.home>fin.goals.away?fin.teams.home.name:fin.teams.away.name;
      if (w.toLowerCase().includes(prediction.tournament_winner.toLowerCase())) {
        breakdown.C+=POINTS.C_TOURNAMENT_WINNER;total+=POINTS.C_TOURNAMENT_WINNER;
        detail.push({label:`Tournament winner ${prediction.tournament_winner}`,pts:POINTS.C_TOURNAMENT_WINNER,section:'C'});
      }
    }
  }

  if (prediction.player_sent_off&&fixtures?.some(f=>f.events?.some(e=>e.type==='Card'&&e.detail==='Red Card'&&e.player.name.toLowerCase().includes(prediction.player_sent_off.toLowerCase())))) {
    breakdown.D+=POINTS.D_PLAYER_SENT_OFF;total+=POINTS.D_PLAYER_SENT_OFF;
    detail.push({label:`Sent off ${prediction.player_sent_off}`,pts:POINTS.D_PLAYER_SENT_OFF,section:'D'});
  }
  if (prediction.player_miss_pen&&fixtures?.some(f=>f.events?.some(e=>e.detail==='Missed Penalty'&&e.player.name.toLowerCase().includes(prediction.player_miss_pen.toLowerCase())))) {
    breakdown.D+=POINTS.D_PLAYER_MISS_PEN;total+=POINTS.D_PLAYER_MISS_PEN;
    detail.push({label:`Missed pen ${prediction.player_miss_pen}`,pts:POINTS.D_PLAYER_MISS_PEN,section:'D'});
  }

  return {total, breakdown, detail};
}

// ============================================================
//  USER MANAGEMENT
// ============================================================
async function getUser(email) {
  const db = await binGet();
  return db?.users?.[email.toLowerCase()] || null;
}

async function saveUser(email, userData) {
  const db = await binGet() || { groups: {}, users: {} };
  if (!db.users) db.users = {};
  db.users[email.toLowerCase()] = userData;
  return await binPut(db);
}

async function registerUser(email, password, name) {
  const db = await binGet() || { groups: {}, users: {} };
  if (!db.users) db.users = {};
  const key = email.toLowerCase();
  if (db.users[key]) return { success: false, error: 'Email already registered' };
  db.users[key] = { name, email: key, password, groups: [], adminOf: [], createdAt: new Date().toISOString() };
  const ok = await binPut(db);
  return { success: ok, user: db.users[key] };
}

async function loginUser(email, password) {
  const user = await getUser(email);
  if (!user) return { success: false, error: 'Email not found' };
  if (user.password !== password) return { success: false, error: 'Incorrect password' };
  return { success: true, user };
}

async function addUserToGroup(email, groupCode, isAdmin=false) {
  const db = await binGet();
  if (!db) return false;
  const key = email.toLowerCase();
  if (!db.users?.[key]) return false;
  if (!db.users[key].groups) db.users[key].groups = [];
  if (!db.users[key].adminOf) db.users[key].adminOf = [];
  if (!db.users[key].groups.includes(groupCode)) db.users[key].groups.push(groupCode);
  if (isAdmin && !db.users[key].adminOf.includes(groupCode)) db.users[key].adminOf.push(groupCode);
  return await binPut(db);
}

// Simple session storage (survives page navigation, clears on browser close)
const SESSION = {
  set(user) { sessionStorage.setItem('wc_user', JSON.stringify(user)); },
  get() { try { return JSON.parse(sessionStorage.getItem('wc_user')); } catch { return null; } },
  clear() { sessionStorage.removeItem('wc_user'); },
};

// Lock/unlock group submissions
async function setGroupLocked(code, locked) {
  const db = await binGet();
  if (!db?.groups?.[code]) return false;
  db.groups[code].locked = locked;
  return await binPut(db);
}

async function isGroupLocked(code) {
  const group = await getGroup(code);
  return group?.locked === true;
}

// Shared toast
function showToast(msg, error=false) {
  let t = document.getElementById('toast');
  if (!t) { t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast show' + (error?' error':'');
  if (!error) setTimeout(()=>t.classList.remove('show'), 3500);
}
