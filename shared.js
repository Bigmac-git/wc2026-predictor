// ============================================================
//  WORLD CUP 2026 PREDICTOR — SHARED CONFIG & UTILITIES
//  Fill in your details below before deploying
// ============================================================

const CONFIG = {
  // --- GitHub ---
  GITHUB_USERNAME:   'Bigmac-git',
  GITHUB_REPO:       'wc2026-predictor',
  GITHUB_TOKEN:      '',                          // Leave blank — enter via Admin panel
  SUBMISSIONS_PATH:  'submissions',               // folder in repo for player JSONs
  RESULTS_PATH:      'results.json',              // file in repo for live override results

  // --- API-Football (api-football.com) ---
  API_FOOTBALL_KEY:  'YOUR_API_FOOTBALL_KEY',
  WC_LEAGUE_ID:      1,                           // FIFA World Cup
  WC_SEASON:         2026,

  // --- Admin ---
  ADMIN_PASSWORD:    'wc2026admin',               // change this!
};

// ============================================================
//  AUTO-LOAD KEYS FROM SECRET GIST (runs immediately)
// ============================================================
const GIST_ID = 'ab198939037b472c9892104e0aff6674';

(async function loadKeysFromGist() {
  try {
    const r = await fetch(`https://api.github.com/gists/${GIST_ID}`);
    if (!r.ok) { console.warn('Gist fetch failed:', r.status); return; }
    const data = await r.json();
    const file = data.files['wc2026-keys.json'];
    if (!file) { console.warn('wc2026-keys.json not found in Gist'); return; }
    const keys = JSON.parse(file.content);
    if (keys.GITHUB_TOKEN)     CONFIG.GITHUB_TOKEN     = keys.GITHUB_TOKEN;
    if (keys.API_FOOTBALL_KEY) CONFIG.API_FOOTBALL_KEY = keys.API_FOOTBALL_KEY;
    CONFIG.GITHUB_USERNAME = 'Bigmac-git';
    CONFIG.GITHUB_REPO     = 'wc2026-predictor';
    console.log('Keys loaded from Gist ✓');
  } catch(e) {
    console.warn('Could not load keys from Gist:', e.message);
  }
})();

// ============================================================
//  POINTS SYSTEM
// ============================================================
const POINTS = {
  // Section A
  A_CORRECT_RESULT:    1,
  A_CORRECT_SCORELINE: 6,
  A_CORRECT_SCORE_TEAM:1,
  A_TOP_SCORER:        7,
  A_PLAYER_CARDED:     5,
  A_OWN_GOAL:         10,
  A_GROUP_WINNER:      5,
  A_GROUP_2ND_3RD:     6,   // per team, in order
  // Section B (R32 + R16)
  B_CORRECT_RESULT:    1,
  B_CORRECT_SCORELINE: 6,
  B_CORRECT_SCORE_TEAM:1,
  // Section C (QF → Final)
  C_CORRECT_RESULT:    2,
  C_CORRECT_SCORELINE: 6,
  C_CORRECT_SCORE_TEAM:1,
  C_TOURNAMENT_WINNER:10,
  // Section D
  D_GOLDEN_BOOT:       7,
  D_GOLDEN_GLOVE:      7,
  D_PLAYER_OF_TOURNEY: 7,
  D_PLAYER_SENT_OFF:  10,
  D_TEAM_LOSE_PENS:    8,
  D_PLAYER_MISS_PEN:  10,
  D_TEAM_OF_TOURNEY:   3,  // per correct player
};

// ============================================================
//  ALL 12 GROUPS & MATCH FIXTURES
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

// Each group has 6 matches: all combinations
function groupMatchups(teams) {
  const m = [];
  for (let i = 0; i < teams.length; i++)
    for (let j = i+1; j < teams.length; j++)
      m.push([teams[i], teams[j]]);
  return m;
}

// Knockout fixture labels (game numbers 73–104)
const KNOCKOUT_FIXTURES = {
  r32: [
    {no:73, home:'A: Runners Up',        away:'B: Runners Up'},
    {no:74, home:'E: Winners',           away:'A/B/C/D/F: Third'},
    {no:75, home:'F: Winners',           away:'C: Runners Up'},
    {no:76, home:'C: Winners',           away:'F: Runners Up'},
    {no:77, home:'I: Winners',           away:'C/D/F/G/H: Third'},
    {no:78, home:'E: Runners Up',        away:'I: Runners Up'},
    {no:79, home:'A: Winners',           away:'C/E/F/H/I: Third'},
    {no:80, home:'L: Winners',           away:'E/H/I/J/K: Third'},
    {no:81, home:'D: Winners',           away:'B/E/F/I/J: Third'},
    {no:82, home:'G: Winners',           away:'A/E/H/I/J: Third'},
    {no:83, home:'K: Runners Up',        away:'L: Runners Up'},
    {no:84, home:'H: Winners',           away:'J: Runners Up'},
    {no:85, home:'B: Winners',           away:'E/F/G/I/J: Third'},
    {no:86, home:'J: Winners',           away:'H: Runners Up'},
    {no:87, home:'K: Winners',           away:'D/E/I/J/L: Third'},
    {no:88, home:'D: Runners Up',        away:'G: Runners Up'},
  ],
  r16: [
    {no:89, home:'Winner 74', away:'Winner 77'},
    {no:90, home:'Winner 73', away:'Winner 75'},
    {no:91, home:'Winner 76', away:'Winner 78'},
    {no:92, home:'Winner 79', away:'Winner 80'},
    {no:93, home:'Winner 83', away:'Winner 84'},
    {no:94, home:'Winner 81', away:'Winner 82'},
    {no:95, home:'Winner 86', away:'Winner 88'},
    {no:96, home:'Winner 85', away:'Winner 87'},
  ],
  qf: [
    {no:97,  home:'Winner 89', away:'Winner 90'},
    {no:98,  home:'Winner 93', away:'Winner 94'},
    {no:99,  home:'Winner 91', away:'Winner 92'},
    {no:100, home:'Winner 95', away:'Winner 96'},
  ],
  sf: [
    {no:101, home:'Winner 97',  away:'Winner 98'},
    {no:102, home:'Winner 99',  away:'Winner 100'},
  ],
  final: [
    {no:104, home:'Winner 101', away:'Winner 102'},
  ],
};

// ============================================================
//  GITHUB HELPERS
// ============================================================
async function ghGet(path) {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}/contents/${path}`;
  const r = await fetch(url, { headers: { Authorization: `token ${CONFIG.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }});
  if (!r.ok) return null;
  const data = await r.json();
  return { content: JSON.parse(atob(data.content.replace(/\n/g,''))), sha: data.sha };
}

async function ghPut(path, content, sha, message) {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}/contents/${path}`;
  const body = { message, content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))), ...(sha ? {sha} : {}) };
  const r = await fetch(url, { method:'PUT', headers:{ Authorization:`token ${CONFIG.GITHUB_TOKEN}`, Accept:'application/vnd.github.v3+json','Content-Type':'application/json'}, body: JSON.stringify(body)});
  return r.ok;
}

async function ghList(folder) {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}/contents/${folder}`;
  const r = await fetch(url, { headers:{ Authorization:`token ${CONFIG.GITHUB_TOKEN}`, Accept:'application/vnd.github.v3+json'}});
  if (!r.ok) return [];
  return await r.json();
}

// ============================================================
//  API-FOOTBALL HELPERS
// ============================================================
async function apiFootball(endpoint, params={}) {
  const qs = new URLSearchParams({league: CONFIG.WC_LEAGUE_ID, season: CONFIG.WC_SEASON, ...params});
  const apiUrl = `https://v3.football.api-sports.io/${endpoint}?${qs}`;
  const proxies = [
    async () => {
      const r = await fetch(apiUrl, { headers: { 'x-apisports-key': CONFIG.API_FOOTBALL_KEY } });
      if (!r.ok) throw new Error('direct failed');
      return await r.json();
    },
    async () => {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(apiUrl)}`, {
        headers: { 'x-apisports-key': CONFIG.API_FOOTBALL_KEY }
      });
      if (!r.ok) throw new Error('corsproxy failed');
      return await r.json();
    },
    async () => {
      const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`, {
        headers: { 'x-apisports-key': CONFIG.API_FOOTBALL_KEY }
      });
      if (!r.ok) throw new Error('allorigins failed');
      return await r.json();
    },
    async () => {
      const r = await fetch(`https://thingproxy.freeboard.io/fetch/${apiUrl}`, {
        headers: { 'x-apisports-key': CONFIG.API_FOOTBALL_KEY }
      });
      if (!r.ok) throw new Error('thingproxy failed');
      return await r.json();
    },
  ];
  for (const proxy of proxies) {
    try {
      const d = await proxy();
      if (d && d.response !== undefined) return d.response;
    } catch(e) { continue; }
  }
  console.warn('All API proxies failed for:', endpoint);
  return null;
}

// Fetch all fixtures with events
async function fetchAllFixtures() {
  return await apiFootball('fixtures', {});
}

// Fetch top scorers
async function fetchTopScorers() {
  return await apiFootball('players/topscorers', {});
}

// Fetch top cards
async function fetchTopCards() {
  return await apiFootball('players/topcards', {});
}

// Fetch standings (groups)
async function fetchStandings() {
  return await apiFootball('standings', {});
}

// ============================================================
//  SCORING ENGINE
// ============================================================
function scoreSubmission(prediction, liveData) {
  let total = 0;
  const breakdown = { A: 0, B: 0, C: 0, D: 0 };
  const detail = [];

  const { fixtures, standings, topScorers, topCards } = liveData;

  // Helper: find a finished fixture by teams
  function findFixture(team1, team2) {
    return fixtures?.find(f => {
      const h = f.teams.home.name.toLowerCase();
      const a = f.teams.away.name.toLowerCase();
      const t1 = team1.toLowerCase();
      const t2 = team2.toLowerCase();
      return (h.includes(t1)||t1.includes(h)) && (a.includes(t2)||t2.includes(a)) ||
             (h.includes(t2)||t2.includes(h)) && (a.includes(t1)||t1.includes(a));
    });
  }

  function scoreMatch(fix, predHome, predAway, predScoreHome, predScoreAway, section) {
    if (!fix || fix.fixture.status.short !== 'FT') return 0;
    const ah = fix.goals.home, aa = fix.goals.away;
    const ph = parseInt(predScoreHome), pa = parseInt(predScoreAway);
    let pts = 0;
    const multiplier = (section === 'C') ? 2 : 1;

    // Correct scoreline (both scores exact)
    if (ph === ah && pa === aa) {
      pts += (section === 'C') ? POINTS.C_CORRECT_SCORELINE : POINTS.B_CORRECT_SCORELINE;
      detail.push({ label: `Correct scoreline ${predHome} ${ph}-${pa} ${predAway}`, pts: section==='C'?POINTS.C_CORRECT_SCORELINE:POINTS.B_CORRECT_SCORELINE, section });
    } else {
      // Correct result direction
      const predResult = ph > pa ? 'H' : ph < pa ? 'A' : 'D';
      const actResult  = ah > aa ? 'H' : ah < aa ? 'A' : 'D';
      if (predResult === actResult) {
        pts += multiplier;
        detail.push({ label: `Correct result ${predHome} vs ${predAway}`, pts: multiplier, section });
      }
      // Correct score for one team
      if (ph === ah || pa === aa) {
        pts += (section === 'C') ? POINTS.C_CORRECT_SCORE_TEAM : POINTS.B_CORRECT_SCORE_TEAM;
        detail.push({ label: `Correct score (team) ${predHome} vs ${predAway}`, pts:1, section });
      }
    }
    return pts;
  }

  // --- SECTION A: Group matches ---
  GROUPS.forEach(g => {
    const matchups = groupMatchups(g.teams);
    matchups.forEach(([t1,t2], mi) => {
      const key = `g${g.letter}_m${mi}`;
      const ph = prediction[key+'_h'], pa = prediction[key+'_a'];
      if (ph === undefined || pa === undefined) return;
      const fix = findFixture(t1, t2);
      if (!fix || fix.fixture.status.short !== 'FT') return;
      const ah = fix.goals.home, aa = fix.goals.away;
      const predResult = +ph > +pa ? 'H' : +ph < +pa ? 'A' : 'D';
      const actResult  = ah > aa   ? 'H' : ah < aa   ? 'A' : 'D';
      let pts = 0;
      if (+ph === ah && +pa === aa) {
        pts += POINTS.A_CORRECT_SCORELINE;
        detail.push({ label:`Scoreline ${t1} ${ph}-${pa} ${t2}`, pts:POINTS.A_CORRECT_SCORELINE, section:'A' });
      } else {
        if (predResult === actResult) {
          pts += POINTS.A_CORRECT_RESULT;
          detail.push({ label:`Result ${t1} vs ${t2}`, pts:POINTS.A_CORRECT_RESULT, section:'A' });
        }
        if (+ph === ah || +pa === aa) {
          pts += POINTS.A_CORRECT_SCORE_TEAM;
          detail.push({ label:`Score (team) ${t1} vs ${t2}`, pts:1, section:'A' });
        }
      }
      breakdown.A += pts; total += pts;
    });

    // Top scorer
    const ts = prediction[`g${g.letter}_topscorer`];
    if (ts && topScorers) {
      const leader = topScorers[0];
      if (leader && leader.player.name.toLowerCase().includes(ts.toLowerCase())) {
        breakdown.A += POINTS.A_TOP_SCORER; total += POINTS.A_TOP_SCORER;
        detail.push({ label:`Top scorer ${ts}`, pts:POINTS.A_TOP_SCORER, section:'A' });
      }
    }

    // Player carded
    const carded = prediction[`g${g.letter}_carded`];
    if (carded && topCards) {
      const found = topCards.find(p => p.player.name.toLowerCase().includes(carded.toLowerCase()));
      if (found) {
        breakdown.A += POINTS.A_PLAYER_CARDED; total += POINTS.A_PLAYER_CARDED;
        detail.push({ label:`Player carded ${carded}`, pts:POINTS.A_PLAYER_CARDED, section:'A' });
      }
    }

    // Own goal - checked against fixture events
    const og = prediction[`g${g.letter}_og`];
    if (og && fixtures) {
      const ogFound = fixtures.some(f => f.events?.some(e => e.type === 'Goal' && e.detail === 'Own Goal' && e.player.name.toLowerCase().includes(og.toLowerCase())));
      if (ogFound) {
        breakdown.A += POINTS.A_OWN_GOAL; total += POINTS.A_OWN_GOAL;
        detail.push({ label:`Own goal ${og}`, pts:POINTS.A_OWN_GOAL, section:'A' });
      }
    }

    // Group winner
    const gWinner = prediction[`g${g.letter}_winner`];
    if (gWinner && standings) {
      const groupStandings = standings.find(s => s[0]?.group === `Group ${g.letter}`);
      if (groupStandings && groupStandings[0]?.team.name.toLowerCase().includes(gWinner.toLowerCase())) {
        breakdown.A += POINTS.A_GROUP_WINNER; total += POINTS.A_GROUP_WINNER;
        detail.push({ label:`Group ${g.letter} winner ${gWinner}`, pts:POINTS.A_GROUP_WINNER, section:'A' });
      }
    }

    // 2nd & 3rd
    ['2nd','3rd'].forEach((place, pi) => {
      const predTeam = prediction[`g${g.letter}_${place}`];
      if (predTeam && standings) {
        const groupStandings = standings.find(s => s[0]?.group === `Group ${g.letter}`);
        const actual = groupStandings?.[pi+1]?.team.name;
        if (actual && actual.toLowerCase().includes(predTeam.toLowerCase())) {
          breakdown.A += POINTS.A_GROUP_2ND_3RD; total += POINTS.A_GROUP_2ND_3RD;
          detail.push({ label:`Group ${g.letter} ${place}: ${predTeam}`, pts:POINTS.A_GROUP_2ND_3RD, section:'A' });
        }
      }
    });
  });

  // --- SECTION B: R32 + R16 ---
  [...KNOCKOUT_FIXTURES.r32, ...KNOCKOUT_FIXTURES.r16].forEach(f => {
    const key = `ko${f.no}`;
    const ph = prediction[key+'_h'], pa = prediction[key+'_a'];
    if (ph === undefined || pa === undefined) return;
    const fix = findFixture(prediction[key+'_home_team'] || f.home, prediction[key+'_away_team'] || f.away);
    const pts = scoreMatch(fix, f.home, f.away, ph, pa, 'B');
    breakdown.B += pts; total += pts;
  });

  // --- SECTION C: QF → Final ---
  [...KNOCKOUT_FIXTURES.qf, ...KNOCKOUT_FIXTURES.sf, ...KNOCKOUT_FIXTURES.final].forEach(f => {
    const key = `ko${f.no}`;
    const ph = prediction[key+'_h'], pa = prediction[key+'_a'];
    if (ph === undefined || pa === undefined) return;
    const fix = findFixture(prediction[key+'_home_team'] || f.home, prediction[key+'_away_team'] || f.away);
    const pts = scoreMatch(fix, f.home, f.away, ph, pa, 'C');
    breakdown.C += pts; total += pts;
  });

  // Tournament winner
  const predWinner = prediction.tournament_winner;
  if (predWinner && fixtures) {
    const finalFix = fixtures.find(f => f.fixture.status.short === 'FT' && f.league.round === 'Final');
    if (finalFix) {
      const winner = finalFix.goals.home > finalFix.goals.away ? finalFix.teams.home.name : finalFix.teams.away.name;
      if (winner.toLowerCase().includes(predWinner.toLowerCase())) {
        breakdown.C += POINTS.C_TOURNAMENT_WINNER; total += POINTS.C_TOURNAMENT_WINNER;
        detail.push({ label:`Tournament winner ${predWinner}`, pts:POINTS.C_TOURNAMENT_WINNER, section:'C' });
      }
    }
  }

  // --- SECTION D: Awards ---
  const dChecks = [
    ['golden_boot',    'topScorers', POINTS.D_GOLDEN_BOOT,       p => topScorers?.[0]?.player.name],
    ['golden_glove',   null,         POINTS.D_GOLDEN_GLOVE,      p => null],
    ['player_tourney', null,         POINTS.D_PLAYER_OF_TOURNEY, p => null],
  ];
  // Cards/sent off
  if (prediction.player_sent_off && fixtures) {
    const found = fixtures.some(f => f.events?.some(e => e.type === 'Card' && e.detail === 'Red Card' && e.player.name.toLowerCase().includes(prediction.player_sent_off.toLowerCase())));
    if (found) { breakdown.D += POINTS.D_PLAYER_SENT_OFF; total += POINTS.D_PLAYER_SENT_OFF; detail.push({label:`Sent off: ${prediction.player_sent_off}`, pts:POINTS.D_PLAYER_SENT_OFF, section:'D'}); }
  }
  if (prediction.player_miss_pen && fixtures) {
    const found = fixtures.some(f => f.events?.some(e => e.detail === 'Missed Penalty' && e.player.name.toLowerCase().includes(prediction.player_miss_pen.toLowerCase())));
    if (found) { breakdown.D += POINTS.D_PLAYER_MISS_PEN; total += POINTS.D_PLAYER_MISS_PEN; detail.push({label:`Missed pen: ${prediction.player_miss_pen}`, pts:POINTS.D_PLAYER_MISS_PEN, section:'D'}); }
  }

  // Team of tournament (11 players, 3 pts each)
  if (prediction.tott && Array.isArray(prediction.tott)) {
    // Can only be verified at end of tournament - skip live scoring for now
  }

  return { total, breakdown, detail };
}
