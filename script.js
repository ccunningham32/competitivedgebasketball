// SECTION: State
// Global app state now supports multiple games.
// Each game: { id, name, opponent, players, plays, logs, filters }
const state = {
  games: [],
  currentGameId: null,
};

// Positive outcome definitions
const POSITIVE_OUTCOMES = new Set([
  "Made Layup",
  "Open 2 Make",
  "Open 2 Miss",
  "Open 3 Make",
  "Open 3 Miss",
  "Foul Drawn",
]);

// SECTION: DOM Refs
const opponentInput = document.getElementById("opponent-input");
const opponentLabel = document.getElementById("opponent-label");
const totalPlaysLabel = document.getElementById("total-plays-label");

const gameSelect = document.getElementById("game-select");
const addGameBtn = document.getElementById("add-game-btn");

const playerForm = document.getElementById("player-form");
const playerNameInput = document.getElementById("player-name-input");
const playerList = document.getElementById("player-list");

const playForm = document.getElementById("play-form");
const playNameInput = document.getElementById("play-name-input");
const playList = document.getElementById("play-list");

const playInput = document.getElementById("play-input");
const playerSelect = document.getElementById("player-select");
const outcomeSelect = document.getElementById("outcome-select");
const quarterToggle = document.getElementById("quarter-toggle");
const logForm = document.getElementById("log-form");

const overallConversionEl = document.getElementById("overall-conversion");
const overallBreakdownEl = document.getElementById("overall-breakdown");

const half1ConversionEl = document.getElementById("half1-conversion");
const half2ConversionEl = document.getElementById("half2-conversion");

const q1ConversionEl = document.getElementById("q1-conversion");
const q2ConversionEl = document.getElementById("q2-conversion");
const q3ConversionEl = document.getElementById("q3-conversion");
const q4ConversionEl = document.getElementById("q4-conversion");

const filterPlaySelect = document.getElementById("filter-play");
const filterPlayerSelect = document.getElementById("filter-player");
const logTableBody = document.getElementById("log-table-body");

// Season overview DOM refs
const seasonOverallRateEl = document.getElementById("season-overall-rate");
const seasonOverallBreakdownEl = document.getElementById("season-overall-breakdown");
const seasonGamesListEl = document.getElementById("season-games-list");
const seasonTopPlaysBodyEl = document.getElementById("season-top-plays-body");

// SECTION: Helpers
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function computeHalf(quarter) {
  return quarter === 1 || quarter === 2 ? 1 : 2;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

// Calculates conversion data for a given subset of logs
function calculateConversion(logs) {
  const total = logs.length;
  if (total === 0) {
    return { total: 0, positive: 0, rate: 0 };
  }
  const positive = logs.filter((log) => log.isPositive).length;
  const rate = positive / total;
  return { total, positive, rate };
}

// Aggregates all logs across all games
function getAllSeasonLogs() {
  return state.games.flatMap((g) => g.logs || []);
}

function computePerGameStats() {
  return state.games.map((game, index) => {
    const logs = game.logs || [];
    const conv = calculateConversion(logs);
    const label = game.opponent?.trim()
      ? game.opponent.trim()
      : game.name || `Game ${index + 1}`;
    return {
      id: game.id,
      label,
      total: conv.total,
      positive: conv.positive,
      rate: conv.rate,
    };
  });
}

function computePerPlaySeasonStats() {
  const allLogs = getAllSeasonLogs();
  const byPlay = new Map();

  allLogs.forEach((log) => {
    const key = log.play || "Unknown";
    if (!byPlay.has(key)) {
      byPlay.set(key, { play: key, total: 0, positive: 0 });
    }
    const entry = byPlay.get(key);
    entry.total += 1;
    if (log.isPositive) entry.positive += 1;
  });

  const arr = Array.from(byPlay.values()).map((entry) => ({
    ...entry,
    rate: entry.total ? entry.positive / entry.total : 0,
  }));

  // Sort by conversion rate desc, then by total desc
  arr.sort((a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate;
    return b.total - a.total;
  });

  return arr;
}

// SECTION: Game helpers
function getCurrentGame() {
  return state.games.find((g) => g.id === state.currentGameId) || null;
}

function ensureGameState() {
  if (!state.games.length) {
    const defaultGame = {
      id: createId(),
      name: "Game 1",
      opponent: "",
      players: [],
      plays: [],
      logs: [],
      filters: {
        play: "all",
        player: "all",
      },
    };
    state.games.push(defaultGame);
    state.currentGameId = defaultGame.id;
  }
}

function saveState() {
  const payload = {
    games: state.games,
    currentGameId: state.currentGameId,
  };
  try {
    localStorage.setItem("playTrackerState", JSON.stringify(payload));
  } catch (e) {
    // Fail silently if storage is unavailable
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem("playTrackerState");
    if (!raw) {
      ensureGameState();
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.games) && parsed.games.length) {
      state.games = parsed.games;
      state.currentGameId = parsed.currentGameId || parsed.games[0].id;
    } else {
      ensureGameState();
    }
  } catch (e) {
    ensureGameState();
  }
}

// SECTION: Rendering
function renderGameSwitcher() {
  // Ensure there is at least one game
  ensureGameState();
  const game = getCurrentGame();

  gameSelect.innerHTML = "";
  state.games.forEach((g, index) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    const label = g.name || (g.opponent ? g.opponent : `Game ${index + 1}`);
    opt.textContent = label;
    if (g.id === state.currentGameId) {
      opt.selected = true;
    }
    gameSelect.appendChild(opt);
  });
}

function renderOpponent() {
  const game = getCurrentGame();
  if (!game || !game.opponent.trim()) {
    opponentLabel.textContent = "No opponent set";
    return;
  }
  opponentLabel.textContent = `vs ${game.opponent}`;
}

function renderRosters() {
  const game = getCurrentGame();
  if (!game) return;

  // Players pill list
  playerList.innerHTML = "";
  game.players.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    playerList.appendChild(li);
  });

  // Plays pill list
  playList.innerHTML = "";
  game.plays.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    playList.appendChild(li);
  });

  // Player select options
  const currentPlayerValue = playerSelect.value;
  playerSelect.innerHTML = "";
  const defaultPlayerOpt = document.createElement("option");
  defaultPlayerOpt.value = "";
  defaultPlayerOpt.disabled = true;
  defaultPlayerOpt.selected = true;
  defaultPlayerOpt.textContent = "Select player";
  playerSelect.appendChild(defaultPlayerOpt);

  game.players.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    playerSelect.appendChild(opt);
  });
  if (currentPlayerValue) {
    playerSelect.value = currentPlayerValue;
  }

  // Filter selects
  const previousFilterPlay = game.filters.play;
  filterPlaySelect.innerHTML = "";
  const allPlayOpt = document.createElement("option");
  allPlayOpt.value = "all";
  allPlayOpt.textContent = "All plays";
  filterPlaySelect.appendChild(allPlayOpt);

  game.plays.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    filterPlaySelect.appendChild(opt);
  });
  filterPlaySelect.value = previousFilterPlay;

  const previousFilterPlayer = game.filters.player;
  filterPlayerSelect.innerHTML = "";
  const allPlayerOpt = document.createElement("option");
  allPlayerOpt.value = "all";
  allPlayerOpt.textContent = "All players";
  filterPlayerSelect.appendChild(allPlayerOpt);

  game.players.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    filterPlayerSelect.appendChild(opt);
  });
  filterPlayerSelect.value = previousFilterPlayer;
}

function renderSummary() {
  const game = getCurrentGame();
  if (!game) return;

  const logs = game.logs;
  totalPlaysLabel.textContent = `${logs.length} plays logged`;

  // Overall
  const overall = calculateConversion(logs);
  overallConversionEl.textContent = formatPercent(overall.rate);
  overallBreakdownEl.textContent = `${overall.positive} positive / ${overall.total} total`;

  // By half
  const half1Logs = logs.filter((log) => log.half === 1);
  const half2Logs = logs.filter((log) => log.half === 2);

  const half1 = calculateConversion(half1Logs);
  const half2 = calculateConversion(half2Logs);

  half1ConversionEl.textContent = formatPercent(half1.rate);
  half2ConversionEl.textContent = formatPercent(half2.rate);

  // By quarter
  const q1Logs = logs.filter((log) => log.quarter === 1);
  const q2Logs = logs.filter((log) => log.quarter === 2);
  const q3Logs = logs.filter((log) => log.quarter === 3);
  const q4Logs = logs.filter((log) => log.quarter === 4);

  q1ConversionEl.textContent = formatPercent(calculateConversion(q1Logs).rate);
  q2ConversionEl.textContent = formatPercent(calculateConversion(q2Logs).rate);
  q3ConversionEl.textContent = formatPercent(calculateConversion(q3Logs).rate);
  q4ConversionEl.textContent = formatPercent(calculateConversion(q4Logs).rate);
}

function getFilteredLogs() {
  const game = getCurrentGame();
  if (!game) return [];

  return game.logs.filter((log) => {
    const playMatches =
      game.filters.play === "all" || log.play === game.filters.play;
    const playerMatches =
      game.filters.player === "all" || log.player === game.filters.player;
    return playMatches && playerMatches;
  });
}

function renderSeasonOverview() {
  if (!seasonOverallRateEl) return;

  const allLogs = getAllSeasonLogs();
  const seasonConv = calculateConversion(allLogs);
  seasonOverallRateEl.textContent = formatPercent(seasonConv.rate);
  seasonOverallBreakdownEl.textContent = `${seasonConv.positive} positive / ${seasonConv.total} total plays`;

  // Per-game list
  seasonGamesListEl.innerHTML = "";
  const perGame = computePerGameStats();
  perGame.forEach((g) => {
    const li = document.createElement("li");
    li.className = "season-list__item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "season-list__label";
    nameSpan.textContent = g.label;

    const metaSpan = document.createElement("span");
    metaSpan.className = "season-list__meta";
    metaSpan.textContent = `${formatPercent(g.rate)} • ${g.positive}/${g.total}`;

    li.appendChild(nameSpan);
    li.appendChild(metaSpan);
    seasonGamesListEl.appendChild(li);
  });

  // Top plays table
  seasonTopPlaysBodyEl.innerHTML = "";
  const perPlay = computePerPlaySeasonStats();
  perPlay.slice(0, 10).forEach((p) => {
    const tr = document.createElement("tr");

    const playTd = document.createElement("td");
    playTd.textContent = p.play;

    const posTd = document.createElement("td");
    posTd.textContent = p.positive;

    const totalTd = document.createElement("td");
    totalTd.textContent = p.total;

    const rateTd = document.createElement("td");
    rateTd.textContent = formatPercent(p.rate);

    tr.appendChild(playTd);
    tr.appendChild(posTd);
    tr.appendChild(totalTd);
    tr.appendChild(rateTd);

    seasonTopPlaysBodyEl.appendChild(tr);
  });
}

function renderLogTable() {
  const logs = getFilteredLogs();
  logTableBody.innerHTML = "";

  logs.forEach((log) => {
    const tr = document.createElement("tr");

    const quarterTd = document.createElement("td");
    quarterTd.textContent = `Q${log.quarter}`;

    const halfTd = document.createElement("td");
    const halfBadge = document.createElement("span");
    halfBadge.className = "badge-half";
    halfBadge.textContent = log.half === 1 ? "1st" : "2nd";
    halfTd.appendChild(halfBadge);

    const playTd = document.createElement("td");
    playTd.textContent = log.play;

    const outcomeTd = document.createElement("td");
    const outcomeBadge = document.createElement("span");
    outcomeBadge.className = log.isPositive
      ? "badge-outcome-positive"
      : "badge-outcome-negative";
    outcomeBadge.textContent = log.outcome;
    outcomeTd.appendChild(outcomeBadge);

    const playerTd = document.createElement("td");
    playerTd.textContent = log.player;

    const impactTd = document.createElement("td");
    impactTd.textContent = log.isPositive ? "Positive" : "Negative";
    impactTd.className = log.isPositive
      ? "impact-positive"
      : "impact-negative";

    tr.appendChild(quarterTd);
    tr.appendChild(halfTd);
    tr.appendChild(playTd);
    tr.appendChild(outcomeTd);
    tr.appendChild(playerTd);
    tr.appendChild(impactTd);

    logTableBody.appendChild(tr);
  });
}

function renderAll() {
  renderGameSwitcher();
  renderOpponent();
  renderRosters();
  renderSummary();
  renderLogTable();
  renderSeasonOverview();
}

// SECTION: Event Handlers
// Opponent change
opponentInput.addEventListener("input", (e) => {
  const game = getCurrentGame();
  if (!game) return;
  game.opponent = e.target.value;
  saveState();
  renderOpponent();
});

// Add player
playerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const game = getCurrentGame();
  if (!game) return;

  const name = playerNameInput.value.trim();
  if (!name) return;
  if (!game.players.includes(name)) {
    game.players.push(name);
  }
  playerNameInput.value = "";
  saveState();
  renderRosters();
});

// Add play
playForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const game = getCurrentGame();
  if (!game) return;

  const name = playNameInput.value.trim();
  if (!name) return;
  if (!game.plays.includes(name)) {
    game.plays.push(name);
  }
  playNameInput.value = "";
  saveState();
  renderRosters();
});

// Quarter toggle
quarterToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip--toggle");
  if (!btn) return;

  const quarter = Number(btn.dataset.quarter);
  if (!quarter) return;

  // Update active styles
  const allButtons = quarterToggle.querySelectorAll(".chip--toggle");
  allButtons.forEach((button) => {
    button.classList.toggle("chip--active", button === btn);
  });

  quarterToggle.dataset.selectedQuarter = String(quarter);
});

// Log play result
logForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const game = getCurrentGame();
  if (!game) return;

  const play = playInput.value.trim();
  const player = playerSelect.value;
  const outcome = outcomeSelect.value;

  const selectedQuarter = Number(quarterToggle.dataset.selectedQuarter || 1);
  const quarter = selectedQuarter >= 1 && selectedQuarter <= 4 ? selectedQuarter : 1;
  const half = computeHalf(quarter);

  if (!play || !player || !outcome) {
    // Basic guard, do nothing if required fields missing
    return;
  }

  const isPositive = POSITIVE_OUTCOMES.has(outcome);

  const logItem = {
    id: createId(),
    play,
    player,
    outcome,
    isPositive,
    quarter,
    half,
  };

  game.logs.push(logItem);

  // Reset inputs to default
  playInput.value = "";
  playerSelect.value = "";
  outcomeSelect.selectedIndex = 0;

  saveState();
  renderSummary();
  renderLogTable();
});

// Game switcher
if (addGameBtn && gameSelect) {
  addGameBtn.addEventListener("click", () => {
    const gameNumber = state.games.length + 1;
    const newGame = {
      id: createId(),
      name: `Game ${gameNumber}`,
      opponent: "",
      players: [],
      plays: [],
      logs: [],
      filters: {
        play: "all",
        player: "all",
      },
    };
    state.games.push(newGame);
    state.currentGameId = newGame.id;
    saveState();
    opponentInput.value = "";
    renderAll();
  });

  gameSelect.addEventListener("change", (e) => {
    const newId = e.target.value;
    if (!newId) return;
    state.currentGameId = newId;
    const game = getCurrentGame();
    opponentInput.value = game ? game.opponent : "";
    saveState();
    renderAll();
  });
}

// Filters
filterPlaySelect.addEventListener("change", (e) => {
  const game = getCurrentGame();
  if (!game) return;
  game.filters.play = e.target.value;
  saveState();
  renderLogTable();
});

filterPlayerSelect.addEventListener("change", (e) => {
  const game = getCurrentGame();
  if (!game) return;
  game.filters.player = e.target.value;
  saveState();
  renderLogTable();
});

// SECTION: Init
// Default quarter selection to Q1
quarterToggle.dataset.selectedQuarter = "1";

// Load any saved games from localStorage, or create a default one
loadState();
renderAll();
