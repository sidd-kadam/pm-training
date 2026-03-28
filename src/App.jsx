import { useState, useEffect } from "react";

function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

const CHALLENGES = {
  B2B: [
    { tag: "PRIORITIZATION", color: "#7F6CF0",
      hint: { framework: "RICE or MoSCoW", steps: ["Name your framework and justify the choice","Score each backlog item — don't just list them","Address the compliance deadline and churn risk explicitly","End with a ranked list and what gets cut if capacity runs out"], watch: "Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag: "METRICS", color: "#0284C7",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you observe in the data first","Generate 2-3 root cause hypotheses","Identify what data is missing","Define 2-3 metrics you'd add to the dashboard"], watch: "Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag: "STAKEHOLDER", color: "#0F766E",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder truly wants beneath their stated position","Spot any shared goals or constraints","Make a concrete decision — don't sit on the fence","State who gets which message and how"], watch: "PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "STRATEGY", color: "#6356C7",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 sentences","Name 2-3 strategic options","Pick one and defend it with business reasoning","Explicitly state what you would NOT do and why"], watch: "Every strategy needs a trade-off. What are you giving up?" },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "EXECUTION", color: "#B45309",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What is most critical in the next 2 hours?","Who do you talk to and in what order?","What do you cut or defer?","How do you run the retrospective after?"], watch: "Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  B2C: [
    { tag: "PRIORITIZATION", color: "#7F6CF0",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework and why it fits B2C","Consider user volume, engagement, and retention for each item","Factor in competitor timing and seasonal context","Give a final ranked order and what gets cut"], watch: "B2C is about user love at scale. Delight is a valid business metric." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "METRICS", color: "#0284C7",
      hint: { framework: "AARRR Funnel", steps: ["Map each metric to its funnel stage","Identify the biggest drop-off point","Form 2-3 hypotheses for the drop-off","Pick one metric to fix first and defend the choice"], watch: "Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag: "GROWTH", color: "#6356C7",
      hint: { framework: "Growth Loops", steps: ["Identify which growth loop is broken or missing","Pick ONE lever to pull — don't try to fix everything","Define how you'd measure if your fix worked","Estimate the impact in user numbers or revenue"], watch: "Growth is a system. Fix the loop. Don't just add features." },
      prompt: `B2C growth challenge for a junior PM. Consumer app growth has plateaued with fake metrics showing the problem and limited engineering capacity. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag: "USER RESEARCH", color: "#0F766E",
      hint: { framework: "Jobs To Be Done", steps: ["Identify the job each user hires the product to do","Find the gap between expectation and experience","Separate genuine pain points from nice-to-haves","Recommend what to build and what to ignore"], watch: "Focus on what users DO, not what they SAY. Behaviour beats words." },
      prompt: `B2C user research challenge for a junior PM. 3 user types giving conflicting qualitative feedback on the same feature area. Ask: synthesize the feedback and decide what to build. Be concise.` },
    { tag: "EXECUTION", color: "#B45309",
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

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #191919; -webkit-font-smoothing: antialiased; }
  ::selection { background: rgba(127,108,240,0.3); }
  textarea, input { outline: none; font-family: 'Inter', sans-serif; }
  button { cursor: pointer; font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  .au  { animation: fadeUp .4s cubic-bezier(.22,1,.36,1) both; }
  .au1 { animation: fadeUp .4s .06s cubic-bezier(.22,1,.36,1) both; }
  .au2 { animation: fadeUp .4s .12s cubic-bezier(.22,1,.36,1) both; }
  .au3 { animation: fadeUp .4s .18s cubic-bezier(.22,1,.36,1) both; }
  .au4 { animation: fadeUp .4s .24s cubic-bezier(.22,1,.36,1) both; }
  .trk { transition: background .15s; }
  .trk:hover { background: #252525 !important; }
  input:focus, textarea:focus { border-color: #7F6CF0 !important; box-shadow: 0 0 0 2px rgba(127,108,240,0.15) !important; }
`;

function renderMD(text, isKey = false) {
  const headColor = isKey ? "#A78BFA" : "#E6E6E6";
  const bodyColor = isKey ? "rgba(167,139,250,0.85)" : "rgba(255,255,255,0.7)";
  const labelColor = isKey ? "#7F6CF0" : "rgba(255,255,255,0.3)";
  return text.trim().split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**"))
      return <p key={i} style={{ fontSize:10, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:labelColor, marginTop:20, marginBottom:8, fontFamily:"Inter,sans-serif" }}>{line.replace(/\*\*/g,"")}</p>;
    if (line.includes("━")) return <div key={i} style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"10px 0" }}/>;
    if (!line.trim()) return <div key={i} style={{ height:8 }}/>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{ fontSize:15, lineHeight:1.8, color:bodyColor, fontFamily:"Inter,sans-serif" }}>
      {parts.map((p,j) => p.startsWith("**") ? <strong key={j} style={{ color:headColor, fontWeight:600 }}>{p.replace(/\*\*/g,"")}</strong> : p)}
    </p>;
  });
}

function ScoreBar({ label, score, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score * 10), 300 + delay); return () => clearTimeout(t); }, [score]);
  const color = score >= 7 ? "#7F6CF0" : score >= 5 ? "#C4B5FD" : "#FF6B6B";
  const bg    = score >= 7 ? "rgba(127,108,240,0.15)" : score >= 5 ? "rgba(196,181,253,0.15)" : "rgba(255,107,107,0.15)";
  return (
    <div style={{ padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.5)", fontWeight:400 }}>{label}</span>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color, background:bg, padding:"3px 10px", borderRadius:99 }}>{score}/10</span>
      </div>
      <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:`${w}%`, height:"100%", background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:99, transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
    </div>
  );
}

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
  const font  = "'Inter', sans-serif";
  const base  = { fontFamily: font, background: "#191919", minHeight: "100vh", color: "#E6E6E6", padding: "24px 20px" };
  const card  = (x = {}) => ({ background: "#202020", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20, marginBottom: 10, ...x });
  const pill  = c => ({ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: c + "18", color: c, letterSpacing: "0.02em", fontWeight: 500 });
  const btn   = (bg, fg = "#191919", off = false) => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "10px 20px", fontFamily: font, fontWeight: 500, fontSize: 14, cursor: off ? "default" : "pointer", opacity: off ? 0.4 : 1, transition: "all 0.12s" });

  useEffect(() => {
    const hR = storageList("pm_session:");
    if (hR?.keys?.length) {
      const s = hR.keys.map(k => { const r = storageGet(k); return r ? JSON.parse(r.value) : null; }).filter(Boolean).reverse();
      setHistory(s.slice(0, 30));
      setTotal(s.length);
      setHighScores(s.filter(x => x.scores?.overall >= 7).length);
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
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{G}</style>
      <div style={{ width: "100%", maxWidth: 360 }} className="au">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(145deg,#7F6CF0,#6356C7)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(127,108,240,0.35)" }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M4 19L9 10L13 14L17 7L21 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="6" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#E6E6E6", marginBottom: 6, letterSpacing: "-0.02em" }}>PM Training</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Personal dashboard. Enter your code.</p>
        </div>
        <div style={card()}>
          <input type="password" value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === "Enter" && checkPassword()}
            placeholder="Access code"
            autoFocus
            style={{ width: "100%", background: "#191919", border: `1px solid ${pwError ? "#FF6B6B" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "12px 14px", fontFamily: font, fontSize: 15, color: "#E6E6E6", marginBottom: 10 }}
          />
          {pwError && <p style={{ fontSize: 13, color: "#FF6B6B", textAlign: "center", marginBottom: 10 }}>Incorrect code. Try again.</p>}
          <button onClick={checkPassword} style={{ ...btn("#7F6CF0", "#fff"), width: "100%", boxShadow: "0 4px 16px rgba(127,108,240,0.3)" }}>Continue →</button>
        </div>
      </div>
    </div>
  );

  // ── LOADING ───────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <style>{G}</style>
      <div style={{ width: 30, height: 30, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#7F6CF0", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: font }}>Loading…</p>
    </div>
  );

  // ── HOME ──────────────────────────────────────────────────────────────
  if (phase === "home") return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }} className="au">
          <p style={{ fontSize: 11, color: "#7F6CF0", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 8 }}>PM DAILY TRAINING</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#E6E6E6", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 6 }}>Hi, Siddhant 👋</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>One challenge. One assessment. Every day.</p>
        </div>

        {error && <div style={{ ...card({ background: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.2)" }), fontSize: 13, color: "#FF6B6B", marginBottom: 10 }}>⚠ {error}</div>}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }} className="au1">
          {[
            { label: "Total sessions", value: total, color: "#7F6CF0", bg: "#1D1B2E" },
            { label: "Scored 7 or above", value: highScores, color: "#C4B5FD", bg: "#1A1826" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 10, padding: "18px 16px" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Track selection */}
        <div style={card()} className="au2">
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 16 }}>
            Choose your track. Get a real scenario. Write a serious answer. Get scored on 4 dimensions.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { t: "B2B", icon: "🏢", color: "#7F6CF0", bg: "#1D1B2E", desc: "Enterprise & platform" },
              { t: "B2C", icon: "📱", color: "#C4B5FD", bg: "#1A1826", desc: "Consumer & growth" },
            ].map(({ t, icon, color, bg, desc }) => (
              <button key={t} className="trk" onClick={() => startChallenge(t)}
                style={{ flex: 1, background: bg, border: `1px solid ${color}22`, borderRadius: 10, padding: "16px 14px", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 4 }}>{t} PM</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={card()} className="au3">
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>RECENT SESSIONS</p>
            {history.slice(0, 8).map((s, i) => {
              const c = CHALLENGES.B2B.concat(CHALLENGES.B2C).find(x => x.tag === s.tag)?.color || "#64748b";
              const sc = s.scores?.overall;
              const scColor = sc >= 7 ? "#7F6CF0" : sc >= 5 ? "#C4B5FD" : "#FF6B6B";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: i < Math.min(history.length - 1, 7) ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: s.track === "B2C" ? "rgba(196,181,253,0.12)" : "rgba(127,108,240,0.12)", color: s.track === "B2C" ? "#C4B5FD" : "#7F6CF0", fontWeight: 600 }}>{s.track || "B2B"}</span>
                  <span style={pill(c)}>{s.tag}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flex: 1 }}>{s.date}</span>
                  {sc && <span style={{ fontSize: 12, fontWeight: 600, color: scColor }}>{sc}/10</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── ANSWERING ─────────────────────────────────────────────────────────
  if (phase === "answering") return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }} className="au">
          <button onClick={() => setPhase("home")} style={{ ...btn("#202020", "rgba(255,255,255,0.55)"), padding: "7px 14px", fontSize: 12, border: "1px solid rgba(255,255,255,0.08)" }}>← Back</button>
          <span style={pill(trackType === "B2C" ? "#C4B5FD" : "#7F6CF0")}>{trackType}</span>
          {pick && <span style={pill(pick.color)}>{pick.tag}</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>{today}</span>
        </div>

        <div style={{ ...card({ borderColor: (pick?.color || "#7F6CF0") + "25", background: "#1D1B2E" }) }} className="au1">
          <p style={{ fontSize: 10, color: pick?.color, letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>CHALLENGE</p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{challenge}</p>
        </div>

        {pick?.hint && (
          <div style={card({ background: "#1A160A" })} className="au1">
            <button onClick={() => setHintOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>💡</span>
                <span style={{ fontSize: 10, color: "#E1EA78", letterSpacing: "0.1em", fontWeight: 600 }}>FRAMEWORK HINT</span>
                <span style={{ fontSize: 11, color: "rgba(225,234,120,0.5)", background: "rgba(225,234,120,0.08)", padding: "2px 8px", borderRadius: 4 }}>{pick.hint.framework}</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{hintOpen ? "hide ▲" : "show ▼"}</span>
            </button>
            {hintOpen && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {pick.hint.steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: "#E1EA78", fontWeight: 600, fontSize: 12, minWidth: 18 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(225,234,120,0.06)", borderRadius: 8, borderLeft: "2px solid #E1EA78" }}>
                  <span style={{ fontSize: 12, color: "rgba(225,234,120,0.65)" }}>⚠ {pick.hint.watch}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={card()} className="au2">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", fontWeight: 600 }}>YOUR ANSWER</p>
            <span style={{ fontSize: 11, color: answer.length < 60 ? "#FF6B6B" : "rgba(255,255,255,0.25)" }}>
              {answer.length < 60 ? `${60 - answer.length} more chars` : `${answer.length} chars`}
            </span>
          </div>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder="Use a framework. Be specific. Think out loud."
            style={{ width: "100%", minHeight: 190, background: "#191919", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, color: "#E6E6E6", fontFamily: font, fontSize: 14, padding: "12px 14px", lineHeight: 1.8, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button style={{ ...btn("#202020", "rgba(255,255,255,0.45)"), border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => setPhase("home")}>Cancel</button>
            <button style={btn(answer.length >= 60 ? "#7F6CF0" : "#202020", answer.length >= 60 ? "#fff" : "rgba(255,255,255,0.2)", answer.length < 60)} onClick={submitAnswer} disabled={answer.length < 60}>
              Submit →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────
  if (phase === "result") return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }} className="au">
          <button onClick={() => setPhase("home")} style={{ ...btn("#202020", "rgba(255,255,255,0.55)"), padding: "7px 14px", fontSize: 12, border: "1px solid rgba(255,255,255,0.08)" }}>← Home</button>
          {trackType && <span style={pill(trackType === "B2C" ? "#C4B5FD" : "#7F6CF0")}>{trackType}</span>}
          {pick && <span style={pill(pick.color)}>{pick.tag}</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>Assessment</span>
        </div>

        {scores && (
          <div style={{ ...card({ textAlign: "center", padding: "32px 24px" }) }} className="au1">
            <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, color: scores.overall >= 7 ? "#7F6CF0" : scores.overall >= 5 ? "#C4B5FD" : "#FF6B6B" }}>{scores.overall}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>out of 10</div>
            <div style={{ marginTop: 14, display: "inline-block", background: scores.overall >= 7 ? "rgba(127,108,240,0.12)" : scores.overall >= 5 ? "rgba(196,181,253,0.12)" : "rgba(255,107,107,0.12)", borderRadius: 99, padding: "7px 18px" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: scores.overall >= 7 ? "#7F6CF0" : scores.overall >= 5 ? "#C4B5FD" : "#FF6B6B" }}>
                {scores.overall >= 7 ? "Solid junior PM thinking 💪" : scores.overall >= 5 ? "Good foundation, keep building 📈" : "Real gaps to close — fix them 🎯"}
              </span>
            </div>
          </div>
        )}

        {scores && (
          <div style={card()} className="au2">
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>SCORE BREAKDOWN</p>
            <ScoreBar label="Structured Thinking" score={scores.structured} delay={0}/>
            <ScoreBar label="Business Acumen"     score={scores.business}   delay={80}/>
            <ScoreBar label="Specificity & Depth"  score={scores.depth}      delay={160}/>
            <ScoreBar label="PM Maturity"          score={scores.maturity}   delay={240}/>
          </div>
        )}

        <div style={card()} className="au3">
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>ASSESSMENT</p>
          {renderMD(assessment)}
        </div>

        {answerKey && (
          <div style={{ ...card({ background: showKey ? "rgba(127,108,240,0.05)" : "#202020", border: `1px solid ${showKey ? "rgba(127,108,240,0.2)" : "rgba(255,255,255,0.06)"}`, transition: "all 0.2s" }) }} className="au4">
            <button onClick={() => setShowKey(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔑</span>
                <span style={{ fontSize: 10, color: "#7F6CF0", letterSpacing: "0.1em", fontWeight: 600 }}>ANSWER KEY</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{showKey ? "hide ▲" : "reveal ▼"}</span>
            </button>
            {showKey && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(127,108,240,0.12)" }}>
                {renderMD(answerKey, true)}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }} className="au4">
          <button style={{ ...btn("#202020", "rgba(255,255,255,0.5)"), border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => setPhase("home")}>← Home</button>
          <button style={{ ...btn("#7F6CF0", "#fff"), flex: 1, boxShadow: "0 4px 14px rgba(127,108,240,0.25)" }} onClick={() => { setPhase("home"); setTimeout(() => startChallenge(trackType), 50); }}>
            Another Challenge →
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}
