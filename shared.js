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
//  LIVE DATA — OPENFOOTBALL (FREE, NO KEY)
// ============================================================
const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

let _liveCache = null;
let _liveCacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchOpenfootball() {
  const now = Date.now();
  if (_liveCache && (now - _liveCacheTime) < CACHE_TTL) {
    return _liveCache;
  }
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(OPENFOOTBALL_URL)}`);
    if (!r.ok) throw new Error('corsproxy failed');
    const data = await r.json();
    _liveCache = data.matches || [];
    _liveCacheTime = now;
    console.log(`Openfootball loaded ✓ (${_liveCache.length} matches, ${_liveCache.filter(m=>m.score).length} completed)`);
    return _liveCache;
  } catch(e) {
    // Fallback: try direct
    try {
      const r2 = await fetch(OPENFOOTBALL_URL);
      if (!r2.ok) throw new Error('direct failed');
      const data = await r2.json();
      _liveCache = data.matches || [];
      _liveCacheTime = now;
      console.log(`Openfootball loaded direct ✓`);
      return _liveCache;
    } catch(e2) {
      console.warn('Openfootball fetch failed:', e2.message);
      return _liveCache || []; // return stale cache if available
    }
  }
}

// Normalise team names between openfootball and our GROUPS data
function teamsMatch(ofName, ourName) {
  if (!ofName || !ourName) return false;
  const normalise = s => s.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\./g, '')
    .replace('czech republic', 'czech rep')
    .replace('czechia', 'czech rep')
    .replace('bosnia & herzegovina', 'bosnia')
    .replace('bosnia and herzegovina', 'bosnia')
    .replace("côte d'ivoire", 'ivory coast')
    .replace('cote divoire', 'ivory coast')
    .replace('dr congo', 'dr congo')
    .replace('democratic republic of congo', 'dr congo')
    .replace('cape verde', 'cape verde')
    .replace('new zealand', 'new zealand')
    .replace(/\s+/g, ' ').trim();
  const a = normalise(ofName), b = normalise(ourName);
  return a === b || a.includes(b) || b.includes(a);
}

// Build computed group standings from openfootball matches
function computeStandings(matches) {
  const standings = {};
  GROUPS.forEach(g => {
    standings[`Group ${g.letter}`] = {};
    g.teams.forEach(t => {
      standings[`Group ${g.letter}`][t] = { team: t, played:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
    });
  });

  matches.filter(m => m.group && m.score).forEach(m => {
    const [h, a] = m.score.ft;
    const grp = m.group; // e.g. "Group A"
    const grpTable = standings[grp];
    if (!grpTable) return;

    // Find matching team entries
    let homeEntry = null, awayEntry = null;
    Object.values(grpTable).forEach(entry => {
      if (teamsMatch(m.team1, entry.team)) homeEntry = entry;
      if (teamsMatch(m.team2, entry.team)) awayEntry = entry;
    });
    if (!homeEntry || !awayEntry) return;

    homeEntry.played++; awayEntry.played++;
    homeEntry.gf += h; homeEntry.ga += a;
    awayEntry.gf += a; awayEntry.ga += h;
    homeEntry.gd = homeEntry.gf - homeEntry.ga;
    awayEntry.gd = awayEntry.gf - awayEntry.ga;

    if (h > a)      { homeEntry.w++; homeEntry.pts+=3; awayEntry.l++; }
    else if (h < a) { awayEntry.w++; awayEntry.pts+=3; homeEntry.l++; }
    else            { homeEntry.d++; homeEntry.pts++; awayEntry.d++; awayEntry.pts++; }
  });

  // Sort each group: pts desc, gd desc, gf desc
  const sorted = {};
  Object.entries(standings).forEach(([grp, table]) => {
    sorted[grp] = Object.values(table).sort((a,b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
    );
  });
  return sorted;
}

// Build top scorers list from openfootball matches
function computeTopScorers(matches) {
  const scorers = {};
  matches.filter(m => m.score).forEach(m => {
    [...(m.goals1||[]), ...(m.goals2||[])].forEach(g => {
      if (!g.name) return;
      // skip own goals (marked with 'og' in some datasets)
      if (g.name.toLowerCase().includes('own goal') || g.type === 'own goal') return;
      if (!scorers[g.name]) scorers[g.name] = { name: g.name, goals: 0 };
      scorers[g.name].goals++;
    });
  });
  return Object.values(scorers).sort((a,b) => b.goals - a.goals);
}

// Get manual overrides saved in JSONBin by super admin
async function getManualOverrides() {
  const db = await binGet();
  return db?.manualOverrides || {};
}

// Save manual overrides (super admin only)
async function saveManualOverrides(overrides) {
  const db = await binGet() || { groups: {}, users: {} };
  db.manualOverrides = overrides;
  return await binPut(db);
}

// Master live data fetch — combines openfootball + manual overrides
async function fetchLiveData() {
  const [matches, overrides] = await Promise.all([
    fetchOpenfootball(),
    getManualOverrides(),
  ]);

  const standings = computeStandings(matches);
  const topScorers = computeTopScorers(matches);

  return {
    matches,           // all 104 matches from openfootball
    standings,         // computed from results
    topScorers,        // computed from goals
    overrides,         // manual: redCards, ownGoals, missedPens, goldenBoot, goldenGlove, etc.
  };
}

// ============================================================
//  SCORING ENGINE
// ============================================================
function scoreSubmission(prediction, liveData) {
  let total = 0;
  const breakdown = {A:0, B:0, C:0, D:0};
  const detail = [];
  const { matches, standings, topScorers, overrides } = liveData;

  // Find a completed group match between two teams
  function findGroupMatch(t1, t2) {
    return matches.find(m =>
      m.group && m.score && (
        (teamsMatch(m.team1, t1) && teamsMatch(m.team2, t2)) ||
        (teamsMatch(m.team1, t2) && teamsMatch(m.team2, t1))
      )
    );
  }

  // Find a completed knockout match by fixture number
  function findKnockoutMatch(num) {
    return matches.find(m => m.num === num && m.score);
  }

  // Helper: get score from perspective of t1/t2 order
  function getScore(match, t1) {
    // Returns [homeGoals, awayGoals] relative to how WE ordered the match
    const [ft1, ft2] = match.score.ft;
    const homeIsT1 = teamsMatch(match.team1, t1);
    return homeIsT1 ? [ft1, ft2] : [ft2, ft1];
  }

  // ---- SECTION A: Group Stage ----
  GROUPS.forEach(g => {
    groupMatchups(g.teams).forEach(([t1, t2], mi) => {
      const ph = prediction[`g${g.letter}_m${mi}_h`];
      const pa = prediction[`g${g.letter}_m${mi}_a`];
      if (ph === undefined || pa === undefined) return;
      const match = findGroupMatch(t1, t2);
      if (!match) return;

      const [ah, aa] = getScore(match, t1);
      let pts = 0;

      if (+ph === ah && +pa === aa) {
        pts += POINTS.A_CORRECT_SCORELINE;
        detail.push({ label: `Scoreline ${t1} ${ph}-${pa} ${t2}`, pts: POINTS.A_CORRECT_SCORELINE, section: 'A' });
      } else {
        const pr = +ph > +pa ? 'H' : +ph < +pa ? 'A' : 'D';
        const ar = ah > aa ? 'H' : ah < aa ? 'A' : 'D';
        if (pr === ar) {
          pts += POINTS.A_CORRECT_RESULT;
          detail.push({ label: `Result ${t1} vs ${t2}`, pts: POINTS.A_CORRECT_RESULT, section: 'A' });
        }
        if (+ph === ah || +pa === aa) {
          pts += POINTS.A_CORRECT_SCORE_TEAM;
          detail.push({ label: `Score (one team) ${t1} vs ${t2}`, pts: POINTS.A_CORRECT_SCORE_TEAM, section: 'A' });
        }
      }
      breakdown.A += pts; total += pts;
    });

    // Group winner / 2nd / 3rd
    const grpStandings = standings[`Group ${g.letter}`];
    if (grpStandings) {
      const gw = prediction[`g${g.letter}_winner`];
      if (gw && teamsMatch(grpStandings[0]?.team, gw)) {
        breakdown.A += POINTS.A_GROUP_WINNER; total += POINTS.A_GROUP_WINNER;
        detail.push({ label: `Group ${g.letter} winner: ${gw}`, pts: POINTS.A_GROUP_WINNER, section: 'A' });
      }
      ['2nd','3rd'].forEach((place, pi) => {
        const pt = prediction[`g${g.letter}_${place}`];
        if (pt && teamsMatch(grpStandings[pi+1]?.team, pt)) {
          breakdown.A += POINTS.A_GROUP_2ND_3RD; total += POINTS.A_GROUP_2ND_3RD;
          detail.push({ label: `Group ${g.letter} ${place}: ${pt}`, pts: POINTS.A_GROUP_2ND_3RD, section: 'A' });
        }
      });
    }

    // Group top scorer (manual override)
    const ts = prediction[`g${g.letter}_topscorer`];
    const overrideTs = overrides?.groupTopScorers?.[g.letter];
    if (ts && overrideTs && overrideTs.toLowerCase().includes(ts.toLowerCase())) {
      breakdown.A += POINTS.A_TOP_SCORER; total += POINTS.A_TOP_SCORER;
      detail.push({ label: `Top scorer Grp ${g.letter}: ${ts}`, pts: POINTS.A_TOP_SCORER, section: 'A' });
    }

    // Player carded (manual override)
    const carded = prediction[`g${g.letter}_carded`];
    const overrideCards = overrides?.yellowCards || [];
    if (carded && overrideCards.some(p => p.toLowerCase().includes(carded.toLowerCase()))) {
      breakdown.A += POINTS.A_PLAYER_CARDED; total += POINTS.A_PLAYER_CARDED;
      detail.push({ label: `Carded ${carded}`, pts: POINTS.A_PLAYER_CARDED, section: 'A' });
    }

    // Own goal (manual override)
    const og = prediction[`g${g.letter}_og`];
    const overrideOGs = overrides?.ownGoals || [];
    if (og && overrideOGs.some(p => p.toLowerCase().includes(og.toLowerCase()))) {
      breakdown.A += POINTS.A_OWN_GOAL; total += POINTS.A_OWN_GOAL;
      detail.push({ label: `Own goal: ${og}`, pts: POINTS.A_OWN_GOAL, section: 'A' });
    }
  });

  // ---- SECTION B: Round of 32 + Round of 16 ----
  [...KNOCKOUT_FIXTURES.r32, ...KNOCKOUT_FIXTURES.r16].forEach(f => {
    const ph = prediction[`ko${f.no}_h`];
    const pa = prediction[`ko${f.no}_a`];
    if (!ph || !pa) return;
    const match = findKnockoutMatch(f.no);
    if (!match) return;
    const [ah, aa] = match.score.ft;
    let pts = 0;
    if (+ph === ah && +pa === aa) {
      pts += POINTS.B_CORRECT_SCORELINE;
      detail.push({ label: `Scoreline game ${f.no}`, pts: POINTS.B_CORRECT_SCORELINE, section: 'B' });
    } else {
      const pr = +ph > +pa ? 'H' : +ph < +pa ? 'A' : 'D';
      const ar = ah > aa ? 'H' : ah < aa ? 'A' : 'D';
      if (pr === ar) {
        pts += POINTS.B_CORRECT_RESULT;
        detail.push({ label: `Result game ${f.no}`, pts: POINTS.B_CORRECT_RESULT, section: 'B' });
      }
    }
    breakdown.B += pts; total += pts;
  });

  // ---- SECTION C: QF / SF / Final ----
  [...KNOCKOUT_FIXTURES.qf, ...KNOCKOUT_FIXTURES.sf, ...KNOCKOUT_FIXTURES.final].forEach(f => {
    const ph = prediction[`ko${f.no}_h`];
    const pa = prediction[`ko${f.no}_a`];
    if (!ph || !pa) return;
    const match = findKnockoutMatch(f.no);
    if (!match) return;
    const [ah, aa] = match.score.ft;
    let pts = 0;
    if (+ph === ah && +pa === aa) {
      pts += POINTS.C_CORRECT_SCORELINE;
      detail.push({ label: `Scoreline game ${f.no}`, pts: POINTS.C_CORRECT_SCORELINE, section: 'C' });
    } else {
      const pr = +ph > +pa ? 'H' : +ph < +pa ? 'A' : 'D';
      const ar = ah > aa ? 'H' : ah < aa ? 'A' : 'D';
      if (pr === ar) {
        pts += POINTS.C_CORRECT_RESULT;
        detail.push({ label: `Result game ${f.no}`, pts: POINTS.C_CORRECT_RESULT, section: 'C' });
      }
    }
    breakdown.C += pts; total += pts;
  });

  // Tournament winner (from final match or manual override)
  if (prediction.tournament_winner) {
    const winner = overrides?.tournamentWinner ||
      (() => {
        const fin = matches.find(m => m.round === 'Final' && m.score);
        if (!fin) return null;
        const [h, a] = fin.score.ft;
        return h > a ? fin.team1 : fin.team2;
      })();
    if (winner && teamsMatch(winner, prediction.tournament_winner)) {
      breakdown.C += POINTS.C_TOURNAMENT_WINNER; total += POINTS.C_TOURNAMENT_WINNER;
      detail.push({ label: `Tournament winner: ${prediction.tournament_winner}`, pts: POINTS.C_TOURNAMENT_WINNER, section: 'C' });
    }
  }

  // ---- SECTION D: Manual overrides only ----
  // Golden Boot
  if (prediction.golden_boot && overrides?.goldenBoot &&
      overrides.goldenBoot.toLowerCase().includes(prediction.golden_boot.toLowerCase())) {
    breakdown.D += POINTS.D_GOLDEN_BOOT; total += POINTS.D_GOLDEN_BOOT;
    detail.push({ label: `Golden Boot: ${prediction.golden_boot}`, pts: POINTS.D_GOLDEN_BOOT, section: 'D' });
  }
  // Golden Glove
  if (prediction.golden_glove && overrides?.goldenGlove &&
      overrides.goldenGlove.toLowerCase().includes(prediction.golden_glove.toLowerCase())) {
    breakdown.D += POINTS.D_GOLDEN_GLOVE; total += POINTS.D_GOLDEN_GLOVE;
    detail.push({ label: `Golden Glove: ${prediction.golden_glove}`, pts: POINTS.D_GOLDEN_GLOVE, section: 'D' });
  }
  // Player of Tournament
  if (prediction.player_of_tournament && overrides?.playerOfTournament &&
      overrides.playerOfTournament.toLowerCase().includes(prediction.player_of_tournament.toLowerCase())) {
    breakdown.D += POINTS.D_PLAYER_OF_TOURNEY; total += POINTS.D_PLAYER_OF_TOURNEY;
    detail.push({ label: `Player of Tourney: ${prediction.player_of_tournament}`, pts: POINTS.D_PLAYER_OF_TOURNEY, section: 'D' });
  }
  // Player sent off
  const redCards = overrides?.redCards || [];
  if (prediction.player_sent_off && redCards.some(p => p.toLowerCase().includes(prediction.player_sent_off.toLowerCase()))) {
    breakdown.D += POINTS.D_PLAYER_SENT_OFF; total += POINTS.D_PLAYER_SENT_OFF;
    detail.push({ label: `Sent off: ${prediction.player_sent_off}`, pts: POINTS.D_PLAYER_SENT_OFF, section: 'D' });
  }
  // Player missed penalty
  const missedPens = overrides?.missedPenalties || [];
  if (prediction.player_miss_pen && missedPens.some(p => p.toLowerCase().includes(prediction.player_miss_pen.toLowerCase()))) {
    breakdown.D += POINTS.D_PLAYER_MISS_PEN; total += POINTS.D_PLAYER_MISS_PEN;
    detail.push({ label: `Missed pen: ${prediction.player_miss_pen}`, pts: POINTS.D_PLAYER_MISS_PEN, section: 'D' });
  }
  // Team lose on penalties
  const penLosers = overrides?.penaltyShootoutLosers || [];
  if (prediction.team_lose_pens && penLosers.some(t => t.toLowerCase().includes(prediction.team_lose_pens.toLowerCase()))) {
    breakdown.D += POINTS.D_TEAM_LOSE_PENS; total += POINTS.D_TEAM_LOSE_PENS;
    detail.push({ label: `Pen shootout loss: ${prediction.team_lose_pens}`, pts: POINTS.D_TEAM_LOSE_PENS, section: 'D' });
  }

  return { total, breakdown, detail };
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

// Session storage using localStorage (persists across tabs and page loads)
const SESSION = {
  set(user) { try { localStorage.setItem('wc_user', JSON.stringify(user)); } catch(e) {} },
  get() { try { return JSON.parse(localStorage.getItem('wc_user')); } catch { return null; } },
  clear() { try { localStorage.removeItem('wc_user'); } catch(e) {} },
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
