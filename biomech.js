// ═══════════════════════════════════════════════════
//  BIOMECHANICAL ANALYSIS ENGINE
//  Rule-based joint angle comparison + feedback
// ═══════════════════════════════════════════════════

class BiomechAnalyzer {

  // Evaluate detected angles against pose thresholds
  evaluate(detectedAngles, targetPose) {
    const thresholds = targetPose.angles;
    const results    = {};
    let   totalScore = 0;
    let   count      = 0;

    for (const [joint, threshold] of Object.entries(thresholds)) {
      const detected = detectedAngles[joint];
      if (detected === null || detected === undefined) {
        results[joint] = { status: 'undetected', score: 0, message: `${threshold.label}: not visible` };
        totalScore += 0;
        count++;
        continue;
      }

      const { min, max, label } = threshold;
      const mid   = (min + max) / 2;
      const range = (max - min) / 2;
      const diff  = Math.abs(detected - mid);
      const score = Math.max(0, 1 - diff / (range + 30));

      let status, message, direction;

      if (detected < min) {
        direction = detected < min - 20 ? 'significantly' : 'slightly';
        status  = detected < min - 20 ? 'error' : 'warning';
        message = `${label}: ${direction} too bent (${detected}° — target ${min}°–${max}°)`;
      } else if (detected > max) {
        direction = detected > max + 20 ? 'significantly' : 'slightly';
        status  = detected > max + 20 ? 'error' : 'warning';
        message = `${label}: ${direction} too straight (${detected}° — target ${min}°–${max}°)`;
      } else {
        status  = 'good';
        message = `${label}: correct (${detected}°) ✓`;
      }

      results[joint] = { status, score: Math.round(score * 100), detected, min, max, label, message };
      totalScore += score;
      count++;
    }

    const overallScore = count > 0 ? Math.round((totalScore / count) * 100) : 0;
    return { joints: results, overallScore };
  }

  // Generate prioritized feedback messages
  generateFeedback(evaluation, targetPose) {
    const msgs = { errors: [], warnings: [], good: [] };

    for (const [, result] of Object.entries(evaluation.joints)) {
      if      (result.status === 'error')   msgs.errors.push(result.message);
      else if (result.status === 'warning') msgs.warnings.push(result.message);
      else if (result.status === 'good')    msgs.good.push(result.message);
    }

    const score = evaluation.overallScore;
    let   overall, category;

    if      (score >= 90) { overall = '🌟 Excellent! Perfect form!';       category = 'excellent'; }
    else if (score >= 75) { overall = '✅ Good posture! Minor adjustments needed.'; category = 'good'; }
    else if (score >= 55) { overall = '⚠️ Work in progress. Follow corrections below.'; category = 'medium'; }
    else                  { overall = '❌ Significant corrections needed.'; category = 'poor'; }

    // Voice message (concise)
    const voiceMsg = this._buildVoiceMessage(msgs, score, targetPose.name);

    return { ...msgs, overall, category, score, voiceMsg, tips: targetPose.tips };
  }

  _buildVoiceMessage(msgs, score, poseName) {
    if (score >= 90) return `Great ${poseName}! Hold this position.`;
    if (msgs.errors.length > 0) {
      // Extract joint name from message
      const first = msgs.errors[0].split(':')[0].replace(/left|right/gi, s => s).trim();
      return `Adjust your ${first}. ${msgs.errors.length > 1 ? `${msgs.errors.length - 1} more corrections needed.` : ''}`;
    }
    if (msgs.warnings.length > 0) {
      return `Almost there. Fine-tune your ${msgs.warnings[0].split(':')[0].trim()}.`;
    }
    return `Correct ${poseName} posture. Score: ${score} percent.`;
  }

  // Compute accuracy percentage with smooth interpolation
  computeAccuracy(detectedAngles, targetPose) {
    const eval_ = this.evaluate(detectedAngles, targetPose);
    return eval_.overallScore;
  }
}

const biomech = new BiomechAnalyzer();
