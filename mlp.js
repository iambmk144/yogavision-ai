// ═══════════════════════════════════════════════════
//  MLP CLASSIFIER — Multi-Layer Perceptron
//  Architecture: 34 → 64 → 32 → 15
//  Activation: ReLU (hidden), Softmax (output)
//  This simulates an MLP trained on yoga keypoint data
// ═══════════════════════════════════════════════════

class MLPClassifier {
  constructor() {
    this.inputSize  = 34;   // 17 keypoints × (x, y)
    this.hidden1    = 64;
    this.hidden2    = 32;
    this.outputSize = POSES.length;
    this.initialized = false;

    // Initialize random weights (in a real system these
    // would be pre-trained weights loaded from a JSON file)
    this._initWeights();
    this.initialized = true;
    console.log('[MLP] Initialized: 34→64→32→' + this.outputSize);
  }

  _initWeights() {
    // Seed-based pseudo-random for reproducibility
    const rand = this._seededRandom(42);
    const he = (n) => Math.sqrt(2 / n); // He initialization

    this.W1 = this._matrix(this.hidden1, this.inputSize,  () => rand() * he(this.inputSize));
    this.b1 = new Array(this.hidden1).fill(0);
    this.W2 = this._matrix(this.hidden2, this.hidden1,   () => rand() * he(this.hidden1));
    this.b2 = new Array(this.hidden2).fill(0);
    this.W3 = this._matrix(this.outputSize, this.hidden2, () => rand() * he(this.hidden2));
    this.b3 = new Array(this.outputSize).fill(0);
  }

  _seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff - 0.5;
    };
  }

  _matrix(rows, cols, fillFn) {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, fillFn)
    );
  }

  _relu(x) { return Math.max(0, x); }

  _softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum  = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  _matVec(W, x, b) {
    return W.map((row, i) =>
      row.reduce((sum, w, j) => sum + w * x[j], 0) + b[i]
    );
  }

  // Normalize keypoints to [0,1] range relative to body bbox
  _normalize(keypoints) {
    const valid = keypoints.filter(kp => kp.score > 0.1);
    if (valid.length < 5) return keypoints.flatMap(kp => [kp.x, kp.y]);

    const xs = valid.map(kp => kp.x);
    const ys = valid.map(kp => kp.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    return keypoints.flatMap(kp => [
      (kp.x - minX) / rangeX,
      (kp.y - minY) / rangeY
    ]);
  }

  // Forward pass
  forward(keypoints) {
    const x  = this._normalize(keypoints);
    const h1 = this._matVec(this.W1, x, this.b1).map(v => this._relu(v));
    const h2 = this._matVec(this.W2, h1, this.b2).map(v => this._relu(v));
    const logits = this._matVec(this.W3, h2, this.b3);
    return this._softmax(logits);
  }

  // Predict pose from keypoints — uses angle features to boost
  predict(keypoints, jointAngles) {
    // Get raw MLP probabilities
    const probs = this.forward(keypoints);

    // Biomechanical boosting: adjust probabilities based on
    // how well the detected joint angles match each pose's thresholds
    const boosted = probs.map((p, i) => {
      const pose = POSES[i];
      const matchScore = this._angleMatchScore(jointAngles, pose.angles);
      // Weighted combination: 40% MLP + 60% biomechanical match
      return p * 0.4 + matchScore * 0.6;
    });

    // Normalize boosted scores
    const total = boosted.reduce((a, b) => a + b, 0);
    const normalized = boosted.map(b => b / total);

    const maxIdx = normalized.indexOf(Math.max(...normalized));
    return {
      poseId:     POSES[maxIdx].id,
      poseName:   POSES[maxIdx].name,
      confidence: normalized[maxIdx],
      allScores:  normalized
    };
  }

  _angleMatchScore(angles, thresholds) {
    const keys = Object.keys(thresholds);
    if (keys.length === 0) return 0.5;

    let total = 0;
    keys.forEach(key => {
      if (angles[key] === undefined) { total += 0.5; return; }
      const { min, max } = thresholds[key];
      const mid = (min + max) / 2;
      const range = (max - min) / 2;
      const diff  = Math.abs(angles[key] - mid);
      // Gaussian-like score
      total += Math.exp(-(diff * diff) / (2 * range * range + 1));
    });

    return total / keys.length;
  }
}

// ═══════════════════════════════════════════════════
//  JOINT ANGLE COMPUTATION
//  Uses dot-product / inverse cosine of 3-point vectors
// ═══════════════════════════════════════════════════

function computeAngle(A, B, C) {
  // Angle at point B between rays BA and BC
  if (!A || !B || !C) return null;
  const BAx = A.x - B.x, BAy = A.y - B.y;
  const BCx = C.x - B.x, BCy = C.y - B.y;
  const dot  = BAx * BCx + BAy * BCy;
  const magBA = Math.sqrt(BAx * BAx + BAy * BAy);
  const magBC = Math.sqrt(BCx * BCx + BCy * BCy);
  if (magBA === 0 || magBC === 0) return null;
  const cosAngle = Math.min(1, Math.max(-1, dot / (magBA * magBC)));
  return Math.round(Math.acos(cosAngle) * (180 / Math.PI));
}

function extractJointAngles(keypoints) {
  const kp = {};
  keypoints.forEach(p => { kp[p.name] = p; });

  const get = (name) => {
    const p = kp[name];
    return p && p.score > 0.2 ? p : null;
  };

  return {
    leftKnee:      computeAngle(get('left_hip'),      get('left_knee'),      get('left_ankle')),
    rightKnee:     computeAngle(get('right_hip'),     get('right_knee'),     get('right_ankle')),
    leftHip:       computeAngle(get('left_shoulder'), get('left_hip'),       get('left_knee')),
    rightHip:      computeAngle(get('right_shoulder'),get('right_hip'),      get('right_knee')),
    leftElbow:     computeAngle(get('left_shoulder'), get('left_elbow'),     get('left_wrist')),
    rightElbow:    computeAngle(get('right_shoulder'),get('right_elbow'),    get('right_wrist')),
    leftShoulder:  computeAngle(get('left_elbow'),    get('left_shoulder'),  get('left_hip')),
    rightShoulder: computeAngle(get('right_elbow'),   get('right_shoulder'), get('right_hip')),
  };
}

// Global MLP instance
const mlp = new MLPClassifier();
