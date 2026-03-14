import { useState, useEffect } from "react";

function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

const CHALLENGES = {
  B2B: [
    { tag: "PRIORITIZATION", color: "#7C3AED",
      hint: { framework: "RICE or MoSCoW", steps: ["Name your framework and justify the choice","Score each backlog item — don't just list them","Address the compliance deadline and churn risk explicitly","End with a ranked list and what gets cut if capacity runs out"], watch: "Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag: "METRICS", color: "#0284C7",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you observe in the data first","Generate 2-3 root cause hypotheses","Identify what data is missing","Define 2-3 metrics you'd add to the dashboard"], watch: "Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag: "STAKEHOLDER", color: "#0F766E",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder truly wants beneath their stated position","Spot any shared goals or constraints","Make a concrete decision — don't sit on the fence","State who gets which message and how"], watch: "PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "STRATEGY", color: "#15803D",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 sentences","Name 2-3 strategic options","Pick one and defend it with business reasoning","Explicitly state what you would NOT do and why"], watch: "Every strategy needs a trade-off. What are you giving up?" },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "EXECUTION", color: "#B45309",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What is most critical in the next 2 hours?","Who do you talk to and in what order?","What do you cut or defer?","How do you run the retrospective after?"], watch: "Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  B2C: [
    { tag: "PRIORITIZATION", color: "#7C3AED",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework and why it fits B2C","Consider user volume, engagement, and retention for each item","Factor in competitor timing and seasonal context","Give a final ranked order and what gets cut"], watch: "B2C is about user love at scale. Delight is a valid business metric." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "METRICS", color: "#0284C7",
      hint: { framework: "AARRR Funnel", steps: ["Map each metric to its funnel stage","Identify the biggest drop-off point","Form 2-3 hypotheses for the drop-off","Pick one metric to fix first and defend the choice"], watch: "Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag: "GROWTH", color: "#15803D",
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

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #FAFAF9; }
  ::selection { background: #DDD6FE; }
  textarea { outline: none; resize: vertical; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes barGrow { from { width:0; } to { width:var(--w); } }
  .au { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .au1 { animation: fadeUp 0.4s 0.05s cubic-bezier(0.16,1,0.3,1) both; }
  .au2 { animation: fadeUp 0.4s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
  .au3 { animation: fadeUp 0.4s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
  .au4 { animation: fadeUp 0.4s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
  .challenge-card:hover { border-color: #C4B5FD !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.06) !important; }
  .challenge-card:hover .challenge-arrow { transform: translateX(3px); opacity:1 !important; }
  .action-btn:hover { background: #7C3AED !important; color: #fff !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,58,237,0.25); }
  .action-btn:active { transform: translateY(0); }
  .secondary-btn:hover { background: #F5F3FF !important; border-color: #C4B5FD !important; color: #7C3AED !important; }
  .track-card:hover { border-color: #A78BFA !important; background: #F5F3FF !important; box-shadow: 0 4px 20px rgba(124,58,237,0.08) !important; }
  .track-card:hover .track-arrow { opacity:1 !important; transform: translateX(3px); }
  .hint-toggle:hover { background: #F9F7FF !important; }
  .history-row:hover { background: #FAFAF9; }
  .back-btn:hover { color: #7C3AED !important; }
`;

function renderMD(text, isKey = false) {
  const accent = isKey ? "#15803D" : "#1C1917";
  const body = isKey ? "#166534" : "#57534E";
  return text.trim().split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**"))
      return <p key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color: isKey ? "#16A34A" : "#A8A29E", marginTop:22, marginBottom:8 }}>{line.replace(/\*\*/g,"")}</p>;
    if (line.includes("━")) return <div key={i} style={{ height:1, background:"#F0EDEA", margin:"10px 0" }}/>;
    if (!line.trim()) return <div key={i} style={{ height:8 }}/>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:15, lineHeight:1.8, color: body, fontWeight:400 }}>
      {parts.map((p,j) => p.startsWith("**") ? <strong key={j} style={{ color:accent, fontWeight:600 }}>{p.replace(/\*\*/g,"")}</strong> : p)}
    </p>;
  });
}

function ScoreBar({ label, score, delay=0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score*10), 200+delay); return () => clearTimeout(t); }, [score]);
  const color = score>=7?"#16A34A":score>=5?"#D97706":"#DC2626";
  const bg = score>=7?"#DCFCE7":score>=5?"#FEF3C7":"#FEE2E2";
  return (
    <div style={{ padding:"12px 0", borderBottom:"1px solid #F5F3F0" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"#78716C", fontWeight:400 }}>{label}</span>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, fontWeight:600, color, background:bg, padding:"2px 10px", borderRadius:99 }}>{score}/10</span>
      </div>
      <div style={{ height:4, background:"#F0EDEA", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:`${w}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.9s cubic-bezier(0.4,0,0.2,1)" }}/>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(124,58,237,0.3)" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 13L7 7L10 10L13 5L15 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="15" cy="4" r="1.5" fill="white"/>
        </svg>
      </div>
      <span style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:16, color:"#1C1917", letterSpacing:"-0.02em" }}>PM Training</span>
    </div>
  );
}

function Tag({ label, color }) {
  return <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:500, color, background:`${color}12`, padding:"3px 10px", borderRadius:99, border:`1px solid ${color}25` }}>{label}</span>;
}

function TrackBadge({ track }) {
  const c = track==="B2C" ? "#0284C7" : "#7C3AED";
  return <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:c, background:`${c}10`, padding:"3px 10px", borderRadius:99, border:`1px solid ${c}20` }}>{track}</span>;
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
  const [totalSessions, setTotalSessions] = useState(0);
  const [highScores, setHighScores] = useState(0);
  const [avgScore, setAvgScore] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [sessionCount, setSessionCount] = useState(0);

  const today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

  useEffect(() => {
    const hR = storageList("pm_session:");
    if (hR?.keys?.length) {
      const s = hR.keys.map(k => { const r = storageGet(k); return r ? JSON.parse(r.value) : null; }).filter(Boolean).reverse();
      setHistory(s.slice(0,30));
      setTotalSessions(s.length);
      setHighScores(s.filter(x => x.scores?.overall >= 7).length);
      const withScores = s.filter(x => x.scores?.overall);
      if (withScores.length) setAvgScore(Math.round(withScores.reduce((a,b) => a + b.scores.overall, 0) / withScores.length * 10) / 10);
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
      setAssessment(idx>-1 ? result.slice(0,idx) : result);
      setAnswerKey(idx>-1 ? result.slice(idx+9) : "");
      setShowKey(false);
      const m = (l) => { const r = new RegExp(l+"[:\\s]+(\\d+)/10","i"); const x=result.match(r); return x?parseInt(x[1]):5; };
      const s = { structured:m("Structured Thinking"), business:m("Business Acumen"), depth:m("Specificity"), maturity:m("PM Maturity"), overall:m("Overall") };
      setScores(s); saveSession(s); setPhase("result");
    } catch(e) { setError(e.message); setPhase("answering"); }
  }

  function saveSession(s) {
    storageSet("pm_last_tag", pick?.tag);
    const key = `pm_session:${Date.now()}`;
    storageSet(key, JSON.stringify({ date:new Date().toISOString().slice(0,10), tag:pick?.tag, track:trackType, scores:s }));
    const newSession = { date:new Date().toISOString().slice(0,10), tag:pick?.tag, track:trackType, scores:s };
    setHistory(prev => [newSession, ...prev].slice(0,30));
    setTotalSessions(p => p+1);
    setSessionCount(p => p+1);
    if (s.overall>=7) setHighScores(p => p+1);
    const allH = [newSession, ...history];
    const ws = allH.filter(x => x.scores?.overall);
    if (ws.length) setAvgScore(Math.round(ws.reduce((a,b) => a+b.scores.overall,0)/ws.length*10)/10);
  }

  // ── Design tokens ─────────────────────────────────────────────────────
  const PAGE = { fontFamily:"Inter,sans-serif", background:"#FAFAF9", minHeight:"100vh", color:"#1C1917", WebkitFontSmoothing:"antialiased" };
  const CONTAINER = { maxWidth:660, margin:"0 auto", padding:"0 24px 80px" };
  const CARD = { background:"#FFFFFF", border:"1px solid #E8E3DE", borderRadius:16, overflow:"hidden" };
  const DIVIDER = { height:1, background:"#F5F1EE", margin:"0" };

  // ── LOADING ───────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{ ...PAGE, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, minHeight:"100vh" }}>
      <style>{G}</style>
      <div style={{ width:32, height:32, border:"2.5px solid #E8E3DE", borderTopColor:"#7C3AED", borderRadius:"50%", animation:"spin 0.75s linear infinite" }}/>
      <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"#A8A29E", fontWeight:400 }}>Loading your challenge…</p>
    </div>
  );

  // ── HOME ──────────────────────────────────────────────────────────────
  if (phase === "home") return (
    <div style={PAGE}>
      <style>{G}</style>
      <div style={CONTAINER}>

        {/* Top nav */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"40px 0 36px" }} className="au">
          <Logo />
          <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"#A8A29E", fontWeight:400 }}>{today}</div>
        </div>

        {/* Hero */}
        <div style={{ marginBottom:32 }} className="au1">
          <h1 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:32, color:"#1C1917", letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:10 }}>
            Good day, Siddhant.
          </h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:16, color:"#78716C", lineHeight:1.6, fontWeight:400 }}>
            Practice makes permanent. Pick a track and sharpen your PM thinking.
          </p>
        </div>

        {error && (
          <div style={{ ...CARD, background:"#FFF5F5", border:"1px solid #FECACA", padding:"14px 18px", marginBottom:16 }} className="au">
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"#DC2626" }}>⚠ {error}</p>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:12 }} className="au2">
          {[
            { value: totalSessions, label:"Total sessions", icon:"📚" },
            { value: highScores, label:"Scored 7 or above", icon:"⭐" },
            { value: avgScore ?? "—", label:"Average score", icon:"📈" },
          ].map((s,i) => (
            <div key={i} style={{ ...CARD, padding:"20px 18px" }}>
              <div style={{ fontSize:20, marginBottom:10 }}>{s.icon}</div>
              <div style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:26, color:"#1C1917", letterSpacing:"-0.03em", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"#A8A29E", marginTop:5, lineHeight:1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Track selection */}
        <div style={{ ...CARD, marginBottom:12 }} className="au2">
          <div style={{ padding:"20px 20px 14px" }}>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#A8A29E", marginBottom:16 }}>Choose Your Track</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { type:"B2B", icon:"🏢", label:"B2B / Enterprise", desc:"Compliance deadlines, stakeholder politics, platform products, enterprise churn.", types:["Prioritization","Metrics","Stakeholder","Strategy","Execution"] },
                { type:"B2C", icon:"📱", label:"B2C / Consumer", desc:"Growth loops, retention funnels, user research, consumer-facing incidents.", types:["Prioritization","Metrics","Growth","User Research","Execution"] },
              ].map(({ type, icon, label, desc, types }) => (
                <button key={type} className="track-card" onClick={() => startChallenge(type)} style={{ background:"#FAFAF9", border:"1.5px solid #E8E3DE", borderRadius:12, padding:"18px 20px", textAlign:"left", fontFamily:"Inter,sans-serif", width:"100%", transition:"all 0.2s", cursor:"pointer" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", gap:14, flex:1 }}>
                      <span style={{ fontSize:24, flexShrink:0, marginTop:1 }}>{icon}</span>
                      <div>
                        <div style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:15, color:"#1C1917", marginBottom:4 }}>{label}</div>
                        <div style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"#78716C", lineHeight:1.6, marginBottom:10 }}>{desc}</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {types.map(t => <span key={t} style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"#A8A29E", background:"#F5F3F0", padding:"2px 9px", borderRadius:99 }}>{t}</span>)}
                        </div>
                      </div>
                    </div>
                    <svg className="track-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity:0.3, transition:"all 0.2s", marginTop:4, flexShrink:0 }}>
                      <path d="M3 8H13M9 4L13 8L9 12" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={DIVIDER}/>
          <div style={{ padding:"14px 20px" }}>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"#A8A29E", lineHeight:1.6 }}>
              No daily limits — practice as many challenges as you want. Each session is saved and tracked.
              {sessionCount > 0 && <span style={{ color:"#7C3AED", fontWeight:500 }}> {sessionCount} completed this session.</span>}
            </p>
          </div>
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div style={{ ...CARD }} className="au3">
            <div style={{ padding:"18px 20px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#A8A29E" }}>Recent Sessions</p>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"#C4B5A8" }}>{totalSessions} total</p>
            </div>
            {history.slice(0,8).map((s,i) => {
              const tagColor = CHALLENGES.B2B.concat(CHALLENGES.B2C).find(c=>c.tag===s.tag)?.color||"#78716C";
              const sc = s.scores?.overall;
              const scColor = sc>=7?"#16A34A":sc>=5?"#D97706":"#DC2626";
              const scBg = sc>=7?"#DCFCE7":sc>=5?"#FEF3C7":"#FEE2E2";
              return (
                <div key={i}>
                  {i > 0 && <div style={DIVIDER}/>}
                  <div className="history-row" style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 20px", transition:"background 0.15s" }}>
                    <TrackBadge track={s.track||"B2B"}/>
                    <Tag label={s.tag} color={tagColor}/>
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"#C4B5A8", flex:1 }}>{s.date}</span>
                    {sc && <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, fontWeight:600, color:scColor, background:scBg, padding:"2px 10px", borderRadius:99 }}>{sc}/10</span>}
                  </div>
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
    <div style={PAGE}>
      <style>{G}</style>
      <div style={CONTAINER}>

        {/* Nav */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"36px 0 28px" }} className="au">
          <button className="back-btn" onClick={() => setPhase("home")} style={{ background:"none", border:"none", display:"flex", alignItems:"center", gap:6, color:"#78716C", fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:500, padding:0, transition:"color 0.15s" }}>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
          <span style={{ color:"#E8E3DE" }}>·</span>
          {trackType && <TrackBadge track={trackType}/>}
          {pick && <Tag label={pick.tag} color={pick.color}/>}
        </div>

        {/* Challenge card */}
        <div style={{ ...CARD, marginBottom:12 }} className="au1">
          <div style={{ padding:"20px 22px 0", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:pick?.color }}/>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#A8A29E" }}>Challenge</span>
          </div>
          <div style={{ padding:"14px 22px 22px", fontFamily:"Inter,sans-serif", fontSize:15, color:"#3D3834", lineHeight:1.85, whiteSpace:"pre-wrap" }}>{challenge}</div>
        </div>

        {/* Hint */}
        {pick?.hint && (
          <div style={{ ...CARD, marginBottom:12 }} className="au1">
            <button className="hint-toggle" onClick={() => setHintOpen(o=>!o)} style={{ background:"none", border:"none", width:"100%", display:"flex", alignItems:"center", gap:12, padding:"18px 22px", fontFamily:"Inter,sans-serif", cursor:"pointer", textAlign:"left", transition:"background 0.15s", borderRadius:16 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:"#FEF9C3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1px solid #FDE047" }}>
                <span style={{ fontSize:15 }}>💡</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:600, color:"#1C1917" }}>Framework Hint</div>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"#D97706", marginTop:1 }}>{pick.hint.framework}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform:hintOpen?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}>
                <path d="M4 6L8 10L12 6" stroke="#C4B5A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {hintOpen && (
              <div style={{ padding:"0 22px 20px", borderTop:"1px solid #F5F1EE" }}>
                <div style={{ paddingTop:16 }}>
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, color:"#A8A29E", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:14 }}>How to structure your answer</p>
                  {pick.hint.steps.map((s,i) => (
                    <div key={i} style={{ display:"flex", gap:12, marginBottom:10, padding:"6px 0" }}>
                      <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, color:"#D97706", minWidth:20 }}>{i+1}.</span>
                      <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"#57534E", lineHeight:1.65 }}>{s}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:14, background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>⚠️</span>
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:"#92400E", lineHeight:1.65 }}>{pick.hint.watch}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Answer */}
        <div style={{ ...CARD, marginBottom:16 }} className="au2">
          <div style={{ padding:"18px 22px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#A8A29E" }}>Your Answer</span>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color: answer.length<60?"#EF4444":"#C4B5A8", transition:"color 0.2s" }}>
              {answer.length<60 ? `${60-answer.length} more chars` : `${answer.length} chars`}
            </span>
          </div>
          <textarea value={answer} onChange={e=>setAnswer(e.target.value)}
            placeholder={"Name a framework. Apply it. Be specific.\n\nVague answers will be called out — treat this like a real interview."}
            style={{ width:"100%", minHeight:220, background:"transparent", border:"none", color:"#1C1917", fontFamily:"Inter,sans-serif", fontSize:15, padding:"14px 22px 20px", lineHeight:1.8 }}
            onFocus={e=>{e.currentTarget.parentElement.style.borderColor="#C4B5FD"; e.currentTarget.parentElement.style.boxShadow="0 0 0 3px rgba(124,58,237,0.06)";}}
            onBlur={e=>{e.currentTarget.parentElement.style.borderColor="#E8E3DE"; e.currentTarget.parentElement.style.boxShadow="none";}}
          />
        </div>

        <div style={{ display:"flex", gap:10 }} className="au3">
          <button className="secondary-btn" onClick={() => setPhase("home")} style={{ background:"#fff", border:"1.5px solid #E8E3DE", borderRadius:12, padding:"13px 22px", color:"#78716C", fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:500, transition:"all 0.2s" }}>
            Cancel
          </button>
          <button className="action-btn" onClick={submitAnswer} disabled={answer.length<60} style={{ flex:1, background: answer.length>=60?"#7C3AED":"#E8E3DE", border:"none", borderRadius:12, padding:"13px 22px", color: answer.length>=60?"#fff":"#A8A29E", fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:600, transition:"all 0.2s" }}>
            Submit for Assessment →
          </button>
        </div>

      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────
  if (phase === "result") return (
    <div style={PAGE}>
      <style>{G}</style>
      <div style={CONTAINER}>

        {/* Nav */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"36px 0 28px" }} className="au">
          <button className="back-btn" onClick={() => setPhase("home")} style={{ background:"none", border:"none", display:"flex", alignItems:"center", gap:6, color:"#78716C", fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:500, padding:0, transition:"color 0.15s" }}>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
          <span style={{ color:"#E8E3DE" }}>·</span>
          {trackType && <TrackBadge track={trackType}/>}
          {pick && <Tag label={pick.tag} color={pick.color}/>}
          <span style={{ marginLeft:"auto", fontFamily:"Inter,sans-serif", fontSize:12, color:"#C4B5A8" }}>Assessment</span>
        </div>

        {/* Score hero */}
        {scores && (
          <div style={{ ...CARD, marginBottom:12, textAlign:"center", padding:"36px 24px" }} className="au1">
            <div style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:80, letterSpacing:"-0.04em", lineHeight:1, color: scores.overall>=7?"#16A34A":scores.overall>=5?"#D97706":"#DC2626" }}>{scores.overall}</div>
            <div style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"#A8A29E", marginTop:4, fontWeight:400 }}>out of 10</div>
            <div style={{ marginTop:16, display:"inline-block", background: scores.overall>=7?"#DCFCE7":scores.overall>=5?"#FEF3C7":"#FEE2E2", borderRadius:99, padding:"8px 20px" }}>
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:500, color: scores.overall>=7?"#15803D":scores.overall>=5?"#92400E":"#991B1B" }}>
                {scores.overall>=7 ? "Solid junior PM thinking 💪" : scores.overall>=5 ? "Good foundation, keep building 📈" : "Real gaps to close — let's fix them 🎯"}
              </span>
            </div>
          </div>
        )}

        {/* Score breakdown */}
        {scores && (
          <div style={{ ...CARD, marginBottom:12 }} className="au2">
            <div style={{ padding:"18px 22px 0" }}>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#A8A29E", marginBottom:4 }}>Score Breakdown</p>
            </div>
            <div style={{ padding:"0 22px 16px" }}>
              <ScoreBar label="Structured Thinking" score={scores.structured} delay={0}/>
              <ScoreBar label="Business Acumen" score={scores.business} delay={100}/>
              <ScoreBar label="Specificity & Depth" score={scores.depth} delay={200}/>
              <ScoreBar label="PM Maturity" score={scores.maturity} delay={300}/>
            </div>
          </div>
        )}

        {/* Assessment */}
        <div style={{ ...CARD, marginBottom:12 }} className="au3">
          <div style={{ padding:"18px 22px 0" }}>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#A8A29E" }}>Assessment</p>
          </div>
          <div style={{ padding:"8px 22px 22px" }}>{renderMD(assessment)}</div>
        </div>

        {/* Answer key */}
        {answerKey && (
          <div style={{ ...CARD, marginBottom:20, border: showKey?"1.5px solid #BBF7D0":"1px solid #E8E3DE", transition:"border 0.25s" }} className="au4">
            <button onClick={() => setShowKey(o=>!o)} style={{ background:"none", border:"none", width:"100%", display:"flex", alignItems:"center", gap:12, padding:"18px 22px", fontFamily:"Inter,sans-serif", cursor:"pointer", textAlign:"left" }}>
              <div style={{ width:32, height:32, borderRadius:10, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1px solid #BBF7D0" }}>
                <span style={{ fontSize:15 }}>🔑</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:600, color:"#1C1917" }}>Answer Key</div>
                <div style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"#16A34A", marginTop:1 }}>What a strong answer looks like</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform:showKey?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}>
                <path d="M4 6L8 10L12 6" stroke="#C4B5A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showKey && (
              <div style={{ padding:"0 22px 22px", borderTop:"1px solid #DCFCE7" }}>
                <div style={{ paddingTop:16 }}>{renderMD(answerKey, true)}</div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:10 }} className="au4">
          <button className="secondary-btn" onClick={() => setPhase("home")} style={{ background:"#fff", border:"1.5px solid #E8E3DE", borderRadius:12, padding:"13px 22px", color:"#78716C", fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:500, transition:"all 0.2s" }}>
            Back to Home
          </button>
          <button className="action-btn" onClick={() => { setPhase("home"); setTimeout(() => startChallenge(trackType), 50); }} style={{ flex:1, background:"#7C3AED", border:"none", borderRadius:12, padding:"13px 22px", color:"#fff", fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:600, transition:"all 0.2s" }}>
            Another Challenge →
          </button>
        </div>

      </div>
    </div>
  );

  return null;
}
