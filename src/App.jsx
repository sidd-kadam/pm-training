import { useState, useEffect } from "react";

// ── Storage ───────────────────────────────────────────────────────────────
function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

// ── Challenge data (logic untouched) ─────────────────────────────────────
const CHALLENGES = {
  B2B: [
    { tag: "Prioritization", color: "#8B7CF6",
      hint: { framework: "RICE or MoSCoW", steps: ["Name your framework and justify the choice", "Score each backlog item — don't just list them", "Address the compliance deadline and churn risk explicitly", "End with a ranked list and what gets cut if capacity runs out"], watch: "Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag: "Metrics", color: "#38BDF8",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you observe in the data first", "Generate 2-3 root cause hypotheses", "Identify what data is missing", "Define 2-3 metrics you'd add to the dashboard"], watch: "Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag: "Stakeholder", color: "#34D399",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder truly wants beneath their stated position", "Spot any shared goals or constraints", "Make a concrete decision — don't sit on the fence", "State who gets which message and how"], watch: "PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "Strategy", color: "#A78BFA",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 sentences", "Name 2-3 strategic options", "Pick one and defend it with business reasoning", "Explicitly state what you would NOT do and why"], watch: "Every strategy needs a trade-off. What are you giving up?" },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "Execution", color: "#FB923C",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What is most critical in the next 2 hours?", "Who do you talk to and in what order?", "What do you cut or defer?", "How do you run the retrospective after?"], watch: "Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  B2C: [
    { tag: "Prioritization", color: "#8B7CF6",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework and why it fits B2C", "Consider user volume, engagement, and retention for each item", "Factor in competitor timing and seasonal context", "Give a final ranked order and what gets cut"], watch: "B2C is about user love at scale. Delight is a valid business metric." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "Metrics", color: "#38BDF8",
      hint: { framework: "AARRR Funnel", steps: ["Map each metric to its funnel stage", "Identify the biggest drop-off point", "Form 2-3 hypotheses for the drop-off", "Pick one metric to fix first and defend the choice"], watch: "Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag: "Growth", color: "#34D399",
      hint: { framework: "Growth Loops", steps: ["Identify which growth loop is broken or missing", "Pick ONE lever to pull — don't try to fix everything", "Define how you'd measure if your fix worked", "Estimate the impact in user numbers or revenue"], watch: "Growth is a system. Fix the loop. Don't just add features." },
      prompt: `B2C growth challenge for a junior PM. Consumer app growth has plateaued with fake metrics showing the problem and limited engineering capacity. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag: "User Research", color: "#A78BFA",
      hint: { framework: "Jobs To Be Done", steps: ["Identify the job each user hires the product to do", "Find the gap between expectation and experience", "Separate genuine pain points from nice-to-haves", "Recommend what to build and what to ignore"], watch: "Focus on what users DO, not what they SAY. Behaviour beats words." },
      prompt: `B2C user research challenge for a junior PM. 3 user types giving conflicting qualitative feedback on the same feature area. Ask: synthesize the feedback and decide what to build. Be concise.` },
    { tag: "Execution", color: "#FB923C",
      hint: { framework: "Triage → Communicate → Ship", steps: ["What is breaking user experience RIGHT NOW?", "Hotfix immediately or wait for proper fix — pick one and justify", "Communicate to users if the issue is visible to them", "Define what resolved looks like and how you'll confirm it"], watch: "B2C crises are public. Users tweet. Think about user communication, not just internal teams." },
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

// ── Design System ─────────────────────────────────────────────────────────
const DS = {
  // Colors
  bg:        "#0F0F12",
  surface:   "#17171C",
  surfaceEl: "#1E1E26",
  border:    "rgba(255,255,255,0.07)",
  borderHov: "rgba(255,255,255,0.13)",
  primary:   "#8B7CF6",
  primaryDk: "#6D5FD5",
  text:      "#F0F0F4",
  textSec:   "rgba(240,240,244,0.5)",
  textMut:   "rgba(240,240,244,0.28)",
  success:   "#34D399",
  warning:   "#FBBF24",
  danger:    "#F87171",
  // Spacing
  sp: (n) => n * 4 + "px",
  // Radius
  r: { sm: 6, md: 10, lg: 16, xl: 20, full: 999 },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body { background: ${DS.bg}; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; color: ${DS.text}; }
  ::selection { background: rgba(139,124,246,0.35); color: #fff; }
  input, textarea, button { font-family: inherit; }
  textarea { outline: none; resize: vertical; }
  input { outline: none; }
  button { cursor: pointer; border: none; }
  a { color: inherit; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .fade-up   { animation: fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .fade-up-1 { animation: fadeUp 0.45s 0.07s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .fade-up-2 { animation: fadeUp 0.45s 0.14s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .fade-up-3 { animation: fadeUp 0.45s 0.21s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .fade-up-4 { animation: fadeUp 0.45s 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .spinner { animation: spin 0.75s linear infinite; }
  /* Interactive states */
  .btn-primary { background: ${DS.primary}; color: #fff; transition: all 0.15s; }
  .btn-primary:hover { background: ${DS.primaryDk}; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(139,124,246,0.35); }
  .btn-primary:active { transform: translateY(0); box-shadow: none; }
  .btn-ghost { background: transparent; border: 1px solid ${DS.border}; color: ${DS.textSec}; transition: all 0.15s; }
  .btn-ghost:hover { border-color: ${DS.borderHov}; color: ${DS.text}; background: ${DS.surfaceEl}; }
  .card-interactive { transition: border-color 0.15s, background 0.15s; }
  .card-interactive:hover { border-color: rgba(139,124,246,0.25) !important; background: #1B1B23 !important; }
  .track-card { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; }
  .track-card:hover { transform: translateY(-2px); border-color: rgba(139,124,246,0.3) !important; }
  input:focus { border-color: ${DS.primary} !important; box-shadow: 0 0 0 3px rgba(139,124,246,0.12) !important; }
  textarea:focus { border-color: ${DS.primary} !important; box-shadow: 0 0 0 3px rgba(139,124,246,0.12) !important; }
  .hint-row:hover { background: rgba(255,255,255,0.03); border-radius: 6px; }
  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
  /* Mobile */
  @media (max-width: 600px) {
    .hide-mobile { display: none !important; }
    .stack-mobile { flex-direction: column !important; }
    .full-mobile { width: 100% !important; }
  }
`;

// ── Reusable Components ───────────────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: color + "18",
      padding: "3px 10px", borderRadius: DS.r.full, letterSpacing: "0.01em", display: "inline-flex", alignItems: "center" }}>
      {label}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: DS.border, margin: "4px 0" }} />;
}

function ScoreBar({ label, score, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(score * 10), 250 + delay);
    return () => clearTimeout(t);
  }, [score]);
  const color = score >= 7 ? DS.success : score >= 5 ? DS.warning : DS.danger;
  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: DS.textSec, fontWeight: 400 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{score}<span style={{ color: DS.textMut, fontWeight: 400 }}>/10</span></span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: DS.r.full, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: DS.r.full, transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)", opacity: 0.85 }} />
      </div>
    </div>
  );
}

function renderMD(text, isKey = false) {
  return text.trim().split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: isKey ? DS.success : DS.textMut, marginTop: 24, marginBottom: 8 }}>
        {line.replace(/\*\*/g, "")}
      </p>;
    }
    if (line.includes("━")) return <div key={i} style={{ height: 1, background: DS.border, margin: "12px 0" }} />;
    if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{ fontSize: 15, lineHeight: 1.85, color: isKey ? "rgba(52,211,153,0.8)" : DS.textSec }}>
      {parts.map((p, j) => p.startsWith("**")
        ? <strong key={j} style={{ color: isKey ? DS.success : DS.text, fontWeight: 600 }}>{p.replace(/\*\*/g, "")}</strong>
        : p)}
    </p>;
  });
}

// ── App Shell ─────────────────────────────────────────────────────────────
const Page = ({ children, center = false }) => (
  <div style={{ minHeight: "100vh", background: DS.bg, padding: center ? "0 20px" : "0 20px 80px",
    display: center ? "flex" : "block", alignItems: center ? "center" : "initial", justifyContent: center ? "center" : "initial" }}>
    <style>{CSS}</style>
    {children}
  </div>
);

const Container = ({ children, width = 640 }) => (
  <div style={{ maxWidth: width, margin: "0 auto", width: "100%" }}>
    {children}
  </div>
);

const Card = ({ children, style = {}, className = "", onClick }) => (
  <div className={className} onClick={onClick} style={{
    background: DS.surface, border: `1px solid ${DS.border}`,
    borderRadius: DS.r.lg, padding: 24, ...style
  }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    color: DS.textMut, marginBottom: 12 }}>
    {children}
  </p>
);

// ── Main App ──────────────────────────────────────────────────────────────
export default function PMApp() {
  const [phase, setPhase] = useState("home");
  const [trackType, setTrackType] = useState(null);
  const [challenge, setChallenge] = useState("");
  const [pick, setPick] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [assessment, setAssessment] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scores, setScores] = useState(null);
  const [total, setTotal] = useState(0);
  const [highScores, setHighScores] = useState(0);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(() => storageGet("pm_auth")?.value === "true");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  useEffect(() => {
    const hR = storageList("pm_session:");
    if (hR?.keys?.length) {
      const sessions = hR.keys
        .map(k => { const r = storageGet(k); return r ? JSON.parse(r.value) : null; })
        .filter(Boolean).reverse();
      setHistory(sessions.slice(0, 30));
      setTotal(sessions.length);
      setHighScores(sessions.filter(x => x.scores?.overall >= 7).length);
    }
  }, []);

  function checkPassword() {
    if (pwInput.trim() === "Siddhant@0812") {
      storageSet("pm_auth", "true");
      setUnlocked(true);
    } else {
      setPwError(true);
      setPwInput("");
    }
  }

  async function startChallenge(track) {
    setTrackType(track); setPhase("loading"); setError("");
    const pool = CHALLENGES[track];
    const lastR = storageGet("pm_last_tag");
    let p2 = pool.filter(c => c.tag !== lastR?.value);
    if (!p2.length) p2 = pool;
    const chosen = p2[Math.floor(Math.random() * p2.length)];
    setPick(chosen); setHintOpen(false);
    try {
      const text = await callClaude(`You are a ${track} PM coach. Generate a concise, realistic, specific challenge.`, chosen.prompt);
      setChallenge(text); setAnswer(""); setPhase("answering");
    } catch (e) { setError(e.message); setPhase("home"); }
  }

  async function submitAnswer() {
    if (answer.trim().length < 60) return;
    setPhase("loading");
    try {
      const result = await callClaude(ASSESS_SYSTEM, `TRACK: ${trackType}\nTYPE: ${pick?.tag}\n\nCHALLENGE:\n${challenge}\n\nANSWER:\n${answer}`);
      const idx = result.indexOf("---KEY---");
      setAssessment(idx > -1 ? result.slice(0, idx) : result);
      setAnswerKey(idx > -1 ? result.slice(idx + 9) : "");
      setShowKey(false);
      const m = l => { const r = new RegExp(l + "[:\\s]+(\\d+)/10", "i"); const x = result.match(r); return x ? parseInt(x[1]) : 5; };
      const s = { structured: m("Structured Thinking"), business: m("Business Acumen"), depth: m("Specificity"), maturity: m("PM Maturity"), overall: m("Overall") };
      setScores(s); saveSession(s); setPhase("result");
    } catch (e) { setError(e.message); setPhase("answering"); }
  }

  function saveSession(s) {
    storageSet("pm_last_tag", pick?.tag);
    storageSet(`pm_session:${Date.now()}`, JSON.stringify({ date: today, tag: pick?.tag, track: trackType, scores: s }));
    const ns = { date: today, tag: pick?.tag, track: trackType, scores: s };
    setHistory(prev => [ns, ...prev].slice(0, 30));
    setTotal(p => p + 1);
    if (s.overall >= 7) setHighScores(p => p + 1);
  }

  // ── PASSWORD ──────────────────────────────────────────────────────────
  if (!unlocked) return (
    <Page center>
      <Container width={380}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
          {/* Logo mark */}
          <div style={{ width: 52, height: 52, borderRadius: DS.r.lg, background: `linear-gradient(135deg, ${DS.primary}, ${DS.primaryDk})`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
            boxShadow: "0 12px 32px rgba(139,124,246,0.3)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L7.5 9.5L11 13L15 6.5L20 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="5.5" r="2" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: DS.text, marginBottom: 8, letterSpacing: "-0.02em" }}>PM Training</h1>
          <p style={{ fontSize: 14, color: DS.textSec, lineHeight: 1.5 }}>Your personal PM practice space</p>
        </div>

        <div className="fade-up-1">
          <input
            type="password" value={pwInput} autoFocus
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === "Enter" && checkPassword()}
            placeholder="Enter access code"
            style={{ width: "100%", background: DS.surfaceEl, border: `1px solid ${pwError ? DS.danger + "60" : DS.border}`,
              borderRadius: DS.r.md, padding: "14px 16px", fontSize: 15, color: DS.text,
              marginBottom: 12, display: "block", transition: "all 0.15s" }}
          />
          {pwError && (
            <p style={{ fontSize: 13, color: DS.danger, marginBottom: 12, textAlign: "center" }}>
              Incorrect code — try again
            </p>
          )}
          <button className="btn-primary" onClick={checkPassword}
            style={{ width: "100%", padding: "14px", borderRadius: DS.r.md, fontSize: 15, fontWeight: 600 }}>
            Continue
          </button>
        </div>
      </Container>
    </Page>
  );

  // ── LOADING ───────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <Page center>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: 32, height: 32, border: `2.5px solid ${DS.border}`,
          borderTopColor: DS.primary, borderRadius: "50%", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: DS.textSec }}>Preparing your challenge…</p>
      </div>
    </Page>
  );

  // ── HOME ──────────────────────────────────────────────────────────────
  if (phase === "home") return (
    <Page>
      <Container width={680}>
        {/* Top nav */}
        <div className="fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "32px 0 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${DS.primary}, ${DS.primaryDk})`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 17L7.5 9.5L11 13L15 6.5L20 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="20" cy="5.5" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: DS.text }}>PM Training</span>
          </div>
          <span style={{ fontSize: 13, color: DS.textMut }}>{dateLabel}</span>
        </div>

        {/* Hero */}
        <div className="fade-up" style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: DS.text, letterSpacing: "-0.03em",
            lineHeight: 1.15, marginBottom: 10 }}>
            Good day, Siddhant.
          </h1>
          <p style={{ fontSize: 16, color: DS.textSec, lineHeight: 1.6, maxWidth: 440 }}>
            Practice real PM scenarios. Get scored by AI. Ship better products.
          </p>
        </div>

        {error && (
          <div className="fade-up" style={{ background: DS.danger + "12", border: `1px solid ${DS.danger}30`,
            borderRadius: DS.r.md, padding: "12px 16px", marginBottom: 24, fontSize: 14, color: DS.danger }}>
            ⚠ {error}
          </div>
        )}

        {/* Stats */}
        <div className="fade-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { label: "Challenges completed", value: total,      icon: "📚", color: DS.primary },
            { label: "Scored 7 or higher",   value: highScores, icon: "⭐", color: DS.success },
          ].map((s, i) => (
            <Card key={i} style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: s.color, letterSpacing: "-0.04em",
                lineHeight: 1, marginBottom: 6 }}>
                {s.value || 0}
              </div>
              <div style={{ fontSize: 13, color: DS.textSec }}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Track selection */}
        <div className="fade-up-2" style={{ marginBottom: 12 }}>
          <Card style={{ padding: "24px 24px 20px" }}>
            <Label>Choose a track to start</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { t: "B2B", label: "B2B / Enterprise", desc: "Stakeholders, compliance, platform products", color: DS.primary,
                  types: ["Prioritization", "Metrics", "Stakeholder", "Strategy", "Execution"] },
                { t: "B2C", label: "B2C / Consumer", desc: "Growth loops, funnels, user research", color: "#A78BFA",
                  types: ["Prioritization", "Metrics", "Growth", "User Research", "Execution"] },
              ].map(({ t, label, desc, color, types }) => (
                <div key={t} className="track-card" onClick={() => startChallenge(t)}
                  style={{ background: DS.surfaceEl, border: `1px solid ${DS.border}`, borderRadius: DS.r.md,
                    padding: "18px 16px", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <Badge label={t} color={color} />
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7H11M7.5 3.5L11 7L7.5 10.5" stroke={DS.textMut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: DS.text, marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 12, color: DS.textSec, lineHeight: 1.5, marginBottom: 12 }}>{desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {types.map(tp => (
                      <span key={tp} style={{ fontSize: 10, color: DS.textMut, background: "rgba(255,255,255,0.05)",
                        padding: "3px 8px", borderRadius: DS.r.full }}>
                        {tp}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* History */}
        {history.length > 0 ? (
          <div className="fade-up-3">
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px 14px" }}>
                <Label>Recent sessions</Label>
              </div>
              {history.slice(0, 6).map((s, i) => {
                const c = CHALLENGES.B2B.concat(CHALLENGES.B2C).find(x => x.tag === s.tag)?.color || DS.textSec;
                const sc = s.scores?.overall;
                const scColor = sc >= 7 ? DS.success : sc >= 5 ? DS.warning : DS.danger;
                return (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    <div className="card-interactive" style={{ display: "flex", alignItems: "center",
                      gap: 12, padding: "13px 24px", cursor: "default" }}>
                      <div style={{ width: 36, height: 36, borderRadius: DS.r.md, background: c + "15",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: DS.r.full, background: c }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: DS.text, marginBottom: 2 }}>{s.tag}</p>
                        <p style={{ fontSize: 12, color: DS.textSec }}>{s.track} · {s.date}</p>
                      </div>
                      {sc != null && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: scColor }}>{sc}</span>
                          <span style={{ fontSize: 12, color: DS.textMut }}>/10</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ) : (
          <div className="fade-up-3">
            <Card style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
              <p style={{ fontSize: 15, fontWeight: 500, color: DS.text, marginBottom: 6 }}>No sessions yet</p>
              <p style={{ fontSize: 14, color: DS.textSec }}>Pick a track above to start your first challenge.</p>
            </Card>
          </div>
        )}
      </Container>
    </Page>
  );

  // ── ANSWERING ─────────────────────────────────────────────────────────
  if (phase === "answering") return (
    <Page>
      <Container width={700}>
        {/* Nav */}
        <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 10, padding: "28px 0 24px" }}>
          <button className="btn-ghost" onClick={() => setPhase("home")}
            style={{ borderRadius: DS.r.md, padding: "7px 14px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          {trackType && <Badge label={trackType} color={DS.primary} />}
          {pick && <Badge label={pick.tag} color={pick.color} />}
          <span style={{ marginLeft: "auto", fontSize: 12, color: DS.textMut }}>{today}</span>
        </div>

        {/* Challenge */}
        <Card className="fade-up-1" style={{ marginBottom: 12, borderColor: (pick?.color || DS.primary) + "30",
          background: DS.surface, padding: "24px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: DS.r.full, background: pick?.color || DS.primary,
              boxShadow: `0 0 8px ${pick?.color || DS.primary}` }} />
            <Label style={{ margin: 0, fontSize: 10 }}>Challenge</Label>
          </div>
          <p style={{ fontSize: 15, color: "rgba(240,240,244,0.82)", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
            {challenge}
          </p>
        </Card>

        {/* Hint */}
        {pick?.hint && (
          <Card className="fade-up-1" style={{ marginBottom: 12, background: "#18160A", borderColor: "rgba(251,191,36,0.15)" }}>
            <button onClick={() => setHintOpen(o => !o)} style={{ background: "none", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: DS.warning, letterSpacing: "0.04em" }}>Framework Hint</span>
                <span style={{ fontSize: 12, color: "rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.08)",
                  padding: "2px 10px", borderRadius: DS.r.full }}>{pick.hint.framework}</span>
              </div>
              <span style={{ fontSize: 12, color: DS.textMut }}>{hintOpen ? "▲ hide" : "▼ show"}</span>
            </button>
            {hintOpen && (
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(251,191,36,0.1)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {pick.hint.steps.map((s, i) => (
                    <div key={i} className="hint-row" style={{ display: "flex", gap: 12, padding: "6px 8px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: DS.warning, minWidth: 20, paddingTop: 1 }}>{i + 1}.</span>
                      <span style={{ fontSize: 14, color: DS.textSec, lineHeight: 1.65 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.06)", borderRadius: DS.r.sm,
                  borderLeft: `2px solid ${DS.warning}`, display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "rgba(251,191,36,0.7)", lineHeight: 1.6 }}>⚠ {pick.hint.watch}</span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Answer */}
        <Card className="fade-up-2" style={{ marginBottom: 20, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Label style={{ margin: 0 }}>Your Answer</Label>
            <span style={{ fontSize: 12, color: answer.length < 60 ? DS.danger : DS.textMut, transition: "color 0.2s" }}>
              {answer.length < 60 ? `${60 - answer.length} chars to go` : `${answer.length} chars`}
            </span>
          </div>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder="Name a framework. Apply it. Be specific about your reasoning and trade-offs."
            style={{ width: "100%", minHeight: 200, background: DS.bg, border: `1px solid ${DS.border}`,
              borderRadius: DS.r.md, color: DS.text, fontSize: 15, padding: "14px 16px", lineHeight: 1.8 }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
            <button className="btn-ghost" onClick={() => setPhase("home")}
              style={{ borderRadius: DS.r.md, padding: "10px 20px", fontSize: 14 }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitAnswer} disabled={answer.length < 60}
              style={{ borderRadius: DS.r.md, padding: "10px 28px", fontSize: 14, fontWeight: 600,
                opacity: answer.length < 60 ? 0.4 : 1, cursor: answer.length < 60 ? "not-allowed" : "pointer" }}>
              Submit for Assessment →
            </button>
          </div>
        </Card>
      </Container>
    </Page>
  );

  // ── RESULT ────────────────────────────────────────────────────────────
  if (phase === "result") return (
    <Page>
      <Container width={700}>
        {/* Nav */}
        <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 10, padding: "28px 0 24px" }}>
          <button className="btn-ghost" onClick={() => setPhase("home")}
            style={{ borderRadius: DS.r.md, padding: "7px 14px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
          {trackType && <Badge label={trackType} color={DS.primary} />}
          {pick && <Badge label={pick.tag} color={pick.color} />}
          <span style={{ marginLeft: "auto", fontSize: 12, color: DS.textMut }}>Assessment</span>
        </div>

        {/* Score hero */}
        {scores && (() => {
          const sc = scores.overall;
          const color = sc >= 7 ? DS.success : sc >= 5 ? DS.warning : DS.danger;
          const label = sc >= 7 ? "Solid PM thinking" : sc >= 5 ? "Good foundation" : "Gaps to close";
          const emoji = sc >= 7 ? "💪" : sc >= 5 ? "📈" : "🎯";
          return (
            <Card className="fade-up-1" style={{ marginBottom: 12, padding: "32px 28px", textAlign: "center" }}>
              <div style={{ fontSize: 80, fontWeight: 900, color, letterSpacing: "-0.06em", lineHeight: 1, marginBottom: 6 }}>
                {sc}
              </div>
              <div style={{ fontSize: 14, color: DS.textMut, marginBottom: 16 }}>out of 10</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6,
                background: color + "14", borderRadius: DS.r.full, padding: "8px 18px" }}>
                <span>{emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color }}>{label}</span>
              </div>
            </Card>
          );
        })()}

        {/* Score breakdown */}
        {scores && (
          <Card className="fade-up-2" style={{ marginBottom: 12 }}>
            <Label>Score Breakdown</Label>
            <ScoreBar label="Structured Thinking" score={scores.structured} delay={0} />
            <ScoreBar label="Business Acumen"     score={scores.business}   delay={80} />
            <ScoreBar label="Specificity & Depth"  score={scores.depth}      delay={160} />
            <ScoreBar label="PM Maturity"          score={scores.maturity}   delay={240} />
          </Card>
        )}

        {/* Assessment */}
        <Card className="fade-up-3" style={{ marginBottom: 12 }}>
          <Label>Assessment</Label>
          {renderMD(assessment)}
        </Card>

        {/* Answer key */}
        {answerKey && (
          <Card className="fade-up-4" style={{ marginBottom: 24,
            background: showKey ? "rgba(52,211,153,0.04)" : DS.surface,
            borderColor: showKey ? "rgba(52,211,153,0.2)" : DS.border, transition: "all 0.2s" }}>
            <button onClick={() => setShowKey(o => !o)} style={{ background: "none", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>🔑</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: DS.success }}>Model Answer</span>
                <span style={{ fontSize: 12, color: DS.textMut }}>— see what a strong response looks like</span>
              </div>
              <span style={{ fontSize: 12, color: DS.textMut }}>{showKey ? "▲ hide" : "▼ reveal"}</span>
            </button>
            {showKey && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(52,211,153,0.1)" }}>
                {renderMD(answerKey, true)}
              </div>
            )}
          </Card>
        )}

        {/* Actions */}
        <div className="fade-up-4" style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={() => setPhase("home")}
            style={{ borderRadius: DS.r.md, padding: "12px 20px", fontSize: 14 }}>
            Back to Home
          </button>
          <button className="btn-primary" onClick={() => { setPhase("home"); setTimeout(() => startChallenge(trackType), 50); }}
            style={{ flex: 1, borderRadius: DS.r.md, padding: "12px 24px", fontSize: 14, fontWeight: 600 }}>
            Another Challenge →
          </button>
        </div>
      </Container>
    </Page>
  );

  return null;
}
