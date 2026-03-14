import { useState, useEffect } from "react";

function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

const CHALLENGES = {
  B2B: [
    { tag: "PRIORITIZATION", color: "#FF9500",
      hint: { framework: "RICE or MoSCoW", steps: ["Name your framework and justify the choice","Score each backlog item — don't just list them","Address the compliance deadline and churn risk explicitly","End with a ranked list and what gets cut if capacity runs out"], watch: "Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag: "METRICS", color: "#32ADE6",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you observe in the data first","Generate 2-3 root cause hypotheses","Identify what data is missing","Define 2-3 metrics you'd add to the dashboard"], watch: "Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag: "STAKEHOLDER", color: "#BF5AF2",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder truly wants beneath their stated position","Spot any shared goals or constraints","Make a concrete decision — don't sit on the fence","State who gets which message and how"], watch: "PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "STRATEGY", color: "#34C759",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 sentences","Name 2-3 strategic options","Pick one and defend it with business reasoning","Explicitly state what you would NOT do and why"], watch: "Every strategy needs a trade-off. What are you giving up?" },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "EXECUTION", color: "#FF3B30",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What is most critical in the next 2 hours?","Who do you talk to and in what order?","What do you cut or defer?","How do you run the retrospective after?"], watch: "Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  B2C: [
    { tag: "PRIORITIZATION", color: "#FF9500",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework and why it fits B2C","Consider user volume, engagement, and retention for each item","Factor in competitor timing and seasonal context","Give a final ranked order and what gets cut"], watch: "B2C is about user love at scale. Delight is a valid business metric." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "METRICS", color: "#32ADE6",
      hint: { framework: "AARRR Funnel", steps: ["Map each metric to its funnel stage","Identify the biggest drop-off point","Form 2-3 hypotheses for the drop-off","Pick one metric to fix first and defend the choice"], watch: "Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag: "GROWTH", color: "#34C759",
      hint: { framework: "Growth Loops", steps: ["Identify which growth loop is broken or missing","Pick ONE lever to pull — don't try to fix everything","Define how you'd measure if your fix worked","Estimate the impact in user numbers or revenue"], watch: "Growth is a system. Fix the loop. Don't just add features." },
      prompt: `B2C growth challenge for a junior PM. Consumer app growth has plateaued with fake metrics showing the problem and limited engineering capacity. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag: "USER RESEARCH", color: "#BF5AF2",
      hint: { framework: "Jobs To Be Done", steps: ["Identify the 'job' each user hires the product to do","Find the gap between expectation and experience","Separate genuine pain points from nice-to-haves","Recommend what to build and what to ignore"], watch: "Focus on what users DO, not what they SAY. Behaviour beats words." },
      prompt: `B2C user research challenge for a junior PM. 3 user types giving conflicting qualitative feedback on the same feature area. Ask: synthesize the feedback and decide what to build. Be concise.` },
    { tag: "EXECUTION", color: "#FF3B30",
      hint: { framework: "Triage → Communicate → Ship", steps: ["What is breaking user experience RIGHT NOW?","Hotfix immediately or wait for proper fix — pick one and justify","Communicate to users if the issue is visible to them","Define what 'resolved' looks like and how you'll confirm it"], watch: "B2C crises are public. Users tweet. Think about user communication, not just internal teams." },
      prompt: `B2C app execution crisis for a junior PM. Consumer-facing incident with public user impact and social media pressure, engineering says 4 hours to fix. Ask: how does the PM handle this step by step? Be concise.` },
  ]
};

const ASSESS_SYSTEM = `You are a direct, precise PM coach for a junior PM (0-2 years). Be honest, specific, encouraging.

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

const APPLE_FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; }
  ::selection { background: rgba(10,132,255,0.3); }
  textarea { outline: none; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
  .fade-in { animation: fadeIn 0.35s cubic-bezier(0.4,0,0.2,1) both; }
  .fade-in-delay-1 { animation: fadeIn 0.35s 0.06s cubic-bezier(0.4,0,0.2,1) both; }
  .fade-in-delay-2 { animation: fadeIn 0.35s 0.12s cubic-bezier(0.4,0,0.2,1) both; }
  .fade-in-delay-3 { animation: fadeIn 0.35s 0.18s cubic-bezier(0.4,0,0.2,1) both; }
  .fade-in-delay-4 { animation: fadeIn 0.35s 0.24s cubic-bezier(0.4,0,0.2,1) both; }
  .track-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .track-btn:active { transform: scale(0.98); }
  .pill-btn:hover { opacity: 0.85; }
  .pill-btn:active { transform: scale(0.97); }
  .ghost-btn:hover { background: rgba(255,255,255,0.06) !important; }
  .hint-row:hover { background: rgba(255,255,255,0.03); border-radius: 8px; }
`;

// ── SF-style prose renderer ───────────────────────────────────────────────
function renderMD(text, isKey = false) {
  return text.trim().split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**")) return (
      <p key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color: isKey ? "#30D158" : "rgba(255,255,255,0.35)", marginTop:20, marginBottom:6 }}>{line.replace(/\*\*/g,"")}</p>
    );
    if (line.includes("━")) return <div key={i} style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"10px 0" }} />;
    if (!line.trim()) return <div key={i} style={{ height:8 }} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:15, lineHeight:1.75, color: isKey ? "rgba(48,209,88,0.9)" : "rgba(255,255,255,0.75)", fontWeight:400 }}>
        {parts.map((p,j) => p.startsWith("**") ? <strong key={j} style={{ color: isKey ? "#30D158" : "rgba(255,255,255,0.92)", fontWeight:600 }}>{p.replace(/\*\*/g,"")}</strong> : p)}
      </p>
    );
  });
}

// ── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ label, score, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(score * 10), 100 + delay); return () => clearTimeout(t); }, [score]);
  const color = score >= 7 ? "#30D158" : score >= 5 ? "#FF9F0A" : "#FF453A";
  return (
    <div style={{ padding:"11px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"rgba(255,255,255,0.55)", fontWeight:400 }}>{label}</span>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color }}>{score}/10</span>
      </div>
      <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:99 }}>
        <div style={{ width:`${width}%`, height:"100%", background:`linear-gradient(90deg, ${color}cc, ${color})`, borderRadius:99, transition:"width 1s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ── SF symbol-style icon ──────────────────────────────────────────────────
function AppIcon() {
  return (
    <div style={{ width:64, height:64, borderRadius:14, background:"linear-gradient(145deg,#1C1C1E,#2C2C2E)", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="10" width="28" height="18" rx="3" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)"/>
        <rect x="4" y="10" width="28" height="5" rx="3" fill="rgba(255,255,255,0.08)"/>
        <circle cx="8" cy="12.5" r="1" fill="#FF453A"/>
        <circle cx="12" cy="12.5" r="1" fill="#FF9F0A"/>
        <circle cx="16" cy="12.5" r="1" fill="#30D158"/>
        <rect x="8" y="19" width="10" height="1.5" rx="0.75" fill="rgba(10,132,255,0.7)"/>
        <rect x="8" y="22.5" width="7" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)"/>
        <rect x="22" y="18" width="6" height="8" rx="1.5" fill="rgba(10,132,255,0.15)" stroke="rgba(10,132,255,0.5)" strokeWidth="1"/>
        <rect x="23.5" y="20" width="3" height="1" rx="0.5" fill="rgba(10,132,255,0.8)"/>
        <rect x="23.5" y="22" width="2" height="1" rx="0.5" fill="rgba(10,132,255,0.5)"/>
        <rect x="14" y="7" width="8" height="3" rx="1.5" fill="rgba(255,255,255,0.1)"/>
      </svg>
    </div>
  );
}

// ── Tag chip ──────────────────────────────────────────────────────────────
function Tag({ label, color }) {
  return (
    <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:500, color, background:`${color}18`, padding:"3px 9px", borderRadius:6, letterSpacing:"0.02em", border:`1px solid ${color}28` }}>
      {label}
    </span>
  );
}

// ── Track chip ────────────────────────────────────────────────────────────
function TrackChip({ track }) {
  return (
    <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color: track === "B2C" ? "#0A84FF" : "#BF5AF2", background: track === "B2C" ? "rgba(10,132,255,0.12)" : "rgba(191,90,242,0.12)", padding:"3px 9px", borderRadius:6, border: track === "B2C" ? "1px solid rgba(10,132,255,0.2)" : "1px solid rgba(191,90,242,0.2)" }}>
      {track}
    </span>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────
function Sep() { return <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"4px 0" }} />; }

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
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [highScores, setHighScores] = useState(0);
  const [todayDone, setTodayDone] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

  useEffect(() => {
    const sR = storageGet("pm_streak"), lR = storageGet("pm_last_date"), hR = storageList("pm_session:");
    if (sR) setStreak(parseInt(sR.value) || 0);
    if (lR?.value === today) setTodayDone(true);
    if (hR?.keys?.length) {
      const s = hR.keys.slice(-30).map(k => { const r = storageGet(k); return r ? JSON.parse(r.value) : null; }).filter(Boolean).reverse();
      setHistory(s); setTotal(s.length); setHighScores(s.filter(x => x.scores?.overall >= 7).length);
    }
  }, []);

  async function startChallenge(track) {
    setTrackType(track); setPhase("loading"); setError("");
    const pool = CHALLENGES[track];
    const lastR = storageGet("pm_last_tag");
    let pool2 = pool.filter(c => c.tag !== lastR?.value);
    if (!pool2.length) pool2 = pool;
    const chosen = pool2[Math.floor(Math.random() * pool2.length)];
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
      const m = (l) => { const r = new RegExp(l + "[:\\s]+(\\d+)/10","i"); const x = result.match(r); return x ? parseInt(x[1]) : 5; };
      const s = { structured:m("Structured Thinking"), business:m("Business Acumen"), depth:m("Specificity"), maturity:m("PM Maturity"), overall:m("Overall") };
      setScores(s); saveSession(s); setPhase("result");
    } catch (e) { setError(e.message); setPhase("answering"); }
  }

  function saveSession(s) {
    const lR = storageGet("pm_last_date");
    const yest = new Date(); yest.setDate(yest.getDate()-1);
    const sR = storageGet("pm_streak");
    let cur = parseInt(sR?.value||"0");
    if (lR?.value===yest.toISOString().slice(0,10)) cur+=1; else if (lR?.value!==today) cur=1;
    storageSet("pm_streak",String(cur)); storageSet("pm_last_date",today); storageSet("pm_last_tag",pick?.tag);
    storageSet(`pm_session:${today}:${Date.now()}`, JSON.stringify({date:today,tag:pick?.tag,track:trackType,scores:s}));
    setStreak(cur); setTodayDone(true); setTotal(p=>p+1);
    if (s.overall>=7) setHighScores(p=>p+1);
    setHistory(prev=>[{date:today,tag:pick?.tag,track:trackType,scores:s},...prev].slice(0,30));
  }

  // ── shared layout vars ────────────────────────────────────────────────
  const ROOT = { fontFamily:"Inter,sans-serif", background:"#000000", minHeight:"100vh", color:"#fff", WebkitFontSmoothing:"antialiased", MozOsxFontSmoothing:"grayscale" };
  const WRAP = { maxWidth:640, margin:"0 auto", padding:"0 20px 60px" };
  const CARD = { background:"rgba(28,28,30,0.95)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, overflow:"hidden", backdropFilter:"blur(20px)" };
  const SECTION_LABEL = { fontFamily:"Inter,sans-serif", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em", textTransform:"uppercase", padding:"20px 18px 10px" };

  // ── LOADING ───────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{ ...ROOT, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
      <style>{APPLE_FONTS}</style>
      <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.1)", borderTopColor:"#0A84FF", animation:"spin 0.7s linear infinite" }}/>
      <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.35)", fontWeight:400 }}>Loading…</p>
    </div>
  );

  // ── HOME ──────────────────────────────────────────────────────────────
  if (phase === "home") return (
    <div style={ROOT}>
      <style>{APPLE_FONTS}</style>
      <div style={WRAP}>

        {/* Nav bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"52px 0 32px" }} className="fade-in">
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <AppIcon />
            <div>
              <div style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:17, color:"#fff", letterSpacing:"-0.02em" }}>PM Training</div>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{dateLabel}</div>
            </div>
          </div>
          {streak > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,149,0,0.12)", border:"1px solid rgba(255,149,0,0.2)", borderRadius:20, padding:"6px 14px" }}>
              <span style={{ fontSize:14 }}>🔥</span>
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:"#FF9500" }}>{streak}</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ ...CARD, background:"rgba(255,69,58,0.1)", border:"1px solid rgba(255,69,58,0.2)", padding:"14px 18px", marginBottom:16 }} className="fade-in">
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"#FF453A" }}>⚠ {error}</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ ...CARD, display:"flex", marginBottom:12 }} className="fade-in-delay-1">
          {[
            { n: streak, label:"Day streak", sub: streak===0?"Start today":"Keep going" },
            { n: total, label:"Sessions", sub:"Total completed" },
            { n: highScores, label:"High scores", sub:"Scored 7 or above" },
          ].map((s,i) => (
            <div key={i} style={{ flex:1, padding:"20px 0", textAlign:"center", borderRight: i<2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:30, color: s.n > 0 ? "#fff" : "rgba(255,255,255,0.2)", letterSpacing:"-0.03em", lineHeight:1 }}>{s.n}</div>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, fontWeight:500, color:"rgba(255,255,255,0.55)", marginTop:6 }}>{s.label}</div>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Today card */}
        <div style={{ ...CARD, marginBottom:12 }} className="fade-in-delay-2">
          {todayDone ? (
            <div style={{ padding:"22px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(48,209,88,0.12)", border:"1px solid rgba(48,209,88,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 5" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:600, color:"#30D158" }}>Today complete</div>
                  <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:1 }}>Come back tomorrow. Consistency compounds.</div>
                </div>
              </div>
              <button className="ghost-btn" onClick={() => setPhase("result")} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10, padding:"10px 16px", color:"rgba(255,255,255,0.7)", fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:500, width:"100%" }}>
                Review today's assessment
              </button>
            </div>
          ) : (
            <div style={{ padding:"22px 18px" }}>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:17, fontWeight:600, color:"#fff", letterSpacing:"-0.01em", marginBottom:6 }}>Today's Challenge</div>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.45)", lineHeight:1.6, marginBottom:20 }}>Choose your track. Answer a real PM scenario. Get scored and see the model answer.</p>
              <div style={{ display:"flex", gap:10 }}>
                {[
                  { type:"B2B", icon:"🏢", label:"B2B / Enterprise", desc:"Compliance · Stakeholders · Platform" },
                  { type:"B2C", icon:"📱", label:"B2C / Consumer", desc:"Growth · Funnels · Retention" },
                ].map(({ type, icon, label, desc }) => (
                  <button key={type} className="track-btn" onClick={() => startChallenge(type)} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"16px 14px", textAlign:"left", fontFamily:"Inter,sans-serif", transition:"background 0.15s" }}>
                    <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#fff", marginBottom:3 }}>{label}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.4 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent sessions */}
        {history.length > 0 && (
          <div style={{ ...CARD, marginBottom:12 }} className="fade-in-delay-3">
            <div style={SECTION_LABEL}>Recent Sessions</div>
            {history.slice(0,7).map((s,i) => {
              const tagColor = CHALLENGES.B2B.concat(CHALLENGES.B2C).find(c=>c.tag===s.tag)?.color || "#8E8E93";
              const scoreColor = s.scores?.overall>=7?"#30D158":s.scores?.overall>=5?"#FF9F0A":"#FF453A";
              return (
                <div key={i}>
                  {i > 0 && <Sep />}
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 18px" }}>
                    <TrackChip track={s.track||"B2B"}/>
                    <Tag label={s.tag} color={tagColor}/>
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.25)", flex:1 }}>{s.date}</span>
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:scoreColor }}>{s.scores?.overall??"-"}/10</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Challenge types grid */}
        <div style={{ ...CARD }} className="fade-in-delay-4">
          <div style={SECTION_LABEL}>Challenge Types</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", padding:"0 12px 16px", gap:8 }}>
            {[
              ["B2B","#BF5AF2",["Prioritization","Metrics","Stakeholder","Strategy","Execution"]],
              ["B2C","#0A84FF",["Prioritization","Metrics","Growth","User Research","Execution"]],
            ].map(([track, color, types]) => (
              <div key={track} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"14px" }}>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:700, color, marginBottom:10, letterSpacing:"0.04em" }}>{track} TRACK</div>
                {types.map(t => (
                  <div key={t} style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:3, height:3, borderRadius:"50%", background:color, opacity:0.5 }}/>
                    {t}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  // ── ANSWERING ─────────────────────────────────────────────────────────
  if (phase === "answering") return (
    <div style={ROOT}>
      <style>{APPLE_FONTS}</style>
      <div style={WRAP}>

        {/* Nav */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"52px 0 24px" }} className="fade-in">
          <button onClick={() => setPhase("home")} style={{ background:"none", border:"none", color:"#0A84FF", fontFamily:"Inter,sans-serif", fontSize:16, fontWeight:400, padding:0, display:"flex", alignItems:"center", gap:4 }}>
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none"><path d="M8 2L2 8L8 14" stroke="#0A84FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
          {trackType && <TrackChip track={trackType}/>}
          {pick && <Tag label={pick.tag} color={pick.color}/>}
        </div>

        {/* Challenge */}
        <div style={{ ...CARD, marginBottom:12 }} className="fade-in-delay-1">
          <div style={{ padding:"18px 18px 0", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: pick?.color, boxShadow:`0 0 8px ${pick?.color}` }}/>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.4)", letterSpacing:"0.06em", textTransform:"uppercase" }}>Today's Challenge</span>
            <span style={{ marginLeft:"auto", fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.25)" }}>{today}</span>
          </div>
          <div style={{ padding:"16px 18px 20px", fontFamily:"Inter,sans-serif", fontSize:15, color:"rgba(255,255,255,0.82)", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{challenge}</div>
        </div>

        {/* Hint */}
        {pick?.hint && (
          <div style={{ ...CARD, marginBottom:12 }} className="fade-in-delay-1">
            <button onClick={() => setHintOpen(o=>!o)} style={{ background:"none", border:"none", width:"100%", display:"flex", alignItems:"center", gap:10, padding:"16px 18px", fontFamily:"Inter,sans-serif" }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(255,159,10,0.12)", border:"1px solid rgba(255,159,10,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:14 }}>💡</span>
              </div>
              <div style={{ textAlign:"left", flex:1 }}>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.8)" }}>Framework Hint</div>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,159,10,0.8)", marginTop:1 }}>{pick.hint.framework}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: hintOpen ? "rotate(180deg)" : "rotate(0)", transition:"transform 0.2s" }}>
                <path d="M4 6L8 10L12 6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {hintOpen && (
              <div style={{ padding:"0 18px 18px", borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:16 }}>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12 }}>Structure your answer</p>
                {pick.hint.steps.map((s,i) => (
                  <div key={i} className="hint-row" style={{ display:"flex", gap:12, padding:"7px 8px", marginBottom:2 }}>
                    <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:"#FF9F0A", minWidth:18, marginTop:1 }}>{i+1}</span>
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>{s}</span>
                  </div>
                ))}
                <div style={{ marginTop:14, background:"rgba(255,159,10,0.06)", border:"1px solid rgba(255,159,10,0.15)", borderRadius:10, padding:"11px 14px", display:"flex", gap:10 }}>
                  <span style={{ fontSize:13 }}>⚠️</span>
                  <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"rgba(255,159,10,0.8)", lineHeight:1.6 }}>{pick.hint.watch}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Answer */}
        <div style={{ ...CARD, marginBottom:16 }} className="fade-in-delay-2">
          <div style={{ padding:"16px 18px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em", textTransform:"uppercase" }}>Your Answer</span>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color: answer.length<60 ? "#FF453A" : "rgba(255,255,255,0.25)" }}>
              {answer.length<60 ? `${60-answer.length} more characters` : `${answer.length} chars`}
            </span>
          </div>
          <textarea value={answer} onChange={e=>setAnswer(e.target.value)}
            placeholder={"Name a framework. Be specific. Think out loud.\nVague answers will be called out — make this count."}
            style={{ width:"100%", minHeight:200, background:"transparent", border:"none", color:"rgba(255,255,255,0.85)", fontFamily:"Inter,sans-serif", fontSize:15, padding:"14px 18px 18px", lineHeight:1.75, resize:"vertical", display:"block" }}
          />
        </div>

        <div style={{ display:"flex", gap:10 }} className="fade-in-delay-3">
          <button onClick={() => setPhase("home")} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"13px 20px", color:"rgba(255,255,255,0.6)", fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:500 }}>Cancel</button>
          <button className="pill-btn" onClick={submitAnswer} disabled={answer.length<60} style={{ flex:1, background: answer.length>=60 ? "#0A84FF" : "rgba(10,132,255,0.2)", border:"none", borderRadius:12, padding:"13px 20px", color: answer.length>=60 ? "#fff" : "rgba(10,132,255,0.4)", fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:600, opacity: answer.length<60 ? 0.5 : 1, transition:"all 0.15s" }}>
            Submit for Assessment
          </button>
        </div>

      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────
  if (phase === "result") return (
    <div style={ROOT}>
      <style>{APPLE_FONTS}</style>
      <div style={WRAP}>

        {/* Nav */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"52px 0 24px" }} className="fade-in">
          <button onClick={() => setPhase("home")} style={{ background:"none", border:"none", color:"#0A84FF", fontFamily:"Inter,sans-serif", fontSize:16, fontWeight:400, padding:0, display:"flex", alignItems:"center", gap:4 }}>
            <svg width="10" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L2 8L8 14" stroke="#0A84FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
          {trackType && <TrackChip track={trackType}/>}
          {pick && <Tag label={pick.tag} color={pick.color}/>}
          <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(255,255,255,0.25)", marginLeft:"auto" }}>Assessment</span>
        </div>

        {/* Overall score */}
        {scores && (
          <div style={{ ...CARD, marginBottom:12, padding:"28px 24px", textAlign:"center" }} className="fade-in-delay-1">
            <div style={{ fontFamily:"Inter,sans-serif", fontSize:72, fontWeight:700, letterSpacing:"-0.04em", lineHeight:1, color: scores.overall>=7?"#30D158":scores.overall>=5?"#FF9F0A":"#FF453A" }}>{scores.overall}</div>
            <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"rgba(255,255,255,0.3)", marginTop:4 }}>out of 10</div>
            <div style={{ marginTop:14, padding:"8px 18px", background: scores.overall>=7?"rgba(48,209,88,0.08)":scores.overall>=5?"rgba(255,159,10,0.08)":"rgba(255,69,58,0.08)", borderRadius:20, display:"inline-block" }}>
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:500, color: scores.overall>=7?"#30D158":scores.overall>=5?"#FF9F0A":"#FF453A" }}>
                {scores.overall>=7?"Solid junior PM thinking":scores.overall>=5?"Good foundation, keep building":"Real gaps to close — let's fix them"}
              </span>
            </div>
          </div>
        )}

        {/* Score breakdown */}
        {scores && (
          <div style={{ ...CARD, marginBottom:12 }} className="fade-in-delay-2">
            <div style={SECTION_LABEL}>Score Breakdown</div>
            <div style={{ padding:"0 18px 16px" }}>
              <ScoreBar label="Structured Thinking" score={scores.structured} delay={0}/>
              <ScoreBar label="Business Acumen" score={scores.business} delay={100}/>
              <ScoreBar label="Specificity & Depth" score={scores.depth} delay={200}/>
              <ScoreBar label="PM Maturity" score={scores.maturity} delay={300}/>
            </div>
          </div>
        )}

        {/* Assessment */}
        <div style={{ ...CARD, marginBottom:12 }} className="fade-in-delay-3">
          <div style={SECTION_LABEL}>Assessment</div>
          <div style={{ padding:"4px 18px 20px" }}>{renderMD(assessment)}</div>
        </div>

        {/* Answer key */}
        {answerKey && (
          <div style={{ ...CARD, marginBottom:16, border: showKey ? "1px solid rgba(48,209,88,0.2)" : "1px solid rgba(255,255,255,0.09)", transition:"border 0.2s" }} className="fade-in-delay-4">
            <button onClick={() => setShowKey(o=>!o)} style={{ background:"none", border:"none", width:"100%", display:"flex", alignItems:"center", gap:12, padding:"16px 18px", fontFamily:"Inter,sans-serif" }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(48,209,88,0.1)", border:"1px solid rgba(48,209,88,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:14 }}>🔑</span>
              </div>
              <div style={{ textAlign:"left", flex:1 }}>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.8)" }}>Answer Key</div>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"rgba(48,209,88,0.7)", marginTop:1 }}>What a strong answer looks like</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform:showKey?"rotate(180deg)":"rotate(0)", transition:"transform 0.2s" }}>
                <path d="M4 6L8 10L12 6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showKey && (
              <div style={{ padding:"0 18px 20px", borderTop:"1px solid rgba(48,209,88,0.12)", paddingTop:16 }}>
                {renderMD(answerKey, true)}
              </div>
            )}
          </div>
        )}

        <button className="pill-btn" onClick={() => setPhase("home")} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"14px", color:"rgba(255,255,255,0.7)", fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:500 }}>
          Back to Home
        </button>

      </div>
    </div>
  );

  return null;
}
