// ═══════════════════════════════════════════════════
//  CAMERA + MOVENET POSE DETECTION ENGINE
// ═══════════════════════════════════════════════════

let detector    = null;
let stream      = null;
let rafId       = null;
let isRunning   = false;
let frameCount_ = 0;
let lastFpsTime = Date.now();
let fpsSamples  = [];

const CONNECTIONS = [
  ['nose','left_eye'],['nose','right_eye'],
  ['left_eye','left_ear'],['right_eye','right_ear'],
  ['left_shoulder','right_shoulder'],
  ['left_shoulder','left_elbow'],['left_elbow','left_wrist'],
  ['right_shoulder','right_elbow'],['right_elbow','right_wrist'],
  ['left_shoulder','left_hip'],['right_shoulder','right_hip'],
  ['left_hip','right_hip'],
  ['left_hip','left_knee'],['left_knee','left_ankle'],
  ['right_hip','right_knee'],['right_knee','right_ankle']
];

async function loadDetector() {
  if (detector) return detector;
  showToast('Loading MoveNet model...');
  try {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      }
    );
    showToast('MoveNet loaded ✓', 'success');
    return detector;
  } catch (e) {
    console.error('MoveNet load error:', e);
    showToast('Model load failed — check console', 'error');
    return null;
  }
}

async function startCamera() {
  const video   = document.getElementById('webcam');
  const overlay = document.getElementById('cameraOverlay');
  const startBtn= document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const dot     = document.getElementById('statusDot');
  const txt     = document.getElementById('statusText');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false
    });
    video.srcObject = stream;
    await new Promise(r => video.onloadeddata = r);

    // Setup canvas
    const canvas = document.getElementById('poseCanvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    overlay.classList.add('hidden');
    startBtn.style.display = 'none';
    stopBtn.style.display  = 'inline-block';
    dot.classList.add('active');
    txt.textContent = 'Live';

    isRunning  = true;
    sessionStart();
    await loadDetector();
    if (detector) detectionLoop(video, canvas);

  } catch (err) {
    console.error('Camera error:', err);
    showToast('Camera access denied. Check browser permissions.', 'error');
  }
}

function stopCamera() {
  isRunning = false;
  if (rafId)    cancelAnimationFrame(rafId);
  if (stream)   stream.getTracks().forEach(t => t.stop());

  const video   = document.getElementById('webcam');
  const overlay = document.getElementById('cameraOverlay');
  const startBtn= document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const dot     = document.getElementById('statusDot');
  const txt     = document.getElementById('statusText');

  video.srcObject = null;
  overlay.classList.remove('hidden');
  startBtn.style.display  = 'inline-block';
  stopBtn.style.display   = 'none';
  dot.classList.remove('active');
  txt.textContent = 'Camera Off';

  sessionStop();
}

async function detectionLoop(video, canvas) {
  const ctx = canvas.getContext('2d');

  async function frame() {
    if (!isRunning) return;
    if (video.readyState < 2) { rafId = requestAnimationFrame(frame); return; }

    // FPS
    frameCount_++;
    const now = Date.now();
    if (now - lastFpsTime > 500) {
      const fps = Math.round(frameCount_ / ((now - lastFpsTime) / 1000));
      fpsSamples.push(fps);
      document.getElementById('fpsDisplay').textContent = fps + ' FPS';
      document.getElementById('frameCount').textContent = parseInt(document.getElementById('frameCount').textContent || 0) + frameCount_;
      frameCount_ = 0;
      lastFpsTime = now;
    }

    // Detect
    let poses = [];
    try {
      poses = await detector.estimatePoses(video);
    } catch (e) { /* skip frame */ }

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(-1, 1); // Mirror
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (poses.length > 0) {
      const pose = poses[0];
      const kps  = pose.keypoints;

      if (document.getElementById('skeletonToggle').checked) {
        drawSkeleton(ctx, kps, canvas.width);
      }

      // Analysis
      const angles     = extractJointAngles(kps);
      const targetPose = getCurrentTargetPose();
      const evaluation = biomech.evaluate(angles, targetPose);
      const feedback   = biomech.generateFeedback(evaluation, targetPose);

      // Classify with MLP
      const mlpResult = mlp.predict(kps, angles);

      updateUI(evaluation, feedback, angles, targetPose, mlpResult);
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
}

function drawSkeleton(ctx, keypoints, canvasWidth) {
  const kpMap = {};
  keypoints.forEach(kp => { kpMap[kp.name] = kp; });

  const mirrorX = (x) => canvasWidth - x;

  // Draw connections
  CONNECTIONS.forEach(([a, b]) => {
    const kpA = kpMap[a], kpB = kpMap[b];
    if (!kpA || !kpB || kpA.score < 0.2 || kpB.score < 0.2) return;
    ctx.beginPath();
    ctx.moveTo(mirrorX(kpA.x), kpA.y);
    ctx.lineTo(mirrorX(kpB.x), kpB.y);
    ctx.strokeStyle = 'rgba(122,158,126,0.85)';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  });

  // Draw keypoints
  keypoints.forEach(kp => {
    if (kp.score < 0.2) return;
    ctx.beginPath();
    ctx.arc(mirrorX(kp.x), kp.y, 5, 0, Math.PI * 2);
    ctx.fillStyle   = kp.score > 0.6 ? '#7a9e7e' : '#c5603a';
    ctx.strokeStyle = 'white';
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
  });
}

async function captureSnapshot() {
  const canvas = document.getElementById('poseCanvas');
  if (!isRunning) { showToast('Start camera first', 'error'); return; }

  const link = document.createElement('a');
  link.download = `yogavision_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Snapshot saved!', 'success');
}
