/* ═══════════════════════════════════════════════════
   MANU EXPENSE TRACKER — app.js
   ═══════════════════════════════════════════════════ */

'use strict';

/* ── Constants ───────────────────────────────────── */
const PEOPLE = ['Manu', 'Bhargav', 'Keshav', 'Pradeep'];

const CATEGORIES = [
  'Food & Dining', 'Travel & Transport', 'Accommodation / Rent',
  'Groceries', 'Entertainment', 'Shopping', 'Medical / Health',
  'Utilities', 'Fuel / Petrol', 'Movies & OTT', 'Snacks & Beverages',
  'Party / Celebration', 'Sports & Fitness', 'Electronics',
  'Education', 'Gifts', 'Personal Care', 'Miscellaneous'
];

const CAT_ICONS = {
  'Food & Dining': 'restaurant', 'Travel & Transport': 'directions_car',
  'Accommodation / Rent': 'home', 'Groceries': 'shopping_basket',
  'Entertainment': 'celebration', 'Shopping': 'shopping_bag',
  'Medical / Health': 'local_hospital', 'Utilities': 'bolt',
  'Fuel / Petrol': 'local_gas_station', 'Movies & OTT': 'movie',
  'Snacks & Beverages': 'coffee', 'Party / Celebration': 'cake',
  'Sports & Fitness': 'sports_soccer', 'Electronics': 'devices',
  'Education': 'school', 'Gifts': 'card_giftcard',
  'Personal Care': 'face', 'Miscellaneous': 'more_horiz'
};

const AVATAR_CLASS = { Bhargav: 'av-b', Keshav: 'av-k', Pradeep: 'av-p' };

/* ── State ───────────────────────────────────────── */
let state = {
  expenses: [],
  config: { token: '', owner: '', repo: '' },
  sha: null,
  currentTab: 'dashboard',
  filterStatus: 'unsettled',
  filterCategory: '',
  charts: { category: null, balance: null }
};

/* ── GitHub Storage ──────────────────────────────── */
const GH_API = 'https://api.github.com';

function ghHeaders() {
  return {
    'Authorization': `token ${state.config.token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

async function ghLoad() {
  const { owner, repo } = state.config;
  if (!owner || !repo) return false;
  setSyncStatus('Syncing…', true);
  try {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/data.json`, {
      headers: ghHeaders()
    });
    if (res.status === 404) {
      state.expenses = [];
      state.sha = null;
      setSyncStatus('No data yet — add your first expense!');
      return true;
    }
    if (!res.ok) throw new Error(`GitHub error: ${res.status}`);
    const data = await res.json();
    state.sha = data.sha;
    const raw = atob(data.content.replace(/\n/g, ''));
    const parsed = JSON.parse(raw);
    state.expenses = parsed.expenses || [];
    setSyncStatus(`Synced · ${state.expenses.length} expenses`);
    return true;
  } catch (e) {
    setSyncStatus('Sync failed — check Settings');
    showToast('⚠️ Could not load from GitHub. Check Settings.');
    return false;
  }
}

async function ghSave() {
  const { owner, repo, token } = state.config;
  if (!owner || !repo || !token) {
    showToast('⚙️ Please configure GitHub in Settings first.');
    return false;
  }
  setSyncStatus('Saving…', true);
  try {
    const payload = JSON.stringify({ expenses: state.expenses }, null, 2);
    const content = btoa(unescape(encodeURIComponent(payload)));
    const body = {
      message: `Update expenses ${new Date().toISOString().slice(0, 10)}`,
      content,
      ...(state.sha ? { sha: state.sha } : {})
    };
    const res = await fetch(
      `${GH_API}/repos/${owner}/${repo}/contents/data.json`,
      { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || res.status);
    }
    const result = await res.json();
    state.sha = result.content.sha;
    setSyncStatus(`Saved · ${new Date().toLocaleTimeString()}`);
    return true;
  } catch (e) {
    setSyncStatus('Save failed');
    showToast(`❌ Save failed: ${e.message}`);
    return false;
  }
}

/* ── Local persistence (fallback) ───────────────────*/
function localSave() {
  try { localStorage.setItem('mt_expenses', JSON.stringify(state.expenses)); } catch {}
}
function localLoad() {
  try {
    const d = localStorage.getItem('mt_expenses');
    if (d) state.expenses = JSON.parse(d);
  } catch {}
}
function configSave() {
  try { localStorage.setItem('mt_config', JSON.stringify(state.config)); } catch {}
}
function configLoad() {
  try {
    const d = localStorage.getItem('mt_config');
    if (d) state.config = { ...state.config, ...JSON.parse(d) };
  } catch {}
}

/* ── Helpers ─────────────────────────────────────── */
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function fmtRs(n) {
  if (n === undefined || n === null || isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function catIcon(cat) { return CAT_ICONS[cat] || 'receipt'; }

function setSyncStatus(msg, spinning = false) {
  const el = document.getElementById('syncStatus');
  if (el) el.textContent = msg;
  const btn = document.getElementById('syncBtn');
  if (btn) btn.classList.toggle('syncing', spinning);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── Settlement Calculation ──────────────────────── */
function calcSettlement() {
  const unsettled = state.expenses.filter(e => !e.settled);

  const result = {};
  PEOPLE.filter(p => p !== 'Manu').forEach(person => {
    result[person] = { owesToManu: 0, manuOwes: 0 };
  });

  unsettled.forEach(exp => {
    const splitList = exp.split || [];
    const count = splitList.length;
    if (count === 0) return;
    const per = exp.amount / count;

    if (exp.paidBy === 'Manu') {
      // others who are in the split owe Manu their share
      splitList.filter(p => p !== 'Manu').forEach(p => {
        if (result[p]) result[p].owesToManu += per;
      });
    } else {
      // Manu was in the split → Manu owes paidBy his share
      if (splitList.includes('Manu') && result[exp.paidBy]) {
        result[exp.paidBy].manuOwes += per;
      }
    }
  });

  return result;
}

/* ── Dashboard ───────────────────────────────────── */
function renderDashboard() {
  const unsettled = state.expenses.filter(e => !e.settled);
  const settled   = state.expenses.filter(e => e.settled);

  // KPIs
  const totalBilled = unsettled.reduce((s, e) => s + e.amount, 0);
  const sett = calcSettlement();
  const owedToManu = Object.values(sett).reduce((s, v) => s + v.owesToManu, 0);
  const manuOwes   = Object.values(sett).reduce((s, v) => s + v.manuOwes, 0);

  document.getElementById('kpi-count').textContent = state.expenses.length;
  document.getElementById('kpi-total').textContent = fmtRs(totalBilled);
  document.getElementById('kpi-owed').textContent  = fmtRs(owedToManu);
  document.getElementById('kpi-owes').textContent  = fmtRs(manuOwes);

  // Category chart
  const catTotals = {};
  CATEGORIES.forEach(c => { catTotals[c] = 0; });
  unsettled.forEach(e => { if (catTotals[e.category] !== undefined) catTotals[e.category] += e.amount; });
  const catData = CATEGORIES.map(c => catTotals[c]).filter(v => v > 0);
  const catLabels = CATEGORIES.filter(c => catTotals[c] > 0);

  const catCanvas = document.getElementById('categoryChart');
  if (state.charts.category) state.charts.category.destroy();
  state.charts.category = new Chart(catCanvas, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{ data: catData, backgroundColor: generateColors(catLabels.length), borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { font: { size: 11, family: 'Google Sans' }, padding: 10 } } }
    }
  });

  // Balance chart
  const balCanvas = document.getElementById('balanceChart');
  if (state.charts.balance) state.charts.balance.destroy();
  const others = PEOPLE.filter(p => p !== 'Manu');
  state.charts.balance = new Chart(balCanvas, {
    type: 'bar',
    data: {
      labels: others,
      datasets: [
        { label: 'Owes Manu', data: others.map(p => sett[p].owesToManu), backgroundColor: '#34a853', borderRadius: 6 },
        { label: 'Manu Owes', data: others.map(p => sett[p].manuOwes),   backgroundColor: '#ea4335', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11, family: 'Google Sans' } } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Google Sans', size: 12 } } },
        y: { grid: { color: '#f1f3f4' }, ticks: { callback: v => '₹' + v.toLocaleString('en-IN'), font: { size: 11 } } }
      }
    }
  });

  // Recent expenses (last 5)
  const recent = [...state.expenses].reverse().slice(0, 5);
  const recEl = document.getElementById('recentList');
  if (recent.length === 0) {
    recEl.innerHTML = '<p style="padding:16px 20px;color:var(--md-on-muted);font-size:13px;">No expenses yet.</p>';
    return;
  }
  recEl.innerHTML = recent.map(e => `
    <div class="recent-item">
      <div class="recent-icon"><span class="material-icons-round">${catIcon(e.category)}</span></div>
      <div class="recent-desc">
        <strong>${escHtml(e.description)}</strong>
        <span>${fmtDate(e.date)} · ${escHtml(e.category)}</span>
      </div>
      <div class="recent-amount">${fmtRs(e.amount)}</div>
    </div>
  `).join('');
}

function generateColors(n) {
  const base = ['#4285f4','#ea4335','#fbbc04','#34a853','#9334e6','#1e8e3e','#d93025','#f9ab00','#1a73e8','#0f9d58','#ab47bc','#00acc1','#ff7043','#8d6e63','#78909c','#5c6bc0','#26a69a','#ec407a'];
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
}

/* ── Expenses List ───────────────────────────────── */
function getFilteredExpenses() {
  return state.expenses.filter(e => {
    if (state.filterStatus === 'unsettled' && e.settled) return false;
    if (state.filterStatus === 'settled'   && !e.settled) return false;
    if (state.filterCategory && e.category !== state.filterCategory) return false;
    return true;
  });
}

function renderExpenses() {
  const list = getFilteredExpenses();
  const container = document.getElementById('expensesList');
  const empty = document.getElementById('expensesEmpty');

  if (list.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Sort by date descending
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = sorted.map(e => expenseItemHTML(e)).join('');
}

function expenseItemHTML(e) {
  const splitBadges = (e.split || []).map(p =>
    `<span class="split-badge">${escHtml(p)}</span>`).join('');

  const statusBadge = e.settled
    ? `<span class="settled-badge">✅ Settled</span>`
    : `<span class="paidby-badge">Paid: ${escHtml(e.paidBy)}</span>`;

  const settleBtn = e.settled
    ? `<button class="action-btn unsettle-btn" onclick="toggleSettle('${e.id}', false)" title="Mark Unsettled"><span class="material-icons-round">undo</span></button>`
    : `<button class="action-btn settle-btn"   onclick="toggleSettle('${e.id}', true)"  title="Mark Settled"><span class="material-icons-round">check_circle</span></button>`;

  return `
    <div class="expense-item ${e.settled ? 'is-settled' : ''}" data-id="${e.id}">
      <div class="expense-top">
        <div class="expense-cat-icon"><span class="material-icons-round">${catIcon(e.category)}</span></div>
        <div class="expense-info">
          <div class="expense-desc">${escHtml(e.description)}</div>
          <div class="expense-meta">${fmtDate(e.date)} · ${escHtml(e.category)}${e.notes ? ' · ' + escHtml(e.notes) : ''}</div>
        </div>
        <div class="expense-right">
          <div class="expense-amount">${fmtRs(e.amount)}</div>
          <div class="expense-per">${fmtRs(e.perPerson)} / person</div>
        </div>
      </div>
      <div class="expense-bottom">
        <div class="split-badges">${splitBadges}</div>
        ${statusBadge}
        <div class="expense-actions">
          ${settleBtn}
          <button class="action-btn delete-btn" onclick="deleteExpense('${e.id}')" title="Delete"><span class="material-icons-round">delete</span></button>
        </div>
      </div>
    </div>`;
}

/* ── Settlement Render ───────────────────────────── */
function renderSettlement() {
  const sett = calcSettlement();
  const others = PEOPLE.filter(p => p !== 'Manu');

  // Owed TO Manu
  document.getElementById('owedToManu').innerHTML = others.map(person => {
    const amt = sett[person].owesToManu;
    return `
      <div class="settle-card">
        <div class="settle-avatar ${AVATAR_CLASS[person]}">${person[0]}</div>
        <div class="settle-info">
          <div class="settle-person">${person}</div>
          <div class="settle-detail">owes Manu</div>
        </div>
        <div class="settle-amount ${amt > 0 ? 'amount-green' : 'amount-zero'}">${fmtRs(amt)}</div>
      </div>`;
  }).join('');

  // Manu owes
  document.getElementById('manuOwes').innerHTML = others.map(person => {
    const amt = sett[person].manuOwes;
    return `
      <div class="settle-card">
        <div class="settle-avatar ${AVATAR_CLASS[person]}">${person[0]}</div>
        <div class="settle-info">
          <div class="settle-person">${person}</div>
          <div class="settle-detail">Manu owes ${person}</div>
        </div>
        <div class="settle-amount ${amt > 0 ? 'amount-red' : 'amount-zero'}">${fmtRs(amt)}</div>
      </div>`;
  }).join('');

  // Net
  document.getElementById('netSummary').innerHTML = others.map(person => {
    const net = sett[person].owesToManu - sett[person].manuOwes;
    let tag, cls;
    if (net > 0.01)      { tag = '← Gets'; cls = 'tag-gets amount-green'; }
    else if (net < -0.01){ tag = '→ Owes'; cls = 'tag-owes amount-red'; }
    else                  { tag = 'Clear';  cls = 'tag-settled amount-zero'; }
    return `
      <div class="net-row">
        <div class="net-person">${person}</div>
        <span class="net-tag ${cls.split(' ')[0]}">${tag}</span>
        <div class="net-amount ${cls.split(' ')[1]}">${fmtRs(Math.abs(net))}</div>
      </div>`;
  }).join('');
}

/* ── Add Expense ─────────────────────────────────── */
function openAddModal() {
  // Reset form
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('f-date').value     = today;
  document.getElementById('f-desc').value     = '';
  document.getElementById('f-amount').value   = '';
  document.getElementById('f-notes').value    = '';

  // Paid by — default Manu
  document.querySelectorAll('.person-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.person === 'Manu');
  });

  // Split — default all
  document.querySelectorAll('#splitChecks input').forEach(cb => { cb.checked = true; });

  updateSplitPreview();
  openModal('modalOverlay');
  setTimeout(() => document.getElementById('f-desc').focus(), 300);
}

function updateSplitPreview() {
  const amtVal  = parseFloat(document.getElementById('f-amount').value) || 0;
  const checked = [...document.querySelectorAll('#splitChecks input:checked')].map(cb => cb.value);
  const count   = checked.length;
  const per     = count > 0 ? amtVal / count : 0;
  const preview = document.getElementById('splitPreview');
  if (count === 0) {
    preview.textContent = '⚠️  Select at least one person for the split';
  } else {
    preview.textContent = amtVal > 0
      ? `Split among ${count} people → ${fmtRs(per)} each`
      : `Split among ${count} people`;
  }
}

async function submitExpense() {
  const date     = document.getElementById('f-date').value;
  const desc     = document.getElementById('f-desc').value.trim();
  const category = document.getElementById('f-category').value;
  const amount   = parseFloat(document.getElementById('f-amount').value);
  const notes    = document.getElementById('f-notes').value.trim();

  const paidByBtn = document.querySelector('.person-chip.active');
  const paidBy    = paidByBtn ? paidByBtn.dataset.person : 'Manu';

  const splitList = [...document.querySelectorAll('#splitChecks input:checked')].map(cb => cb.value);

  if (!date)           { showToast('⚠️  Please enter a date.'); return; }
  if (!desc)           { showToast('⚠️  Please enter a description.'); return; }
  if (!amount || amount <= 0) { showToast('⚠️  Please enter a valid amount.'); return; }
  if (splitList.length === 0) { showToast('⚠️  Select at least one person for the split.'); return; }

  const expense = {
    id: uuid(),
    date, description: desc, category, amount,
    paidBy,
    split: splitList,
    splitCount: splitList.length,
    perPerson: amount / splitList.length,
    settled: false,
    notes,
    createdAt: new Date().toISOString()
  };

  state.expenses.push(expense);
  localSave();
  closeModal('modalOverlay');
  renderAll();
  showToast(`✅ Expense added! ${fmtRs(expense.perPerson)} per person`);
  await ghSave();
}

/* ── Mark Settled / Delete ───────────────────────── */
async function toggleSettle(id, settled) {
  const e = state.expenses.find(x => x.id === id);
  if (!e) return;
  e.settled = settled;
  localSave();
  renderAll();
  showToast(settled ? '✅ Marked as settled!' : '↩️ Marked as unsettled');
  await ghSave();
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  state.expenses = state.expenses.filter(e => e.id !== id);
  localSave();
  renderAll();
  showToast('🗑️ Expense deleted');
  await ghSave();
}

/* ── Settings ────────────────────────────────────── */
function openSettingsModal() {
  document.getElementById('s-owner').value = state.config.owner;
  document.getElementById('s-repo').value  = state.config.repo;
  document.getElementById('s-token').value = state.config.token;
  document.getElementById('settingsStatus').classList.add('hidden');
  openModal('settingsOverlay');
}

async function testConnection() {
  const owner = document.getElementById('s-owner').value.trim();
  const repo  = document.getElementById('s-repo').value.trim();
  const token = document.getElementById('s-token').value.trim();
  const statusEl = document.getElementById('settingsStatus');

  if (!owner || !repo || !token) {
    statusEl.textContent = '⚠️  Fill in all fields first.';
    statusEl.className = 'settings-status error';
    statusEl.classList.remove('hidden');
    return;
  }

  statusEl.textContent = 'Testing…';
  statusEl.className = 'settings-status';
  statusEl.classList.remove('hidden');

  try {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (res.ok) {
      const data = await res.json();
      statusEl.textContent = `✅ Connected! Repo: ${data.full_name}`;
      statusEl.className = 'settings-status success';
    } else {
      statusEl.textContent = `❌ Error ${res.status} — check token/repo name`;
      statusEl.className = 'settings-status error';
    }
  } catch {
    statusEl.textContent = '❌ Network error — check your connection';
    statusEl.className = 'settings-status error';
  }
}

async function saveSettings() {
  state.config.owner = document.getElementById('s-owner').value.trim();
  state.config.repo  = document.getElementById('s-repo').value.trim();
  state.config.token = document.getElementById('s-token').value.trim();
  configSave();
  closeModal('settingsOverlay');
  showToast('⚙️ Settings saved! Syncing…');
  await ghLoad();
  renderAll();
}

/* ── Modal helpers ───────────────────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

/* ── Render All ──────────────────────────────────── */
function renderAll() {
  renderDashboard();
  renderExpenses();
  renderSettlement();
}

/* ── Tab Navigation ──────────────────────────────── */
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const section = document.getElementById(`tab-${tab}`);
  if (section) section.classList.add('active');
  const btn = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
}

/* ── HTML Escape ─────────────────────────────────── */
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Populate Selects ────────────────────────────── */
function populateSelects() {
  const catSelect = document.getElementById('f-category');
  catSelect.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  catSelect.value = 'Food & Dining';

  const catFilter = document.getElementById('categoryFilter');
  catFilter.innerHTML = '<option value="">All Categories</option>' +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
}

/* ── Init ────────────────────────────────────────── */
async function init() {
  configLoad();
  localLoad();
  populateSelects();

  // Tab nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // FAB
  document.getElementById('fabBtn').addEventListener('click', openAddModal);

  // Add Expense Modal
  document.getElementById('closeModal').addEventListener('click',   () => closeModal('modalOverlay'));
  document.getElementById('cancelExpense').addEventListener('click', () => closeModal('modalOverlay'));
  document.getElementById('submitExpense').addEventListener('click', submitExpense);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('modalOverlay');
  });

  // Paid By chips
  document.getElementById('paidByChips').addEventListener('click', e => {
    const chip = e.target.closest('.person-chip');
    if (!chip) return;
    document.querySelectorAll('.person-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });

  // Split checkboxes & amount → update preview
  document.getElementById('splitChecks').addEventListener('change', updateSplitPreview);
  document.getElementById('f-amount').addEventListener('input', updateSplitPreview);

  // Settings Modal
  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
  document.getElementById('closeSettings').addEventListener('click',  () => closeModal('settingsOverlay'));
  document.getElementById('cancelSettings').addEventListener('click', () => closeModal('settingsOverlay'));
  document.getElementById('testConnection').addEventListener('click', testConnection);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('settingsOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('settingsOverlay');
  });

  // Sync button
  document.getElementById('syncBtn').addEventListener('click', async () => {
    await ghLoad();
    renderAll();
  });

  // Filters
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filterStatus = chip.dataset.filter;
      renderExpenses();
    });
  });
  document.getElementById('categoryFilter').addEventListener('change', e => {
    state.filterCategory = e.target.value;
    renderExpenses();
  });

  // Initial render with local data
  renderAll();

  // Then try GitHub
  if (state.config.owner && state.config.repo && state.config.token) {
    await ghLoad();
    renderAll();
  } else {
    setSyncStatus('⚙️ Set up GitHub in Settings');
    showToast('👋 Welcome! Tap ⚙️ Settings to connect GitHub.');
  }
}

document.addEventListener('DOMContentLoaded', init);

// Expose to HTML onclick
window.toggleSettle   = toggleSettle;
window.deleteExpense  = deleteExpense;
