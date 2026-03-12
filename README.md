# 🧘 YogaVision AI

**Real-time AI-powered yoga pose detection and correction using your webcam.**

YogaVision AI analyzes your body in real-time, compares your joint angles against expert-defined pose targets, and gives instant audio + visual feedback to help you perfect your form — no equipment, no subscription, runs entirely in the browser.

---

## 🎥 Demo

> Start your camera → Select a pose → Get live feedback on your form

![YogaVision AI Demo](./screenshots/demo.png)

---

## ✨ Features

- **15 Yoga Poses** — Beginner to advanced (Mountain, Warrior I & II, Tree, Downward Dog, Lotus, and more)
- **Real-time Pose Detection** — Powered by Google's MoveNet Lightning model via TensorFlow.js
- **MLP Classifier** — Custom Multi-Layer Perceptron (34→64→32→15) that identifies which pose you're performing
- **Biomechanical Analysis** — Compares 8 joint angles per frame against pose-specific thresholds
- **Live Voice Feedback** — Web Speech API announces corrections as you practice
- **Skeleton Overlay** — Draws keypoints and body connections over your webcam feed
- **Session Tracking** — Timer, rep counter, best score, and session history saved locally
- **Progress Chart** — Visual accuracy trend chart across your last 10 sessions
- **Snapshot Export** — Download a PNG of your pose with the skeleton overlay
- **100% Client-Side** — No backend, no data sent to any server, works offline after load

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Pose Detection | [MoveNet Lightning](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection) (TensorFlow.js) |
| ML Classifier | Custom MLP (vanilla JavaScript) |
| Biomechanics | Rule-based joint angle engine |
| Voice | Web Speech API |
| Storage | localStorage |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Canvas | HTML5 Canvas API |

---

## 📁 Project Structure

```
yogavision-ai/
│
├── index.html          # Main app shell, layout, and styles
├── app.js              # State management, UI controller, navigation
├── camera.js           # Webcam access, MoveNet detection loop, skeleton drawing
├── mlp.js              # MLP classifier + joint angle extraction
├── biomech.js          # Biomechanical analysis engine and feedback generator
├── poses.js            # Database of 15 yoga poses with angle thresholds and tips
└── history.js          # Session storage, history rendering, accuracy chart
```

---

## 🚀 Getting Started

### Option 1 — Open Directly (Easiest)
Just open `index.html` in any modern browser. No build step required.

```bash
# Clone the repo
git clone https://github.com/your-username/yogavision-ai.git
cd yogavision-ai

# Open in browser
open index.html       # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

### Option 2 — Local Dev Server (Recommended for Camera)
Some browsers block camera access on `file://` URLs. Use a local server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```

Then visit `http://localhost:8080`

---

## 🎮 How to Use

1. **Choose a Pose** — Browse the pose gallery on the Home tab and click any pose
2. **Start Camera** — Click **Start Camera** on the Analyze tab and allow webcam access
3. **Practice** — Stand in frame and attempt the selected pose
4. **Read Feedback** — Check the accuracy ring, joint angle bars, and feedback panel
5. **Listen** — Voice coaching will guide your corrections automatically
6. **Save Session** — Click **Save Session** when done to log your best score
7. **Track Progress** — Visit the History tab to see your improvement over time

---

## 🤖 How the AI Works

### 1. Pose Detection (MoveNet)
MoveNet estimates 17 body keypoints (nose, shoulders, elbows, hips, knees, ankles, etc.) from your webcam at up to 30 FPS.

### 2. Joint Angle Extraction
8 key joint angles are computed per frame using the dot-product formula on 3-point vectors:
- Left/Right Knee, Hip, Elbow, Shoulder

### 3. MLP Classification
A Multi-Layer Perceptron (34 inputs → 64 → 32 → 15 outputs) takes normalized keypoint coordinates and outputs a probability for each of the 15 poses.

### 4. Biomechanical Boosting
Raw MLP probabilities are combined with a biomechanical match score (60% weight) computed by comparing detected angles to each pose's defined thresholds. Final classification = **40% MLP + 60% biomechanics**.

### 5. Feedback Generation
Each joint is scored independently. Errors (>20° off), warnings (slightly off), and good angles are categorized and displayed with correction messages.

---

## 🧘 Supported Poses

| Pose | Sanskrit | Level |
|---|---|---|
| Mountain Pose | Tadasana | Beginner |
| Warrior I | Virabhadrasana I | Intermediate |
| Warrior II | Virabhadrasana II | Intermediate |
| Tree Pose | Vrksasana | Beginner |
| Downward Dog | Adho Mukha Svanasana | Beginner |
| Cobra Pose | Bhujangasana | Beginner |
| Child's Pose | Balasana | Beginner |
| Triangle Pose | Trikonasana | Intermediate |
| Plank Pose | Phalakasana | Beginner |
| Seated Forward Bend | Paschimottanasana | Beginner |
| Bridge Pose | Setu Bandha Sarvangasana | Beginner |
| Pigeon Pose | Kapotasana | Advanced |
| Chair Pose | Utkatasana | Intermediate |
| Eagle Pose | Garudasana | Advanced |
| Lotus Pose | Padmasana | Advanced |

---

## 📊 Accuracy Scoring

| Score | Label | Meaning |
|---|---|---|
| 90–100% | 🌟 Excellent | Near-perfect form |
| 75–89% | ✅ Good | Minor adjustments needed |
| 55–74% | ⚠️ Adjust | Several corrections needed |
| 0–54% | ❌ Needs Work | Significant corrections needed |

---

## 🔒 Privacy

All processing happens **locally in your browser**. Your webcam feed is never uploaded, streamed, or stored anywhere. Session history is saved only to your device's localStorage.

---

## 🌐 Browser Compatibility

| Browser | Support |
|---|---|
| Chrome 90+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Firefox 90+ | ✅ Full |
| Safari 15+ | ⚠️ Partial (voice may vary) |
| Mobile Chrome | ✅ Supported |

---

## 🛣️ Roadmap

- [ ] Load pre-trained MLP weights from a real yoga dataset
- [ ] Side-view camera support
- [ ] Guided session sequences (e.g., Sun Salutation flow)
- [ ] PWA / offline support
- [ ] Mobile app version (React Native)
- [ ] Export session data as PDF report

---

## 🙏 Acknowledgements

- [TensorFlow.js](https://www.tensorflow.org/js) — ML in the browser
- [MoveNet](https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html) — Fast, accurate pose detection
- [Google Fonts](https://fonts.google.com) — Typography

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

> Built with ❤️ using AI-powered development tools
