// ═══════════════════════════════════════════════════
//  MAIN APPLICATION — State & UI Controller
// ═══════════════════════════════════════════════════

// ── App State ──
const state = {
  currentPage:    'home',
  targetPoseId:   'mountain',
  reps:           0,
  sessionSeconds: 0,
  sessionInterval:null,
  bestScore:      0,
  voiceEnabled:   true,
  lastVoiceTime:  0,
  voiceInterval:  4000,   // ms between voice announcements
  lastAccuracy:   0,
};

// ── Navigation ──
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.textContent.toLowerCase().includes(id === 'home' ? '🏠' : id === 'analyze' ? '📷' : id === 'history' ? '📊' : 'ℹ️')) {
      t.classList.add('active');
    }
  });
  // Simpler nav matching
  const tabs = document.querySelectorAll('.nav-tab');
  const map  = { home: 0, analyze: 1, history: 2, about: 3 };
  tabs.forEach(t => t.classList.remove('active'));
  if (tabs[map[id]]) tabs[map[id]].classList.add('active');

  if (id === 'history') renderHistory();
  state.currentPage = id;
}

// ── Pose Gallery (Home) ──
function renderPoseGallery() {
  const grid = document.getElementById('poseGallery');
  if (!grid) return;
  grid.innerHTML = POSES.map(pose => `
    <div class="pose-card" onclick="selectAndAnalyze('${pose.id}')">
      <span class="pose-icon">${pose.emoji}</span>
      <div class="pose-name">${pose.name}</div>
      <div class="pose-sanskrit">${pose.sanskrit}</div>
      <div class="pose-diff diff-${pose.difficulty}">${pose.difficulty}</div>
    </div>
  `).join('');
}

function selectAndAnalyze(poseId) {
  state.targetPoseId = poseId;
  showPage('analyze');
  updatePoseSelector();
}

// ── Pose Selector (Analyze page) ──
function renderPoseSelector() {
  const grid = document.getElementById('poseSelectorGrid');
  if (!grid) return;
  grid.innerHTML = POSES.map(pose => `
    <button class="pose-select-btn ${pose.id === state.targetPoseId ? 'active' : ''}"
      onclick="setTargetPose('${pose.id}')">
      ${pose.emoji} ${pose.name}
    </button>
  `).join('');
}

function setTargetPose(id) {
  state.targetPoseId = id;
  state.bestScore    = 0;
  updatePoseSelector();
  clearFeedback();
  showToast(`Target: ${POSES.find(p => p.id === id)?.name}`);
}

function updatePoseSelector() {
  document.querySelectorAll('.pose-select-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().startsWith(POSES.find(p => p.id === state.targetPoseId)?.emoji));
  });
  renderPoseSelector(); // re-render to update active state properly
}

function getCurrentTargetPose() {
  return POSES.find(p => p.id === state.targetPoseId) || POSES[0];
}

// ── Session Timer ──
function sessionStart() {
  state.sessionSeconds = 0;
  state.bestScore      = 0;
  state.reps           = 0;
  document.getElementById('repCount').textContent   = '0';
  document.getElementById('frameCount').textContent = '0';
  state.sessionInterval = setInterval(() => {
    state.sessionSeconds++;
    const m = Math.floor(state.sessionSeconds / 60).toString().padStart(2, '0');
    const s = (state.sessionSeconds % 60).toString().padStart(2, '0');
    document.getElementById('sessionTimer').textContent = `${m}:${s}`;
  }, 1000);
}

function sessionStop() {
  clearInterval(state.sessionInterval);
}

// ── Rep Counter ──
function addRep() {
  state.reps++;
  document.getElementById('repCount').textContent = state.reps;
}
function removeRep() {
  if (state.reps > 0) {
    state.reps--;
    document.getElementById('repCount').textContent = state.reps;
  }
}

// ── Save Session ──
function saveSession() {
  const pose    = getCurrentTargetPose();
  const record  = {
    pose:      pose.name,
    poseId:    pose.id,
    duration:  state.sessionSeconds,
    reps:      state.reps,
    bestScore: state.bestScore,
  };
  addRecord(record);
  showToast(`Session saved! Best: ${state.bestScore}%`, 'success');
}

// ── Voice Feedback ──
function toggleVoice(el) {
  state.voiceEnabled = el.checked;
  if (!el.checked && window.speechSynthesis) window.speechSynthesis.cancel();
}

function speak(text) {
  if (!state.voiceEnabled) return;
  const now = Date.now();
  if (now - state.lastVoiceTime < state.voiceInterval) return;
  state.lastVoiceTime = now;

  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate   = 0.95;
  utterance.pitch  = 1.05;
  utterance.volume = 0.85;
  window.speechSynthesis.speak(utterance);
}

// ── UI Update (called every frame) ──
function updateUI(evaluation, feedback, angles, targetPose, mlpResult) {
  const score = evaluation.overallScore;
  if (score > state.bestScore) state.bestScore = score;

  // Accuracy ring
  updateAccuracyRing(score);

  // Detected pose (MLP output)
  const conf = Math.round(mlpResult.confidence * 100);
  document.getElementById('detectedPose').textContent =
    `${mlpResult.poseName} (${conf}%)`;
  document.getElementById('bestScore').textContent = state.bestScore + '%';

  // Joint angles display
  updateAngleDisplay(angles, targetPose);

  // Feedback panel
  updateFeedbackPanel(feedback);

  // Voice
  speak(feedback.voiceMsg);
}

function updateAccuracyRing(score) {
  // Smooth
  state.lastAccuracy = state.lastAccuracy * 0.8 + score * 0.2;
  const s = Math.round(state.lastAccuracy);

  const circumference = 2 * Math.PI * 42; // ≈ 264
  const offset = circumference - (s / 100) * circumference;
  const circle = document.getElementById('accuracyCircle');
  if (!circle) return;

  circle.style.strokeDashoffset = offset;
  circle.style.stroke = s >= 80 ? '#27ae60' : s >= 55 ? '#f39c12' : '#e74c3c';
  document.getElementById('accuracyPct').textContent  = s + '%';

  const label = s >= 90 ? '🌟 Excellent!'
              : s >= 75 ? '✅ Good'
              : s >= 55 ? '⚠️ Adjust'
              : '❌ Needs work';
  document.getElementById('accuracyLabel').textContent = label;
}

function updateAngleDisplay(angles, targetPose) {
  const container = document.getElementById('angleDisplay');
  const thresholds = targetPose.angles;

  container.innerHTML = Object.entries(angles)
    .filter(([k]) => thresholds[k])
    .map(([key, val]) => {
      if (val === null || val === undefined) {
        return `<div class="angle-row">
          <span class="angle-label">${thresholds[key]?.label || key}</span>
          <div class="angle-bar-wrap"><div class="angle-bar" style="width:0%"></div></div>
          <span class="angle-val" style="color:var(--mid-grey)">—</span>
        </div>`;
      }
      const { min, max } = thresholds[key];
      const pct  = Math.min(100, Math.max(0, ((val - 0) / 185) * 100));
      const inRange = val >= min && val <= max;
      const color = inRange ? 'var(--sage)' : (Math.abs(val - (min + max) / 2) < 30 ? 'var(--gold)' : 'var(--terracotta)');
      return `<div class="angle-row">
        <span class="angle-label">${thresholds[key].label}</span>
        <div class="angle-bar-wrap"><div class="angle-bar" style="width:${pct}%; background:${color};"></div></div>
        <span class="angle-val">${val}°</span>
      </div>`;
    }).join('') || '<div style="color:var(--mid-grey); font-size:0.85rem; text-align:center;">Detecting pose...</div>';
}

function updateFeedbackPanel(feedback) {
  const panel = document.getElementById('feedbackPanel');
  let html = `<div class="feedback-box ${feedback.category === 'excellent' ? '' : feedback.category === 'good' ? '' : feedback.category === 'medium' ? 'warning' : 'error'}">
    <div class="feedback-label">Overall</div>
    <div class="feedback-text">${feedback.overall}</div>
  </div>`;

  if (feedback.errors.length > 0) {
    html += `<div class="feedback-box error">
      <div class="feedback-label">❌ Fix These</div>
      <div class="feedback-text">${feedback.errors.slice(0, 3).join('<br>')}</div>
    </div>`;
  }

  if (feedback.warnings.length > 0) {
    html += `<div class="feedback-box warning">
      <div class="feedback-label">⚠️ Adjust</div>
      <div class="feedback-text">${feedback.warnings.slice(0, 2).join('<br>')}</div>
    </div>`;
  }

  if (feedback.good.length > 0) {
    html += `<div class="feedback-box">
      <div class="feedback-label">✅ Correct</div>
      <div class="feedback-text">${feedback.good.slice(0, 3).join('<br>')}</div>
    </div>`;
  }

  // Tips
  html += `<div class="feedback-box info" style="margin-top:0.5rem;">
    <div class="feedback-label">💡 Pose Tips</div>
    <div class="feedback-text">${getCurrentTargetPose().tips.map(t => '• ' + t).join('<br>')}</div>
  </div>`;

  panel.innerHTML = html;
}

function clearFeedback() {
  state.lastAccuracy = 0;
  updateAccuracyRing(0);
  document.getElementById('feedbackPanel').innerHTML = '<div style="color:var(--mid-grey); font-size:0.85rem; text-align:center; padding:1rem 0;">Feedback will appear here</div>';
  document.getElementById('angleDisplay').innerHTML  = '<div style="color:var(--mid-grey); font-size:0.85rem; text-align:center;">Waiting for pose detection...</div>';
  document.getElementById('detectedPose').textContent = '—';
}

// ── Toast Notifications ──
function showToast(message, type = 'info') {
  const wrap  = document.getElementById('toastWrap');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = type === 'success' ? '#27ae60' : type === 'error' ? '#c0392b' : '#2c2c2c';
  toast.textContent = message;
  wrap.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  renderPoseGallery();
  renderPoseSelector();
  showPage('home');
});
