import { useState, useEffect } from "react";

// ── Storage ───────────────────────────────────────────────────────────────
function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

// ── Challenge data (logic untouched) ─────────────────────────────────────
const CHALLENGES = {
  B2B: [
    { tag: "Prioritization", color: "#8B7CF6", icon: "⚖️",
      hint: { framework: "RICE or MoSCoW", steps: ["Name your framework and justify the choice","Score each backlog item — don't just list them","Address the compliance deadline and churn risk explicitly","End with a ranked list and what gets cut if capacity runs out"], watch: "Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag: "Metrics", color: "#38BDF8", icon: "📊",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you observe in the data first","Generate 2-3 root cause hypotheses","Identify what data is missing","Define 2-3 metrics you'd add to the dashboard"], watch: "Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag: "Stakeholder", color: "#34D399", icon: "🤝",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder truly wants beneath their stated position","Spot any shared goals or constraints","Make a concrete decision — don't sit on the fence","State who gets which message and how"], watch: "PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "Strategy", color: "#A78BFA", icon: "🎯",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 sentences","Name 2-3 strategic options","Pick one and defend it with business reasoning","Explicitly state what you would NOT do and why"], watch: "Every strategy needs a trade-off. What are you giving up?" },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "Execution", color: "#FB923C", icon: "⚡",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What is most critical in the next 2 hours?","Who do you talk to and in what order?","What do you cut or defer?","How do you run the retrospective after?"], watch: "Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  B2C: [
    { tag: "Prioritization", color: "#8B7CF6", icon: "⚖️",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework and why it fits B2C","Consider user volume, engagement, and retention for each item","Factor in competitor timing and seasonal context","Give a final ranked order and what gets cut"], watch: "B2C is about user love at scale. Delight is a valid business metric." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "Metrics", color: "#38BDF8", icon: "📊",
      hint: { framework: "AARRR Funnel", steps: ["Map each metric to its funnel stage","Identify the biggest drop-off point","Form 2-3 hypotheses for the drop-off","Pick one metric to fix first and defend the choice"], watch: "Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag: "Growth", color: "#34D399", icon: "🚀",
      hint: { framework: "Growth Loops", steps: ["Identify which growth loop is broken or missing","Pick ONE lever to pull — don't try to fix everything","Define how you'd measure if your fix worked","Estimate the impact in user numbers or revenue"], watch: "Growth is a system. Fix the loop. Don't just add features." },
      prompt: `B2C growth challenge for a junior PM. Consumer app growth has plateaued with fake metrics showing the problem and limited engineering capacity. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag: "User Research", color: "#A78BFA", icon: "🔍",
      hint: { framework: "Jobs To Be Done", steps: ["Identify the job each user hires the product to do","Find the gap between expectation and experience","Separate genuine pain points from nice-to-haves","Recommend what to build and what to ignore"], watch: "Focus on what users DO, not what they SAY. Behaviour beats words." },
      prompt: `B2C user research challenge for a junior PM. 3 user types giving conflicting qualitative feedback on the same feature area. Ask: synthesize the feedback and decide what to build. Be concise.` },
    { tag: "Execution", color: "#FB923C", icon: "⚡",
      hint: { framework: "Triage → Communicate → Ship", steps: ["What is breaking user experience RIGHT NOW?","Hotfix immediately or wait for proper fix — pick one and justify","Communicate to users if the issue is visible to them","Define what resolved looks like and how you'll confirm it"], watch: "B2C crises are public. Users tweet. Think about user communication, not just internal teams." },
      prompt: `B2C app execution crisis for a junior PM. Consumer-facing incident with public user impact and social media pressure, engineering says 4 hours to fix. Ask: how does the PM handle this step by step? Be concise.` },
  ]
};

const ASSESS_SYSTEM = `You are a direct PM coach for a junior PM (0-2 years). Be honest, specific, encouraging.

Reply in this EXACT format:

**SCORE**
Structured Thinking: X/10
Business Acumen: X/10
Specificity & Depth: X/10
PM Maturity: X/10
━━━━━━━━━━━━
Overall: X/10

**WHAT YOU DID WELL**
2-3 specific things from their actual answer.

**WHAT WAS WEAK**
1-2 gaps only. Direct but kind.

**ONE THING TO FIX**
Single most impactful improvement. Concrete and learnable.

**COACH'S NOTE**
1-2 sentences. Real encouragement.

---KEY---

**STRONG ANSWER EXAMPLE**
120-word model answer. Show framework applied, structure, specific business reasoning.`;

async function callClaude(system, userMsg) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, userMsg }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.text || "";
}

// ── Global CSS ────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #F7F7F7; font-family: 'Nunito', sans-serif; -webkit-font-smoothing: antialiased; color: #3C3C3C; }
  ::selection { background: rgba(88,204,2,0.25); }
  input, textarea, button, select { font-family: 'Nunito', sans-serif; }
  textarea { outline: none; resize: vertical; }
  input { outline: none; }
  button { cursor: pointer; border: none; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes spin     { to { transform:rotate(360deg); } }
  @keyframes bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes popIn    { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
  @keyframes shake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  @keyframes pulse    { 0%,100%{box-shadow:0 0 0 0 rgba(88,204,2,0.4)} 50%{box-shadow:0 0 0 12px rgba(88,204,2,0)} }

  .fade-up   { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-1 { animation: fadeUp 0.4s 0.06s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-2 { animation: fadeUp 0.4s 0.12s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-3 { animation: fadeUp 0.4s 0.18s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-4 { animation: fadeUp 0.4s 0.24s cubic-bezier(0.16,1,0.3,1) both; }
  .pop-in    { animation: popIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .spinner   { animation: spin 0.75s linear infinite; }

  /* Buttons */
  .btn-green {
    background: #58CC02; color: #fff; border-radius: 14px; padding: 14px 28px;
    font-size: 16px; font-weight: 800; border: none; cursor: pointer;
    box-shadow: 0 4px 0 #4aab00; transition: all 0.12s; letter-spacing: 0.01em;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-green:hover { background: #4cbb00; transform: translateY(-1px); box-shadow: 0 5px 0 #3d9600; }
  .btn-green:active { transform: translateY(2px); box-shadow: 0 2px 0 #4aab00; }

  .btn-outline {
    background: #fff; color: #58CC02; border-radius: 14px; padding: 14px 28px;
    font-size: 16px; font-weight: 800; border: 2px solid #58CC02; cursor: pointer;
    transition: all 0.12s; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-outline:hover { background: #f0fff0; transform: translateY(-1px); }
  .btn-outline:active { transform: translateY(1px); }

  .btn-purple {
    background: #8B7CF6; color: #fff; border-radius: 14px; padding: 14px 28px;
    font-size: 16px; font-weight: 800; border: none; cursor: pointer;
    box-shadow: 0 4px 0 #6d5fd5; transition: all 0.12s;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-purple:hover { background: #7c6cf0; transform: translateY(-1px); box-shadow: 0 5px 0 #5d4fc0; }
  .btn-purple:active { transform: translateY(2px); box-shadow: 0 2px 0 #6d5fd5; }

  .btn-ghost {
    background: transparent; color: #777; border-radius: 12px; padding: 10px 20px;
    font-size: 14px; font-weight: 700; border: 2px solid #e0e0e0; cursor: pointer;
    transition: all 0.12s; display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-ghost:hover { border-color: #bbb; color: #555; background: #f5f5f5; }

  .btn-disabled {
    background: #e5e5e5; color: #aaa; border-radius: 14px; padding: 14px 28px;
    font-size: 16px; font-weight: 800; border: none; cursor: not-allowed;
    display: inline-flex; align-items: center; justify-content: center;
  }

  /* Cards */
  .card {
    background: #fff; border-radius: 20px; padding: 24px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 2px solid #eee;
  }
  .card-hover { transition: all 0.18s; }
  .card-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: #ddd; }

  /* Challenge path nodes */
  .path-node { transition: all 0.18s; }
  .path-node:hover { transform: scale(1.04); }
  .path-node-active { animation: pulse 2s infinite; }

  /* Input */
  .input-field {
    width: 100%; background: #fff; border: 2px solid #e0e0e0; border-radius: 14px;
    padding: 14px 16px; font-size: 15px; color: #3C3C3C; font-family: 'Nunito', sans-serif;
    transition: border 0.15s;
  }
  .input-field:focus { border-color: #58CC02; box-shadow: 0 0 0 3px rgba(88,204,2,0.12); }
  .input-field::placeholder { color: #bbb; }

  /* Textarea */
  .textarea-field {
    width: 100%; background: #fff; border: 2px solid #e0e0e0; border-radius: 14px;
    padding: 14px 16px; font-size: 15px; color: #3C3C3C; font-family: 'Nunito', sans-serif;
    line-height: 1.7; transition: border 0.15s; min-height: 180px;
  }
  .textarea-field:focus { border-color: #58CC02; box-shadow: 0 0 0 3px rgba(88,204,2,0.12); }

  /* Progress bar */
  .xp-bar { height: 14px; background: #e8e8e8; border-radius: 99px; overflow: hidden; }
  .xp-fill { height: 100%; background: linear-gradient(90deg, #58CC02, #89E219); border-radius: 99px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }

  /* Track tabs */
  .track-tab { transition: all 0.15s; cursor: pointer; }
  .track-tab.active { background: #58CC02 !important; color: #fff !important; border-color: #58CC02 !important; }

  /* Answer reveal */
  .key-section { background: linear-gradient(135deg, #f0fff0, #e8f5e8); border: 2px solid #c3e6c3; border-radius: 16px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #f0f0f0; }
  ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 99px; }

  /* Responsive */
  @media (max-width: 640px) {
    .hide-sm { display: none !important; }
    .full-sm { width: 100% !important; }
    .stack-sm { flex-direction: column !important; }
    .px-sm { padding-left: 16px !important; padding-right: 16px !important; }
  }
`;

// ── Markdown renderer ─────────────────────────────────────────────────────
function renderMD(text, isKey = false) {
  return text.trim().split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**"))
      return <p key={i} style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
        color: isKey ? "#2d9c2d" : "#aaa", marginTop: 20, marginBottom: 6 }}>{line.replace(/\*\*/g, "")}</p>;
    if (line.includes("━")) return <div key={i} style={{ height: 2, background: "#f0f0f0", margin: "10px 0" }} />;
    if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: isKey ? "#1a5c1a" : "#555" }}>
      {parts.map((p, j) => p.startsWith("**")
        ? <strong key={j} style={{ color: isKey ? "#2d7a2d" : "#3C3C3C", fontWeight: 700 }}>{p.replace(/\*\*/g, "")}</strong>
        : p)}
    </p>;
  });
}

// ── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ label, score, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score * 10), 300 + delay); return () => clearTimeout(t); }, [score]);
  const color = score >= 7 ? "#58CC02" : score >= 5 ? "#FFC800" : "#FF4B4B";
  const bg    = score >= 7 ? "#e8f9d5" : score >= 5 ? "#fff3cc" : "#ffe0e0";
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "#555", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color, background: bg, padding: "2px 10px", borderRadius: 99 }}>{score}/10</span>
      </div>
      <div className="xp-bar">
        <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.9s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

// ── XP / Progress helpers ─────────────────────────────────────────────────
function XPBar({ value, max }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#58CC02", whiteSpace: "nowrap" }}>⭐ {value} XP</span>
      <div className="xp-bar" style={{ flex: 1 }}>
        <div className="xp-fill" style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>{max}</span>
    </div>
  );
}

// ── Challenge path node ───────────────────────────────────────────────────
function PathNode({ challenge, idx, status, onClick }) {
  // status: 'done' | 'active' | 'locked'
  const isDone   = status === "done";
  const isActive = status === "active";
  const isLocked = status === "locked";

  const bg     = isDone ? "#58CC02" : isActive ? "#fff" : "#e8e8e8";
  const border = isDone ? "#4aab00" : isActive ? "#58CC02" : "#d0d0d0";
  const shadow = isActive ? "0 0 0 4px rgba(88,204,2,0.2), 0 4px 16px rgba(88,204,2,0.25)" : isDone ? "0 4px 12px rgba(88,204,2,0.3)" : "none";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: isLocked ? 0.55 : 1 }}>
      {/* Node circle */}
      <button
        className={`path-node ${isActive ? "path-node-active" : ""}`}
        onClick={isLocked ? undefined : onClick}
        style={{ width: 64, height: 64, borderRadius: "50%", background: bg,
          border: `3px solid ${border}`, cursor: isLocked ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, flexShrink: 0, boxShadow: shadow, transition: "all 0.2s" }}>
        {isDone ? "✅" : isLocked ? "🔒" : challenge.icon}
      </button>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#58CC02" : "#bbb",
          letterSpacing: "0.06em", marginBottom: 3 }}>
          {isActive ? "CURRENT" : isDone ? "COMPLETED" : "LOCKED"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: isLocked ? "#aaa" : "#3C3C3C",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {challenge.tag}
        </div>
        {isDone && <div style={{ fontSize: 12, color: "#58CC02", fontWeight: 700, marginTop: 2 }}>Done ✓</div>}
        {isActive && (
          <button className="btn-green" onClick={onClick}
            style={{ marginTop: 8, padding: "8px 18px", fontSize: 13, borderRadius: 10, boxShadow: "0 3px 0 #4aab00" }}>
            Start →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function PMApp() {
  // ── Auth state ──
  const [screen, setScreen] = useState("login"); // login | home | challenge | result | feedback | thanks
  const [isGuest, setIsGuest] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  // ── Track & challenge state ──
  const [track, setTrack] = useState("B2B");
  const [currentIdx, setCurrentIdx] = useState(null);
  const [challengeText, setChallengeText] = useState("");
  const [pick, setPick] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Result state ──
  const [assessment, setAssessment] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scores, setScores] = useState(null);

  // ── Progress state ──
  const [completedIdxs, setCompletedIdxs] = useState(() => {
    const s = storageGet("pm_completed");
    return s ? JSON.parse(s.value) : { B2B: [], B2C: [] };
  });
  const [totalXP, setTotalXP] = useState(() => {
    const s = storageGet("pm_xp");
    return s ? parseInt(s.value) : 0;
  });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  // ── Guest feedback state ──
  const [fbUseful, setFbUseful] = useState(0);
  const [fbEasy, setFbEasy] = useState("");
  const [fbImprove, setFbImprove] = useState("");
  const [fbSending, setFbSending] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const hR = storageList("pm_session:");
    if (hR?.keys?.length) {
      const s = hR.keys.map(k => { const r = storageGet(k); return r ? JSON.parse(r.value) : null; }).filter(Boolean).reverse();
      setHistory(s.slice(0, 30));
    }
  }, []);

  // ── Auth ──
  function loginFull() {
    if (pwInput.trim() === "Siddhant@0812") {
      storageSet("pm_auth", "true");
      setIsGuest(false);
      setScreen("home");
    } else {
      setPwError(true);
      setPwInput("");
    }
  }

  function loginGuest() {
    setIsGuest(true);
    setScreen("home");
  }

  // ── Challenge flow ──
  async function openChallenge(idx) {
    if (isGuest && idx > 0) return; // guests only get first challenge
    const chosen = CHALLENGES[track][idx];
    setPick(chosen); setCurrentIdx(idx); setHintOpen(false);
    setLoading(true); setError("");
    setChallengeText(""); setAnswer("");
    setScreen("challenge");
    try {
      const text = await callClaude(`You are a ${track} PM coach. Generate a concise, realistic, specific challenge.`, chosen.prompt);
      setChallengeText(text);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function submitAnswer() {
    if (answer.trim().length < 60) return;
    setLoading(true);
    try {
      const result = await callClaude(ASSESS_SYSTEM,
        `TRACK: ${track}\nTYPE: ${pick?.tag}\n\nCHALLENGE:\n${challengeText}\n\nANSWER:\n${answer}`);
      const idx = result.indexOf("---KEY---");
      setAssessment(idx > -1 ? result.slice(0, idx) : result);
      setAnswerKey(idx > -1 ? result.slice(idx + 9) : "");
      setShowKey(false);
      const m = l => { const r = new RegExp(l + "[:\\s]+(\\d+)/10", "i"); const x = result.match(r); return x ? parseInt(x[1]) : 5; };
      const s = { structured: m("Structured Thinking"), business: m("Business Acumen"), depth: m("Specificity"), maturity: m("PM Maturity"), overall: m("Overall") };
      setScores(s);
      saveProgress(s);
      setScreen("result");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  function saveProgress(s) {
    // Save session
    storageSet("pm_last_tag", pick?.tag);
    storageSet(`pm_session:${Date.now()}`, JSON.stringify({ date: today, tag: pick?.tag, track, scores: s }));
    // Mark completed
    if (!isGuest) {
      const updated = { ...completedIdxs, [track]: [...new Set([...completedIdxs[track], currentIdx])] };
      setCompletedIdxs(updated);
      storageSet("pm_completed", JSON.stringify(updated));
      // XP
      const gained = 10 + (s.overall * 5);
      const newXP = totalXP + gained;
      setTotalXP(newXP);
      storageSet("pm_xp", String(newXP));
    }
    const ns = { date: today, tag: pick?.tag, track, scores: s };
    setHistory(prev => [ns, ...prev].slice(0, 30));
  }

  async function submitGuestFeedback() {
    if (fbUseful === 0) return;
    setFbSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Guest", rating: fbUseful, easyToUse: fbEasy, improve: fbImprove, sessions: 1 })
      });
    } catch (_) {}
    setFbSending(false);
    setScreen("thanks");
  }

  // ── Status helper ──
  function getStatus(idx) {
    if (isGuest) return idx === 0 ? "active" : "locked";
    if (completedIdxs[track].includes(idx)) return "done";
    const firstIncomplete = CHALLENGES[track].findIndex((_, i) => !completedIdxs[track].includes(i));
    return idx === firstIncomplete ? "active" : idx < firstIncomplete ? "done" : "locked";
  }

  const challenges = CHALLENGES[track];
  const doneCount  = completedIdxs[track].length;
  const pct        = Math.round((doneCount / challenges.length) * 100);

  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: LOGIN
  // ─────────────────────────────────────────────────────────────────────
  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{ background: "#58CC02", padding: "14px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>📈</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>PM Training</span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          {/* Hero */}
          <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#3C3C3C", marginBottom: 10, lineHeight: 1.2 }}>
              Product Management<br/>Learning Challenges
            </h1>
            <p style={{ fontSize: 16, color: "#777", lineHeight: 1.6 }}>
              Real PM scenarios. AI coaching. Level up your skills.
            </p>
          </div>

          {/* Full access */}
          <div className="card fade-up-1" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🔐</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#3C3C3C" }}>Full Access</span>
            </div>
            <input className="input-field" type="password" value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && loginFull()}
              placeholder="Enter access code"
              style={{ marginBottom: 10 }}
            />
            {pwError && (
              <p style={{ fontSize: 13, color: "#FF4B4B", fontWeight: 700, marginBottom: 10, textAlign: "center" }}>
                ❌ Incorrect code — try again
              </p>
            )}
            <button className="btn-green full-sm" onClick={loginFull} style={{ width: "100%" }}>
              Start Learning →
            </button>
          </div>

          {/* Divider */}
          <div className="fade-up-2" style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#eee" }} />
            <span style={{ fontSize: 13, color: "#bbb", fontWeight: 700 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#eee" }} />
          </div>

          {/* Guest */}
          <div className="fade-up-2" style={{ textAlign: "center" }}>
            <button className="btn-outline full-sm" onClick={loginGuest} style={{ width: "100%" }}>
              👋 Continue as Guest
            </button>
            <p style={{ fontSize: 12, color: "#bbb", marginTop: 10, fontWeight: 600 }}>
              1 free challenge · No sign-up needed
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: HOME
  // ─────────────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background: "#58CC02", padding: "0 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "14px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📈</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>PM Training</span>
            {isGuest && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.25)",
                padding: "3px 10px", borderRadius: 99 }}>GUEST</span>
            )}
          </div>
          <button className="btn-ghost" onClick={() => { storageSet("pm_auth","false"); setScreen("login"); }}
            style={{ fontSize: 12, padding: "6px 14px", borderColor: "rgba(255,255,255,0.4)", color: "#fff",
              background: "rgba(255,255,255,0.15)" }}>
            {isGuest ? "Exit" : "Sign Out"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Greeting */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#3C3C3C", marginBottom: 6 }}>
            {isGuest ? "Welcome, Guest! 👋" : "Good day, Siddhant! 👋"}
          </h1>
          {isGuest ? (
            <p style={{ fontSize: 15, color: "#777" }}>Try 1 free challenge to see how it works.</p>
          ) : (
            <XPBar value={totalXP} max={Math.max(totalXP + 50, 100)} />
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fff0f0", border: "2px solid #ffcaca", borderRadius: 14,
            padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#c00", fontWeight: 600 }}>
            ⚠ {error}
          </div>
        )}

        {/* Track tabs */}
        {!isGuest && (
          <div className="fade-up-1" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {["B2B", "B2C"].map(t => (
              <button key={t} className={`track-tab btn-ghost ${track === t ? "active" : ""}`}
                onClick={() => setTrack(t)}
                style={{ flex: 1, justifyContent: "center", borderRadius: 12, fontSize: 15, fontWeight: 800,
                  background: track === t ? "#58CC02" : "#fff",
                  color: track === t ? "#fff" : "#777",
                  borderColor: track === t ? "#58CC02" : "#e0e0e0" }}>
                {t === "B2B" ? "🏢 B2B" : "📱 B2C"}
              </button>
            ))}
          </div>
        )}

        {/* Progress card */}
        {!isGuest && (
          <div className="card fade-up-1" style={{ marginBottom: 20, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#3C3C3C" }}>
                {track} Progress
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#58CC02" }}>
                {doneCount}/{challenges.length} done
              </span>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              {[
                { label: "Completed", value: doneCount, icon: "✅" },
                { label: "Remaining", value: challenges.length - doneCount, icon: "🎯" },
                { label: "Total XP", value: totalXP, icon: "⭐" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#3C3C3C" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Challenge path */}
        <div className="card fade-up-2" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>🗺️</span>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#3C3C3C" }}>
              {isGuest ? "Your Free Challenge" : `${track} Learning Path`}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(isGuest ? challenges.slice(0, 1) : challenges).map((ch, idx) => (
              <div key={idx}>
                {idx > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "-10px 0 -10px 30px" }}>
                    <div style={{ width: 2, height: 20, background: getStatus(idx) === "locked" ? "#e0e0e0" : "#58CC02" }} />
                  </div>
                )}
                <PathNode challenge={ch} idx={idx} status={getStatus(idx)} onClick={() => openChallenge(idx)} />
              </div>
            ))}
          </div>

          {isGuest && (
            <div style={{ marginTop: 24, padding: "16px", background: "#f0fff0",
              border: "2px dashed #58CC02", borderRadius: 14, textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#2d7a2d" }}>
                🔓 Full access unlocks all 10 challenges + AI scoring
              </p>
            </div>
          )}
        </div>

        {/* Recent history */}
        {!isGuest && history.length > 0 && (
          <div className="card fade-up-3">
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#3C3C3C", marginBottom: 14 }}>📋 Recent Sessions</h3>
            {history.slice(0, 5).map((s, i) => {
              const c = CHALLENGES.B2B.concat(CHALLENGES.B2C).find(x => x.tag === s.tag)?.color || "#888";
              const sc = s.scores?.overall;
              const scColor = sc >= 7 ? "#58CC02" : sc >= 5 ? "#FFC800" : "#FF4B4B";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                  borderBottom: i < Math.min(history.length - 1, 4) ? "1px solid #f5f5f5" : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: c + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0 }}>
                    {CHALLENGES.B2B.concat(CHALLENGES.B2C).find(x => x.tag === s.tag)?.icon || "📋"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3C3C3C" }}>{s.tag}</div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>{s.track} · {s.date}</div>
                  </div>
                  {sc != null && (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: scColor }}>{sc}</span>
                      <span style={{ fontSize: 12, color: "#ccc" }}>/10</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: CHALLENGE
  // ─────────────────────────────────────────────────────────────────────
  if (screen === "challenge") return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "2px solid #f0f0f0", padding: "0 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "12px 0",
          display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={() => setScreen("home")}
            style={{ padding: "8px 14px", fontSize: 13 }}>
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em" }}>CHALLENGE</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#3C3C3C" }}>
              {pick?.icon} {pick?.tag}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#bbb", fontWeight: 600 }}>{track}</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Loading */}
        {loading && !challengeText && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner" style={{ width: 40, height: 40, border: "3px solid #e8e8e8",
              borderTopColor: "#58CC02", borderRadius: "50%", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, color: "#aaa", fontWeight: 600 }}>Generating your challenge…</p>
          </div>
        )}

        {challengeText && (
          <>
            {/* Challenge card */}
            <div className="card fade-up" style={{ marginBottom: 16, borderColor: pick?.color + "40",
              background: "linear-gradient(135deg, #fff, #fafffe)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: pick?.color,
                  boxShadow: `0 0 8px ${pick?.color}` }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: pick?.color, letterSpacing: "0.08em" }}>
                  YOUR CHALLENGE
                </span>
              </div>
              <p style={{ fontSize: 15, color: "#444", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{challengeText}</p>
            </div>

            {/* Hint */}
            {pick?.hint && (
              <div className="card fade-up-1" style={{ marginBottom: 16, borderColor: "#FFC800", background: "#fffef5" }}>
                <button onClick={() => setHintOpen(o => !o)}
                  style={{ background: "none", width: "100%", display: "flex",
                    alignItems: "center", justifyContent: "space-between", padding: 0, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💡</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#B8860B" }}>Framework Hint</span>
                    <span style={{ fontSize: 12, color: "#999", background: "#fff5cc",
                      padding: "2px 10px", borderRadius: 99, fontWeight: 600 }}>{pick.hint.framework}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#aaa", fontWeight: 700 }}>{hintOpen ? "▲" : "▼"}</span>
                </button>
                {hintOpen && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #ffe88a" }}>
                    {pick.hint.steps.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, padding: "4px 0" }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: "#FFC800",
                          background: "#fffae0", width: 24, height: 24, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</span>
                        <span style={{ fontSize: 14, color: "#555", lineHeight: 1.65 }}>{s}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff3cc",
                      borderRadius: 10, borderLeft: "3px solid #FFC800", fontSize: 13, color: "#7a5c00", fontWeight: 600 }}>
                      ⚠ {pick.hint.watch}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Answer */}
            <div className="card fade-up-2" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#3C3C3C" }}>✍️ Your Answer</h3>
                <span style={{ fontSize: 12, fontWeight: 700,
                  color: answer.length < 60 ? "#FF4B4B" : "#58CC02" }}>
                  {answer.length < 60 ? `${60 - answer.length} more to go` : `${answer.length} chars ✓`}
                </span>
              </div>
              <textarea className="textarea-field" value={answer} onChange={e => setAnswer(e.target.value)}
                placeholder="Name a framework. Apply it. Be specific about trade-offs and your reasoning..." />

              {error && (
                <div style={{ fontSize: 13, color: "#FF4B4B", fontWeight: 700, marginTop: 8 }}>⚠ {error}</div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }} className="stack-sm">
                <button className="btn-ghost full-sm" onClick={() => setScreen("home")}>Cancel</button>
                {loading ? (
                  <button className="btn-disabled full-sm">Submitting…</button>
                ) : (
                  <button
                    className={answer.length >= 60 ? "btn-green full-sm" : "btn-disabled full-sm"}
                    onClick={answer.length >= 60 ? submitAnswer : undefined}
                    disabled={answer.length < 60}>
                    Submit for Assessment →
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: RESULT
  // ─────────────────────────────────────────────────────────────────────
  if (screen === "result") return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "2px solid #f0f0f0", padding: "0 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "12px 0",
          display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#3C3C3C" }}>Your Assessment</span>
          </div>
          {pick && <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto", fontWeight: 600 }}>
            {track} · {pick.tag}
          </span>}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Score hero */}
        {scores && (() => {
          const sc = scores.overall;
          const color  = sc >= 7 ? "#58CC02" : sc >= 5 ? "#FFC800" : "#FF4B4B";
          const bg     = sc >= 7 ? "linear-gradient(135deg,#f0fff0,#e4f9d5)" : sc >= 5 ? "linear-gradient(135deg,#fffcf0,#fff3cc)" : "linear-gradient(135deg,#fff0f0,#ffe0e0)";
          const label  = sc >= 7 ? "Great work! 🎉" : sc >= 5 ? "Good effort! 📈" : "Keep practising 💪";
          return (
            <div className="card pop-in" style={{ marginBottom: 16, background: bg,
              borderColor: color + "40", textAlign: "center", padding: "32px 24px" }}>
              <div style={{ fontSize: 72, fontWeight: 900, color, letterSpacing: "-0.04em",
                lineHeight: 1, marginBottom: 6 }}>{sc}</div>
              <div style={{ fontSize: 15, color: "#999", marginBottom: 14 }}>out of 10</div>
              <div style={{ display: "inline-block", background: color + "18",
                borderRadius: 99, padding: "8px 20px" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color }}>{label}</span>
              </div>
              {!isGuest && (
                <div style={{ marginTop: 14, fontSize: 14, color: "#777", fontWeight: 600 }}>
                  +{10 + (sc * 5)} XP earned 🌟
                </div>
              )}
            </div>
          );
        })()}

        {/* Score breakdown */}
        {scores && (
          <div className="card fade-up-1" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#3C3C3C", marginBottom: 14 }}>📉 Score Breakdown</h3>
            <ScoreBar label="Structured Thinking" score={scores.structured} delay={0} />
            <ScoreBar label="Business Acumen"     score={scores.business}   delay={80} />
            <ScoreBar label="Specificity & Depth"  score={scores.depth}      delay={160} />
            <ScoreBar label="PM Maturity"          score={scores.maturity}   delay={240} />
          </div>
        )}

        {/* Assessment */}
        <div className="card fade-up-2" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#3C3C3C", marginBottom: 14 }}>🧠 Coach Feedback</h3>
          {renderMD(assessment)}
        </div>

        {/* Answer key */}
        {answerKey && (
          <div className="fade-up-3" style={{ marginBottom: 24 }}>
            <button onClick={() => setShowKey(o => !o)}
              style={{ width: "100%", background: showKey ? "#e8f9d5" : "#f5f5f5",
                border: `2px solid ${showKey ? "#58CC02" : "#ddd"}`, borderRadius: 16,
                padding: "14px 20px", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                transition: "all 0.2s", fontFamily: "'Nunito', sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔑</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: showKey ? "#2d7a2d" : "#555" }}>
                  Model Answer
                </span>
                <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>tap to reveal</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#aaa" }}>{showKey ? "▲" : "▼"}</span>
            </button>
            {showKey && (
              <div className="key-section pop-in" style={{ padding: "20px", marginTop: 8 }}>
                {renderMD(answerKey, true)}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }} className="stack-sm fade-up-4">
          <button className="btn-ghost full-sm" onClick={() => setScreen("home")}>← Back to Path</button>
          {isGuest ? (
            <button className="btn-green full-sm" style={{ flex: 1 }}
              onClick={() => setScreen("feedback")}>
              Give Feedback →
            </button>
          ) : (
            <button className="btn-green full-sm" style={{ flex: 1 }}
              onClick={() => { setScreen("home"); setTimeout(() => openChallenge(
                Math.min(currentIdx + 1, challenges.length - 1)
              ), 50); }}>
              Next Challenge →
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: GUEST FEEDBACK
  // ─────────────────────────────────────────────────────────────────────
  if (screen === "feedback") return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7", display: "flex", alignItems: "center", padding: "32px 20px" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>

        <div className="fade-up" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#3C3C3C", marginBottom: 8 }}>Quick Feedback</h2>
          <p style={{ fontSize: 15, color: "#777" }}>Takes 60 seconds. Helps us improve.</p>
        </div>

        <div className="card fade-up-1" style={{ marginBottom: 16 }}>
          {/* Q1 */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#3C3C3C", marginBottom: 12 }}>
              1. How useful was this challenge?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setFbUseful(n)}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `2px solid ${fbUseful >= n ? "#58CC02" : "#e0e0e0"}`,
                    background: fbUseful >= n ? "#58CC02" : "#fff", color: fbUseful >= n ? "#fff" : "#bbb",
                    fontSize: 16, fontWeight: 800, cursor: "pointer", transition: "all 0.12s" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600 }}>Not useful</span>
              <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600 }}>Very useful</span>
            </div>
          </div>

          {/* Q2 */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#3C3C3C", marginBottom: 10 }}>
              2. Was the interface easy to use?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {["Yes", "No"].map(v => (
                <button key={v} onClick={() => setFbEasy(v)}
                  style={{ flex: 1, padding: "12px", borderRadius: 12,
                    border: `2px solid ${fbEasy === v ? "#58CC02" : "#e0e0e0"}`,
                    background: fbEasy === v ? "#f0fff0" : "#fff",
                    color: fbEasy === v ? "#2d7a2d" : "#777",
                    fontSize: 15, fontWeight: 800, cursor: "pointer", transition: "all 0.12s" }}>
                  {v === "Yes" ? "👍 Yes" : "👎 No"}
                </button>
              ))}
            </div>
          </div>

          {/* Q3 */}
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#3C3C3C", marginBottom: 10 }}>
              3. What could be improved? <span style={{ color: "#bbb", fontWeight: 600 }}>(optional)</span>
            </p>
            <textarea className="textarea-field" value={fbImprove} onChange={e => setFbImprove(e.target.value)}
              placeholder="Any suggestions are welcome…" style={{ minHeight: 100 }} />
          </div>
        </div>

        <div className="fade-up-2" style={{ display: "flex", gap: 10 }} className="stack-sm">
          <button className="btn-ghost full-sm" onClick={() => setScreen("result")}>← Back</button>
          <button
            className={fbUseful > 0 ? "btn-green full-sm" : "btn-disabled full-sm"}
            style={{ flex: 1 }} disabled={fbUseful === 0 || fbSending}
            onClick={fbUseful > 0 ? submitGuestFeedback : undefined}>
            {fbSending ? "Sending…" : "Submit Feedback →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: THANKS
  // ─────────────────────────────────────────────────────────────────────
  if (screen === "thanks") return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "32px 20px" }}>
      <style>{CSS}</style>
      <div className="card pop-in" style={{ maxWidth: 420, width: "100%", textAlign: "center", padding: "48px 32px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "#3C3C3C", marginBottom: 12 }}>
          Thanks for trying it!
        </h2>
        <p style={{ fontSize: 15, color: "#777", lineHeight: 1.7, marginBottom: 28 }}>
          Thanks for trying the app.<br/>
          <strong style={{ color: "#3C3C3C" }}>Full access requires an access code.</strong><br/>
          Contact Siddhant on LinkedIn to get yours.
        </p>
        <button className="btn-green" style={{ width: "100%" }} onClick={() => {
          setScreen("login"); setIsGuest(false); setPwInput(""); setPwError(false);
        }}>
          Back to Home
        </button>
      </div>
    </div>
  );

  return null;
}
