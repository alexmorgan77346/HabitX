// ── DATA ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'habitx_v1';
const EMOJIS = ['💧','🏃','📚','🧘','🥗','😴','✍️','📵','💊','🚶','🎯','💪','🍎','☕','🎵','🧹','💻','🏊','🚴','🌿','🧠','❤️','🌅','🥤','🏋️','🎨','🙏','🌙','⚡','🔋'];
const CAT_EMOJIS = ['🏃','❤️','🧠','🌿','💼','🎯','🌙','⚡','🎨','🍎'];

const defaultData = {
  habits: [
    {id:'h1', name:'Drink 8 glasses of water', emoji:'💧', cat:'Health', goal:7},
    {id:'h2', name:'Exercise 30 min',           emoji:'🏃', cat:'Fitness', goal:5},
    {id:'h3', name:'Read 20 pages',             emoji:'📚', cat:'Learning', goal:7},
    {id:'h4', name:'Meditate 10 min',           emoji:'🧘', cat:'Wellness', goal:7},
    {id:'h5', name:'Sleep 7-8 hours',           emoji:'😴', cat:'Wellness', goal:7},
    {id:'h6', name:'Journal',                   emoji:'✍️', cat:'Learning', goal:7},
    {id:'h7', name:'No social media after 9pm', emoji:'📵', cat:'Wellness', goal:7},
    {id:'h8', name:'Take vitamins',             emoji:'💊', cat:'Health', goal:7},
  ],
  categories: [
    {id:'c1', name:'Health',   emoji:'❤️'},
    {id:'c2', name:'Fitness',  emoji:'🏃'},
    {id:'c3', name:'Learning', emoji:'🧠'},
    {id:'c4', name:'Wellness', emoji:'🌿'},
  ],
  days: {},
  settings: { bestStreak: 0, theme: 'dark' }
};

let data;
function loadData() {
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData; }
  catch { data = defaultData; }
  if (!data.categories) data.categories = defaultData.categories;
  if (!data.settings)   data.settings   = {bestStreak:0, theme:'dark'};
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ── STATE ─────────────────────────────────────────────────────────────────────
let selectedDay = todayKey();
let editMode    = false;
let editHabitId = null;
let editCatId   = null;
let selectedEmoji    = EMOJIS[0];
let selectedCatEmoji = CAT_EMOJIS[0];
let activeCat        = 'All';
let currentPage      = 'today';

function todayKey() {
  return new Date().toISOString().split('T')[0];
}
function yesterdayKey() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ── INIT ──────────────────────────────────────────────────────────────────────
loadData();
// ensure today and yesterday always exist
if (!data.days[todayKey()])     data.days[todayKey()] = {};
if (!data.days[yesterdayKey()]) data.days[yesterdayKey()] = {};
if (Object.keys(data.days).length <= 2) {
  const t = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(t); d.setDate(d.getDate() - i);
    data.days[d.toISOString().split('T')[0]] = {};
  }
}
saveData();

// Apply saved theme
applyTheme(data.settings.theme || 'dark');

// Header dates
const now = new Date();
const dateStr = now.toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'});
document.getElementById('topbarDate').innerHTML = `<strong>${dateStr}</strong><br>W${getWeekNum(now)}`;
document.getElementById('sidebarDate').textContent = dateStr;


function getWeekNum(d) {
  const s = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - s) / 86400000 + s.getDay() + 1) / 7);
}

// Load data.json then render
fetch('data.json')
  .then(r => r.json())
  .then(json => { ATOMIC_HABITS = json.atomicHabits || []; })
  .catch(() => { ATOMIC_HABITS = []; })
  .finally(() => render());

// ── THEME ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  data.settings.theme = next;
  saveData();
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('themeColorMeta').setAttribute('content', theme === 'dark' ? '#0c0c0f' : '#f5f5f8');
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── PAGES ─────────────────────────────────────────────────────────────────────
const pageTitles = { today: 'Today', stats: 'Stats', science: 'Habit Science', manage: 'Manage' };
function showPage(id) {
  currentPage = id;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
  document.getElementById('topbarTitle').textContent = pageTitles[id];
  document.getElementById('fab').style.display = id === 'today' ? 'flex' : 'none';
  if (id === 'stats')   renderStats();
  if (id === 'manage')  renderManage();
  if (id === 'science') renderScience();
  closeSidebar();
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function render() {
  renderDayStrip();
  renderCatChips();
  renderHabitList();
  renderProgress();
  if (currentPage === 'stats')  renderStats();
  if (currentPage === 'manage') renderManage();
  document.getElementById('sidebarStreak').textContent = calcCurrentStreak();
}

function renderDayStrip() {
  const strip = document.getElementById('dayStrip');
  strip.innerHTML = '';
  const tKey = todayKey();
  const yKey = yesterdayKey();
  // ensure today always exists
  if (!data.days[tKey]) { data.days[tKey] = {}; saveData(); }
  sortedDays().forEach(k => {
    const d = new Date(k + 'T00:00:00');
    const isToday    = k === tKey;
    const isYest     = k === yKey;
    const isEditable = isToday || isYest;
    const isDone     = Object.values(data.days[k] || {}).some(v => v);
    const isSelected = k === selectedDay;
    const pill = document.createElement('div');
    pill.className = 'day-pill'
      + (isSelected ? ' selected' : '')
      + (isToday ? ' today' : '')
      + (isDone ? ' has-data' : '')
      + (!isEditable ? ' locked' : '');
    pill.innerHTML = `
      <button class="day-del-btn" onclick="confirmDeleteDay('${k}',event)">✕</button>
      <span class="day-name">${d.toLocaleDateString('en', {weekday:'short'})}</span>
      <span class="day-num">${d.getDate()}</span>
      <div class="day-dot"></div>
      ${!isEditable ? '<span class="day-lock">🔒</span>' : ''}`;
    pill.addEventListener('click', () => { selectedDay = k; render(); });
    strip.appendChild(pill);
  });
  setTimeout(() => {
    const sel = strip.querySelector('.selected');
    if (sel) sel.scrollIntoView({block:'nearest', inline:'center', behavior:'smooth'});
  }, 50);
}

function renderCatChips() {
  const row = document.getElementById('chipsRow');
  row.innerHTML = '';
  ['All', ...data.categories.map(c => c.name)].forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-chip' + (activeCat === cat ? ' active' : '');
    const obj = data.categories.find(c => c.name === cat);
    btn.textContent = cat === 'All' ? '★ All' : (obj ? obj.emoji + ' ' + cat : cat);
    btn.onclick = () => { activeCat = cat; renderCatChips(); renderHabitList(); };
    row.appendChild(btn);
  });
}

function renderHabitList() {
  const list    = document.getElementById('habitList');
  const dayData = data.days[selectedDay] || {};
  let habits    = data.habits;
  if (activeCat !== 'All') habits = habits.filter(h => h.cat === activeCat);
  if (habits.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><p>No habits yet.<br>Tap + to add your first.</p></div>`;
    return;
  }
  list.innerHTML = '';
  habits.forEach(h => {
    const done   = !!dayData[h.id];
    const streak = calcHabitStreak(h.id);
    const card   = document.createElement('div');
    card.className = 'habit-card' + (done ? ' done' : '');
    card.innerHTML = `
      <div class="habit-check">${done ? '✓' : ''}</div>
      <div class="habit-info">
        <div class="habit-name">${h.emoji} ${h.name}</div>
        <div class="habit-meta">
          <span class="habit-cat">${h.cat}</span>
          ${streak > 1 ? `<span class="habit-streak-badge">🔥 ${streak}d</span>` : ''}
        </div>
      </div>
      <button class="habit-detail-btn" onclick="openHabitDetail('${h.id}',event)" title="View tracker">📊</button>
      ${editMode ? `<div class="habit-actions">
        <button class="habit-action-btn" onclick="openEditHabit('${h.id}',event)">✏️</button>
        <button class="habit-action-btn del" onclick="confirmDeleteHabit('${h.id}',event)">🗑</button>
      </div>` : ''}`;
    card.addEventListener('click', e => {
      if (e.target.closest('.habit-action-btn') || e.target.closest('.habit-detail-btn')) return;
      toggleHabit(h.id);
    });
    list.appendChild(card);
  });
}

function renderProgress() {
  const dayData = data.days[selectedDay] || {};
  const total   = data.habits.length;
  const done    = data.habits.filter(h => !!dayData[h.id]).length;
  const pct     = total ? done / total : 0;
  const r = 29, circ = 2 * Math.PI * r;
  document.getElementById('ringFg').style.strokeDashoffset = circ * (1 - pct);
  document.getElementById('ringPct').textContent = Math.round(pct * 100) + '%';
  const streak = calcCurrentStreak();
  document.getElementById('streakNum').textContent = streak;
  document.getElementById('sidebarStreak').textContent = streak;
  if (streak > (data.settings.bestStreak || 0)) { data.settings.bestStreak = streak; saveData(); }
  document.getElementById('streakBest').textContent = 'Best: ' + (data.settings.bestStreak || 0) + ' days';
}

function renderStats() {
  const allDays = sortedDays();
  const total   = data.habits.length;
  let totalComp = 0, perfectDays = 0;
  allDays.forEach(k => {
    const d    = data.days[k] || {};
    const done = data.habits.filter(h => !!d[h.id]).length;
    totalComp += done;
    if (done === total && total > 0) perfectDays++;
  });
  const possible = allDays.length * total;
  const rate     = possible ? Math.round(totalComp / possible * 100) : 0;
  const streak   = data.settings.bestStreak || 0;

  // ── Overview tiles ──
  const tiles = [
    { icon: '✅', label: 'Total Completions', val: totalComp,     sub: 'all time',        color: 'var(--accent)',  pct: Math.min(100, totalComp / Math.max(possible, 1) * 100) },
    { icon: '📈', label: 'Completion Rate',   val: rate + '%',    sub: 'of all days',     color: 'var(--green)',   pct: rate },
    { icon: '🔥', label: 'Best Streak',       val: streak + 'd',  sub: 'consecutive days',color: 'var(--gold)',    pct: Math.min(100, streak / 30 * 100) },
    { icon: '🏆', label: 'Perfect Days',      val: perfectDays,   sub: 'all habits done', color: 'var(--accent2)', pct: allDays.length ? perfectDays / allDays.length * 100 : 0 },
    { icon: '📅', label: 'Days Tracked',      val: allDays.length,sub: 'total days',      color: '#a78bfa',        pct: Math.min(100, allDays.length / 30 * 100) },
    { icon: '💪', label: 'Active Habits',     val: total,         sub: 'habits setup',    color: '#60a5fa',        pct: Math.min(100, total / 10 * 100) },
  ];
  const tilesEl = document.getElementById('overviewTiles');
  tilesEl.innerHTML = tiles.map(t => `
    <div class="ov-tile">
      <div class="ov-icon">${t.icon}</div>
      <div class="ov-body">
        <div class="ov-label">${t.label}</div>
        <div class="ov-track">
          <div class="ov-fill" style="width:0%;background:${t.color}" data-w="${t.pct.toFixed(1)}%"></div>
        </div>
      </div>
      <div class="ov-right">
        <div class="ov-val" style="color:${t.color}">${t.val}</div>
        <div class="ov-sub">${t.sub}</div>
      </div>
    </div>`).join('');
  setTimeout(() => tilesEl.querySelectorAll('.ov-fill').forEach(b => b.style.width = b.dataset.w), 60);

  // ── Candlestick / stock chart: last 14 days ──
  const chartDays = 14;
  const today     = new Date();
  const pts = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const d  = new Date(today); d.setDate(d.getDate() - i);
    const k  = d.toISOString().split('T')[0];
    const dd = data.days[k] || {};
    const cnt = total ? data.habits.filter(h => !!dd[h.id]).length : 0;
    pts.push({ k, cnt, pct: total ? cnt / total : 0, d, exists: !!data.days[k] });
  }

  const area   = document.getElementById('candleArea');
  const H      = 90;
  area.innerHTML = '';
  // Grid lines inside candle area (absolute)
  [0, 0.5, 1].forEach(frac => {
    const line = document.createElement('div');
    line.style.cssText = `position:absolute;left:0;right:0;bottom:${frac*H}px;height:1px;background:var(--border);opacity:0.6;pointer-events:none;`;
    area.appendChild(line);
  });

  pts.forEach((p, i) => {
    const prev    = i > 0 ? pts[i - 1] : null;
    const barH    = Math.max(3, Math.round(p.pct * H));
    const prevH   = prev ? Math.max(3, Math.round(prev.pct * H)) : barH;
    const isUp    = p.pct >= (prev ? prev.pct : p.pct);
    const isFlat  = prev && p.pct === prev.pct;
    const cls     = isFlat ? 'flat' : isUp ? 'up' : 'down';

    // wick height = difference from prev
    const wickH   = prev ? Math.abs(barH - prevH) : 0;
    const wickBot = Math.min(barH, prevH);

    const col = document.createElement('div');
    col.className = 'candle-col';

    const bar = document.createElement('div');
    bar.className = `candle-bar ${cls}`;
    bar.style.cssText = `height:${barH}px;width:60%;left:20%;`;

    col.appendChild(bar);

    // Wick (shows volatility / change from previous)
    if (wickH > 2 && prev) {
      const wick = document.createElement('div');
      wick.className = 'candle-wick';
      wick.style.cssText = `height:${wickH}px;bottom:${wickBot}px;left:calc(50% - 0.75px);background:${isFlat ? 'var(--text3)' : isUp ? 'var(--green)' : 'var(--accent2)'};`;
      col.appendChild(wick);
    }

    area.appendChild(col);
  });

  // Y labels
  document.getElementById('chartYLabels').innerHTML =
    '<span>100%</span><span>50%</span><span>0%</span>';

  // X labels — show first, middle, last
  const labelsEl = document.getElementById('chartLabels');
  labelsEl.innerHTML = '';
  [0, 6, 13].forEach(i => {
    const span = document.createElement('span');
    span.textContent = pts[i].d.toLocaleDateString('en', {day:'numeric', month:'short'});
    labelsEl.appendChild(span);
  });

  // ── Calendar heatmap ──
  const cal = document.getElementById('calHeatmap');
  const tKey = todayKey();
  // Build 4 weeks back from today (28 cells), aligned by weekday
  // Find the Monday of 4 weeks ago
  const endDate   = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 27);
  // Pad to Monday
  const startDow = (startDate.getDay() + 6) % 7; // 0=Mon

  const days7 = ['M','T','W','T','F','S','S'];
  let html = `<div class="cal-week-labels"><div></div>${days7.map(d=>`<div class="cal-week-lbl">${d}</div>`).join('')}</div>`;

  // Build 4 rows (weeks), each row = Mon–Sun
  for (let week = 0; week < 4; week++) {
    const rowStart = new Date(startDate);
    rowStart.setDate(rowStart.getDate() + week * 7 - startDow);
    const mon = new Date(rowStart);
    // Week label
    const wLbl = mon.toLocaleDateString('en', {month:'short', day:'numeric'});
    html += `<div class="cal-row"><div class="cal-row-lbl">${mon.getDate()}</div>`;
    for (let dow = 0; dow < 7; dow++) {
      const cell = new Date(mon); cell.setDate(mon.getDate() + dow);
      const k    = cell.toISOString().split('T')[0];
      const dd   = data.days[k] || {};
      const cnt  = data.habits.filter(h => !!dd[h.id]).length;
      const lvl  = !total ? 0 : cnt === 0 ? 0 : cnt < total * .33 ? 1 : cnt < total * .66 ? 2 : cnt < total ? 3 : 4;
      const isFuture = k > tKey;
      const isToday  = k === tKey;
      html += `<div class="cal-cell l${isFuture ? 'x' : lvl}${isToday ? ' today-cell' : ''}" title="${k}: ${cnt}/${total}${isFuture ? ' (future)' : ''}" style="${isFuture ? 'opacity:.2' : ''}">${cnt||''}</div>`;
    }
    html += '</div>';
  }
  // Legend
  html += `<div class="cal-legend">Less
    <div class="cal-legend-cells">
      ${[0,1,2,3,4].map(l=>`<div class="cal-legend-cell l${l}" style="background:${['var(--border)','rgba(61,220,132,.2)','rgba(61,220,132,.5)','rgba(61,220,132,.75)','var(--green)'][l]}"></div>`).join('')}
    </div>
    More</div>`;
  cal.innerHTML = html;

  // ── Habit performance bars ──
  const bc = document.getElementById('barChart');
  bc.innerHTML = '';
  data.habits.forEach(h => {
    const comp = allDays.filter(k => !!(data.days[k] || {})[h.id]).length;
    const pct  = allDays.length ? Math.round(comp / allDays.length * 100) : 0;
    bc.innerHTML += `<div class="bar-row">
      <span class="bar-label">${h.emoji} ${h.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:0%" data-w="${pct}%"></div></div>
      <span class="bar-pct">${pct}%</span>
    </div>`;
  });
  setTimeout(() => bc.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.dataset.w), 80);
}

function renderManage() {
  const mhl = document.getElementById('manageHabitList');
  mhl.innerHTML = data.habits.length === 0
    ? '<div style="padding:16px;color:var(--text2);font-size:13px">No habits yet.</div>'
    : data.habits.map(h => `
      <div class="manage-item">
        <span class="manage-item-icon">${h.emoji}</span>
        <div class="manage-item-info">
          <div class="manage-item-name">${h.name}</div>
          <div class="manage-item-sub">${h.cat} · ${h.goal}×/week</div>
        </div>
        <div class="manage-item-btns">
          <button class="mi-btn edit" onclick="openEditHabit('${h.id}')">✏️</button>
          <button class="mi-btn del"  onclick="confirmDeleteHabit('${h.id}')">🗑</button>
        </div>
      </div>`).join('');
  mhl.innerHTML += `<div style="padding:12px 16px"><button class="btn btn-primary" style="padding:10px" onclick="openAddHabit()">＋ Add Habit</button></div>`;

  const mdl = document.getElementById('manageDayList');
  const days = sortedDays();
  mdl.innerHTML = days.length === 0
    ? '<div style="padding:16px;color:var(--text2);font-size:13px">No days tracked.</div>'
    : days.map(k => {
      const d    = new Date(k + 'T00:00:00');
      const done = data.habits.filter(h => !!(data.days[k] || {})[h.id]).length;
      return `<div class="manage-item">
        <span class="manage-item-icon">📅</span>
        <div class="manage-item-info">
          <div class="manage-item-name">${d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</div>
          <div class="manage-item-sub">${done}/${data.habits.length} completed</div>
        </div>
        <div class="manage-item-btns">
          <button class="mi-btn del" onclick="confirmDeleteDay('${k}')">🗑</button>
        </div>
      </div>`;
    }).join('');
  // days list only, no add button

  const mcl = document.getElementById('manageCatList');
  mcl.innerHTML = data.categories.map(c => `
    <div class="manage-item">
      <span class="manage-item-icon">${c.emoji}</span>
      <div class="manage-item-info">
        <div class="manage-item-name">${c.name}</div>
        <div class="manage-item-sub">${data.habits.filter(h => h.cat === c.name).length} habits</div>
      </div>
      <div class="manage-item-btns">
        <button class="mi-btn edit" onclick="openEditCat('${c.id}')">✏️</button>
        <button class="mi-btn del"  onclick="confirmDeleteCat('${c.id}')">🗑</button>
      </div>
    </div>`).join('');
  mcl.innerHTML += `<div style="padding:12px 16px"><button class="btn btn-primary" style="padding:10px" onclick="openAddCat()">＋ Add Category</button></div>`;
}

// ── HABIT DETAIL ─────────────────────────────────────────────────────────────
function openHabitDetail(hid, e) {
  if (e) e.stopPropagation();
  const h = data.habits.find(x => x.id === hid); if (!h) return;
  const allDays  = sortedDays();
  const total    = allDays.length;
  const tKey     = todayKey();
  const yKey     = yesterdayKey();

  // Compute stats
  const doneDays  = allDays.filter(k => !!(data.days[k] || {})[hid]);
  const doneCount = doneDays.length;
  const streak    = calcHabitStreak(hid);
  const rate      = total ? Math.round(doneCount / total * 100) : 0;
  const bestStr   = calcHabitBestStreak(hid);

  // Header
  document.getElementById('hdEmoji').textContent = h.emoji;
  document.getElementById('hdName').textContent  = h.name;
  document.getElementById('hdMeta').textContent  = `${h.cat}  ·  Goal: ${h.goal}×/week`;

  // Stats row
  document.getElementById('hdStats').innerHTML = `
    <div class="hd-stat">
      <div class="hd-stat-val" style="color:var(--green)">${doneCount}</div>
      <div class="hd-stat-lbl">Done</div>
    </div>
    <div class="hd-stat">
      <div class="hd-stat-val" style="color:var(--gold)">${streak}d</div>
      <div class="hd-stat-lbl">Streak</div>
    </div>
    <div class="hd-stat">
      <div class="hd-stat-val" style="color:var(--accent)">${rate}%</div>
      <div class="hd-stat-lbl">Rate</div>
    </div>`;

  // Last 7 days mini bars
  const weekEl = document.getElementById('hdWeek');
  weekEl.innerHTML = '';
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(); d.setDate(d.getDate() - i);
    const k   = d.toISOString().split('T')[0];
    const done = !!(data.days[k] || {})[hid];
    const col  = document.createElement('div');
    col.className = 'hd-week-col';
    col.innerHTML = `
      <div class="hd-week-bar-wrap">
        <div class="hd-week-bar ${done ? 'done-bar' : 'skip-bar'}" style="height:${done ? '100' : '20'}%"></div>
      </div>
      <div class="hd-week-lbl">${d.toLocaleDateString('en', {weekday:'short'}).slice(0,1)}</div>`;
    weekEl.appendChild(col);
  }

  // All tracked days — sorted newest first, 7-col grid
  const calEl = document.getElementById('hdCalendar');
  // Build all days from earliest to latest, fill to multiple of 7
  const sorted = [...allDays].sort();
  // Pad front to align with weekday (Mon=0)
  const firstDate = sorted.length ? new Date(sorted[0] + 'T00:00:00') : new Date();
  const padCount  = (firstDate.getDay() + 6) % 7; // Mon-aligned
  let cells = '';
  // Empty pads
  for (let p = 0; p < padCount; p++) {
    cells += `<div style="aspect-ratio:1"></div>`;
  }
  sorted.forEach(k => {
    const done    = !!(data.days[k] || {})[hid];
    const d       = new Date(k + 'T00:00:00');
    const isToday = k === tKey;
    const isEdit  = k === tKey || k === yKey;
    cells += `
      <div class="hd-day-cell ${done ? 'tracked-done' : 'tracked-skip'}${isToday ? ' is-today' : ''}"
           title="${k}"
           onclick="${isEdit ? `toggleHabitOnDay('${hid}','${k}')` : ''}">
        <span class="hd-day-num">${d.getDate()}</span>
        <span class="hd-day-mon">${d.toLocaleDateString('en',{month:'short'})}</span>
        ${done ? '<span class="hd-check-icon">✓</span>' : ''}
      </div>`;
  });
  calEl.innerHTML = cells;
  // Scroll to bottom (newest)
  setTimeout(() => { calEl.scrollTop = calEl.scrollHeight; }, 80);

  openModal('habitDetailModal');
}

function toggleHabitOnDay(hid, k) {
  if (!data.days[k]) data.days[k] = {};
  data.days[k][hid] = !data.days[k][hid];
  saveData();
  // Re-render detail
  openHabitDetail(hid, null);
  render();
}

function calcHabitBestStreak(hid) {
  const days = sortedDays();
  let best = 0, cur = 0;
  days.forEach(k => {
    if ((data.days[k] || {})[hid]) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  });
  return best;
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────
function toggleHabit(hid) {
  if (selectedDay !== todayKey() && selectedDay !== yesterdayKey()) {
    showToast('🔒 Can only edit today & yesterday');
    return;
  }
  if (!data.days[selectedDay]) data.days[selectedDay] = {};
  data.days[selectedDay][hid] = !data.days[selectedDay][hid];
  saveData(); render();
  showToast(data.days[selectedDay][hid] ? '✅ Done!' : '↩️ Unmarked');
}

function toggleEditMode() {
  editMode = !editMode;
  document.getElementById('dayStrip').classList.toggle('edit-mode', editMode);
  renderCatChips(); renderHabitList();
  showToast(editMode ? '✏️ Edit mode on' : 'Edit mode off');
}

function sortedDays() { return Object.keys(data.days).sort(); }

function calcCurrentStreak() {
  const days = sortedDays().reverse();
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const done = data.habits.filter(h => !!(data.days[days[i]] || {})[h.id]).length;
    if (done > 0) streak++;
    else break;
  }
  return streak;
}

function calcHabitStreak(hid) {
  const days = sortedDays().reverse();
  let streak = 0;
  for (const k of days) {
    if ((data.days[k] || {})[hid]) streak++;
    else if (k !== todayKey()) break;
  }
  return streak;
}

// Habit CRUD
function openAddHabit() {
  editHabitId = null;
  document.getElementById('habitModalTitle').textContent = 'New Habit';
  document.getElementById('hName').value = '';
  document.getElementById('hGoal').value = '7';
  selectedEmoji = EMOJIS[0];
  populateEmojiGrid(); populateCatSelect();
  openModal('habitModal');
}
function openEditHabit(id, e) {
  if (e) e.stopPropagation();
  const h = data.habits.find(x => x.id === id); if (!h) return;
  editHabitId = id;
  document.getElementById('habitModalTitle').textContent = 'Edit Habit';
  document.getElementById('hName').value = h.name;
  document.getElementById('hGoal').value = h.goal || 7;
  selectedEmoji = h.emoji || EMOJIS[0];
  populateEmojiGrid(); populateCatSelect(h.cat);
  openModal('habitModal');
}
function saveHabit() {
  const name = document.getElementById('hName').value.trim();
  if (!name) { showToast('⚠️ Enter a name'); return; }
  const cat  = document.getElementById('hCat').value;
  const goal = +document.getElementById('hGoal').value;
  if (editHabitId) {
    const h = data.habits.find(x => x.id === editHabitId);
    if (h) { h.name = name; h.emoji = selectedEmoji; h.cat = cat; h.goal = goal; }
    showToast('✏️ Updated');
  } else {
    data.habits.push({id:'h'+Date.now(), name, emoji:selectedEmoji, cat, goal});
    showToast('✅ Habit added');
  }
  saveData(); closeModal('habitModal'); render();
}
function confirmDeleteHabit(id, e) {
  if (e) e.stopPropagation();
  const h = data.habits.find(x => x.id === id); if (!h) return;
  document.getElementById('confirmTitle').textContent = 'Delete Habit?';
  document.getElementById('confirmMsg').textContent   = `"${h.emoji} ${h.name}" will be removed.`;
  document.getElementById('confirmOk').onclick = () => { deleteHabit(id); closeModal('confirmModal'); };
  openModal('confirmModal');
}
function deleteHabit(id) {
  data.habits = data.habits.filter(h => h.id !== id);
  Object.keys(data.days).forEach(k => { delete (data.days[k] || {})[id]; });
  saveData(); render(); showToast('🗑 Deleted');
}

// Day CRUD

function confirmDeleteDay(k, e) {
  if (e) e.stopPropagation();
  const d = new Date(k + 'T00:00:00');
  document.getElementById('confirmTitle').textContent = 'Delete Day?';
  document.getElementById('confirmMsg').textContent   = `All data for ${d.toLocaleDateString('en-IN',{day:'numeric',month:'long'})} will be removed.`;
  document.getElementById('confirmOk').onclick = () => { deleteDay(k); closeModal('confirmModal'); };
  openModal('confirmModal');
}
function deleteDay(k) {
  delete data.days[k];
  if (selectedDay === k) selectedDay = sortedDays().slice(-1)[0] || todayKey();
  if (!data.days[selectedDay]) data.days[selectedDay] = {};
  saveData(); render(); showToast('🗑 Day removed');
}

// Cat CRUD
function openAddCat() {
  editCatId = null;
  document.getElementById('catModalTitle').textContent = 'New Category';
  document.getElementById('catName').value = '';
  selectedCatEmoji = CAT_EMOJIS[0];
  populateCatEmojiGrid(); openModal('catModal');
}
function openEditCat(id) {
  const c = data.categories.find(x => x.id === id); if (!c) return;
  editCatId = id;
  document.getElementById('catModalTitle').textContent = 'Edit Category';
  document.getElementById('catName').value = c.name;
  selectedCatEmoji = c.emoji || CAT_EMOJIS[0];
  populateCatEmojiGrid(); openModal('catModal');
}
function saveCat() {
  const name = document.getElementById('catName').value.trim();
  if (!name) { showToast('⚠️ Enter a name'); return; }
  if (editCatId) {
    const c = data.categories.find(x => x.id === editCatId);
    const oldName = c.name; c.name = name; c.emoji = selectedCatEmoji;
    data.habits.forEach(h => { if (h.cat === oldName) h.cat = name; });
    showToast('✏️ Updated');
  } else {
    if (data.categories.find(c => c.name === name)) { showToast('Already exists'); return; }
    data.categories.push({id:'c'+Date.now(), name, emoji:selectedCatEmoji});
    showToast('✅ Category added');
  }
  saveData(); closeModal('catModal'); render();
}
function confirmDeleteCat(id) {
  const c = data.categories.find(x => x.id === id); if (!c) return;
  document.getElementById('confirmTitle').textContent = 'Delete Category?';
  document.getElementById('confirmMsg').textContent   = `Habits in "${c.name}" will move to Uncategorized.`;
  document.getElementById('confirmOk').onclick = () => { deleteCat(id); closeModal('confirmModal'); };
  openModal('confirmModal');
}
function deleteCat(id) {
  const c = data.categories.find(x => x.id === id);
  if (c) data.habits.forEach(h => { if (h.cat === c.name) h.cat = 'Uncategorized'; });
  data.categories = data.categories.filter(x => x.id !== id);
  saveData(); render(); showToast('🗑 Category removed');
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
function populateEmojiGrid() {
  document.getElementById('emojiGrid').innerHTML = EMOJIS.map(e =>
    `<div class="emoji-opt${e === selectedEmoji ? ' selected' : ''}" onclick="pickEmoji('${e}',this)">${e}</div>`
  ).join('');
}
function pickEmoji(e, el) {
  selectedEmoji = e;
  document.querySelectorAll('#emojiGrid .emoji-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
}
function populateCatEmojiGrid() {
  document.getElementById('catEmojiGrid').innerHTML = CAT_EMOJIS.map(e =>
    `<div class="emoji-opt${e === selectedCatEmoji ? ' selected' : ''}" onclick="pickCatEmoji('${e}',this)">${e}</div>`
  ).join('');
}
function pickCatEmoji(e, el) {
  selectedCatEmoji = e;
  document.querySelectorAll('#catEmojiGrid .emoji-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
}
function populateCatSelect(selected) {
  const sel = document.getElementById('hCat');
  sel.innerHTML = data.categories.map(c =>
    `<option value="${c.name}"${c.name === selected ? ' selected' : ''}>${c.emoji} ${c.name}</option>`
  ).join('');
  if (!data.categories.find(c => c.name === selected) && data.categories.length)
    sel.value = data.categories[0].name;
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// ── HABIT SCIENCE DATA ────────────────────────────────────────────────────────
// ATOMIC_HABITS loaded from data.json via fetch
let ATOMIC_HABITS = [];

// ── SCIENCE PAGE RENDER ───────────────────────────────────────────────────────
function renderScience() {
  const list = document.getElementById('scienceList');
  let html = '';
  ATOMIC_HABITS.forEach(part => {
    html += `<div class="hs-part-label">${part.part}</div>`;
    part.chapters.forEach(ch => {
      html += `
        <div class="hs-card ${part.cls}" onclick="openChapter('${part.cls}','${encodeURIComponent(JSON.stringify(ch))}','${encodeURIComponent(part.tag)}','${encodeURIComponent(part.color)}')">
          <div class="hs-num">${ch.num}</div>
          <div class="hs-body">
            <div class="hs-title">${ch.title}</div>
            <div class="hs-subtitle">${ch.subtitle}</div>
            <span class="hs-tag" style="color:${part.color};border-color:${part.color}40">${part.tag}</span>
          </div>
          <div class="hs-arrow">›</div>
        </div>`;
    });
  });
  list.innerHTML = html;
}

function openChapter(cls, chJSON, tagEnc, colorEnc) {
  const ch    = JSON.parse(decodeURIComponent(chJSON));
  const tag   = decodeURIComponent(tagEnc);
  const color = decodeURIComponent(colorEnc);
  const content = document.getElementById('chapterModalContent');
  content.innerHTML = `
    <div class="hs-detail-tag" style="color:${color};border-color:${color}40">${tag} · ${ch.num}</div>
    <div class="modal-title" style="margin-bottom:6px">${ch.title}</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px">${ch.subtitle}</div>
    <div class="hs-quote">${ch.quote}</div>
    <div class="hs-section-lbl" style="font-family:'Space Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--text3);margin-bottom:8px">Key Ideas</div>
    <div class="hs-key-ideas">
      ${ch.ideas.map(idea => `
        <div class="hs-key-idea">
          <span class="hs-key-idea-dot">◆</span>
          <span>${idea}</span>
        </div>`).join('')}
    </div>`;
  openModal('chapterModal');
}

// ── SERVICE WORKER ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
