// ═══════════════════════════════════════════════════
//  HISTORY TRACKING — localStorage based
// ═══════════════════════════════════════════════════

const HISTORY_KEY = 'yogavision_history';

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(records) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

function addRecord(record) {
  const hist = getHistory();
  hist.unshift({ ...record, id: Date.now() });
  saveHistory(hist.slice(0, 100)); // Keep last 100
}

function renderHistory() {
  const hist = getHistory();
  const container = document.getElementById('historyContent');
  const chartWrap = document.getElementById('chartWrap');

  if (hist.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <h3 style="margin-bottom:0.5rem; font-family:'Playfair Display',serif;">No Sessions Yet</h3>
        <p>Complete a practice session and click "Save Session" to track your progress.</p>
      </div>`;
    chartWrap.style.display = 'none';
    return;
  }

  // Stats summary
  const avgScore   = Math.round(hist.reduce((s, r) => s + r.bestScore, 0) / hist.length);
  const totalReps  = hist.reduce((s, r) => s + (r.reps || 0), 0);
  const totalTime  = hist.reduce((s, r) => s + (r.duration || 0), 0);

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem;">
      <div class="panel-card" style="text-align:center; padding:1.5rem;">
        <div style="font-family:'Playfair Display',serif; font-size:2rem; font-weight:900; color:var(--sage-dark);">${hist.length}</div>
        <div style="font-size:0.85rem; color:var(--mid-grey);">Total Sessions</div>
      </div>
      <div class="panel-card" style="text-align:center; padding:1.5rem;">
        <div style="font-family:'Playfair Display',serif; font-size:2rem; font-weight:900; color:var(--terracotta);">${avgScore}%</div>
        <div style="font-size:0.85rem; color:var(--mid-grey);">Avg Best Score</div>
      </div>
      <div class="panel-card" style="text-align:center; padding:1.5rem;">
        <div style="font-family:'Playfair Display',serif; font-size:2rem; font-weight:900; color:var(--gold);">${totalReps}</div>
        <div style="font-size:0.85rem; color:var(--mid-grey);">Total Reps</div>
      </div>
    </div>
    <table class="history-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Date & Time</th>
          <th>Pose Practiced</th>
          <th>Duration</th>
          <th>Reps</th>
          <th>Best Score</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${hist.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${new Date(r.id).toLocaleString()}</td>
            <td>${r.pose || '—'}</td>
            <td>${formatDuration(r.duration || 0)}</td>
            <td>${r.reps || 0}</td>
            <td><span class="score-pill ${scoreClass(r.bestScore)}">${r.bestScore}%</span></td>
            <td><button onclick="deleteRecord(${r.id})" style="background:none;border:none;cursor:pointer;font-size:1rem;" title="Delete">🗑️</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:0.75rem; display:flex; justify-content:flex-end;">
      <button onclick="clearHistory()" class="ctrl-btn danger" style="font-size:0.82rem; padding:0.5rem 1rem;">🗑️ Clear All History</button>
    </div>
  `;

  // Chart
  chartWrap.style.display = 'block';
  drawAccuracyChart(hist.slice(0, 10).reverse());
}

function scoreClass(score) {
  if (score >= 80) return 'score-high';
  if (score >= 55) return 'score-mid';
  return 'score-low';
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function deleteRecord(id) {
  const hist = getHistory().filter(r => r.id !== id);
  saveHistory(hist);
  renderHistory();
}

function clearHistory() {
  if (confirm('Delete all session history?')) {
    saveHistory([]);
    renderHistory();
    showToast('History cleared');
  }
}

function drawAccuracyChart(records) {
  const canvas = document.getElementById('accuracyChart');
  const ctx    = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth  || 800;
  canvas.height = 180;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pad    = { t: 20, r: 20, b: 40, l: 50 };
  const w      = canvas.width  - pad.l - pad.r;
  const h      = canvas.height - pad.t - pad.b;
  const n      = records.length;
  if (n < 2) return;

  const scores = records.map(r => r.bestScore);
  const maxS   = 100;

  // Grid lines
  ctx.strokeStyle = '#e8e4db';
  ctx.lineWidth   = 1;
  [0, 25, 50, 75, 100].forEach(v => {
    const y = pad.t + h - (v / maxS) * h;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.stroke();
    ctx.fillStyle = '#9b9b9b';
    ctx.font = '11px DM Sans, sans-serif';
    ctx.fillText(v + '%', 5, y + 4);
  });

  // Area fill
  ctx.beginPath();
  scores.forEach((s, i) => {
    const x = pad.l + (i / (n - 1)) * w;
    const y = pad.t + h - (s / maxS) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(122,158,126,0.15)';
  ctx.fill();

  // Line
  ctx.beginPath();
  scores.forEach((s, i) => {
    const x = pad.l + (i / (n - 1)) * w;
    const y = pad.t + h - (s / maxS) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#7a9e7e';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // Points
  scores.forEach((s, i) => {
    const x = pad.l + (i / (n - 1)) * w;
    const y = pad.t + h - (s / maxS) * h;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle   = '#7a9e7e';
    ctx.strokeStyle = 'white';
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 11px DM Sans, sans-serif';
    ctx.fillText(s + '%', x - 12, y - 10);

    // X label
    const label = (records[i]?.pose || '').substring(0, 8);
    ctx.fillStyle = '#9b9b9b';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.fillText(label, x - label.length * 3, pad.t + h + 20);
  });
}
