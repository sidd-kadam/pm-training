import { useState, useEffect } from "react";

function storageGet(key) {
  try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return { value }; } catch { return null; }
}
function storageList(prefix) {
  try { const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix)); return { keys }; } catch { return { keys: [] }; }
}

const CHALLENGES = {
  B2B: [
    { tag: "PRIORITIZATION", color: "#f59e0b",
      hint: { framework: "RICE or MoSCoW", steps: ["State your framework and why","Score each feature — justify every call","Address the compliance deadline and churn risk","Give a final priority order and what gets cut"], watch: "Describe features less. Defend trade-offs more." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customers), 5 backlog items with effort/value, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be concise.` },
    { tag: "METRICS", color: "#06b6d4",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you see first","List 2-3 root cause hypotheses","Identify missing data","Define 2-3 metrics to add"], watch: "One data point is never enough to diagnose." },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose and plan next steps. Be concise.` },
    { tag: "STAKEHOLDER", color: "#8b5cf6",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder really wants","Spot shared goals","Make a concrete decision","Say who gets what message"], watch: "Don't mediate. Decide." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, real motivations, 1 sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "STRATEGY", color: "#10b981",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 lines","Name 2-3 options","Pick one with business reasoning","State what you would NOT do"], watch: "Every strategy needs a trade-off." },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads, fake market data, real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "EXECUTION", color: "#f97316",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What needs fixing in the next 2 hours?","Who do you talk to first?","What do you cut or defer?","How do you run the retro?"], watch: "Focus and communicate. Not heroics." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  B2C: [
    { tag: "PRIORITIZATION", color: "#f59e0b",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework","Consider user volume and retention impact","Factor in competitor timing","Give final order and what gets cut"], watch: "B2C is about user love at scale. Delight matters." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app (social/fitness/fintech), 5 backlog items, competitor just launched similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "METRICS", color: "#06b6d4",
      hint: { framework: "AARRR Funnel", steps: ["Map metrics to funnel stage","Find the biggest drop-off","Form 2-3 hypotheses","Pick one metric to fix first"], watch: "Find the leak in the funnel. Don't look at one metric alone." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem (sign-up drop, D7 retention dip, or low referral). 5 fake metrics, one red herring. Ask: diagnose and recommend one focus. Be concise.` },
    { tag: "GROWTH", color: "#10b981",
      hint: { framework: "Growth Loops", steps: ["Identify which loop is broken","Pick ONE lever to pull","Define how you'd measure success","Estimate potential impact"], watch: "Growth is a system. Fix the loop, don't just add features." },
      prompt: `B2C growth challenge for a junior PM. Consumer app that has plateaued, fake metrics showing the problem, limited engineering. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag: "USER RESEARCH", color: "#ef4444",
      hint: { framework: "Jobs To Be Done", steps: ["What job is each user hiring the product for?","Find the gap between expectation and reality","Separate pain points from nice-to-haves","Recommend what to build and what to ignore"], watch: "Focus on what users DO, not what they SAY." },
      prompt: `B2C user research challenge for a junior PM. 3 user types (power, casual, churned) giving conflicting feedback. Mix of emotional and feature-specific. Ask: synthesize and decide what to build. Be concise.` },
    { tag: "EXECUTION", color: "#f97316",
      hint: { framework: "Triage → Communicate → Ship", steps: ["What is breaking user experience RIGHT NOW?","Hotfix now or proper fix — pick one","Communicate to users if visible","Define what done looks like"], watch: "B2C crises are public. Users tweet. Think beyond internal teams." },
      prompt: `B2C app execution crisis for a junior PM. Consumer-facing incident, public user impact, social media pressure, engineering says 4 hours to fix. Ask: how does the PM handle this? Be concise.` },
  ]
};

const ASSESS_SYSTEM = `You are a PM coach for a junior PM (0-2 years). Be direct, encouraging, and concise.

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
1-2 gaps only. Be direct but kind.

**ONE THING TO FIX**
Single most impactful improvement. Make it concrete.

**COACH'S NOTE**
1-2 sentences of real encouragement.

---KEY---

**STRONG ANSWER EXAMPLE**
Write a 120-word model answer for this exact challenge. Show structure, framework, business reasoning. Educational and specific.`;

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

function renderLines(text, baseColor = "#94a3b8") {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**"))
      return <div key={i} style={{ fontWeight: 700, color: "#e2e8f0", marginTop: 18, marginBottom: 5, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{line.replace(/\*\*/g, "")}</div>;
    if (line.includes("━")) return <div key={i} style={{ borderTop: "1px solid #1e293b", margin: "6px 0" }} />;
    if (!line.trim()) return <div key={i} style={{ height: 4 }} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <div key={i} style={{ color: baseColor, fontSize: 14, lineHeight: 1.75 }}>{parts.map((p, j) => p.startsWith("**") ? <strong key={j} style={{ color: "#cbd5e1" }}>{p.replace(/\*\*/g, "")}</strong> : p)}</div>;
  });
}

function Bar({ label, score }) {
  const color = score >= 7 ? "#4ade80" : score >= 5 ? "#facc15" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <div style={{ fontSize: 12, color: "#64748b", width: 160, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 5, background: "#1e293b", borderRadius: 9 }}>
        <div style={{ width: `${score * 10}%`, height: "100%", background: color, borderRadius: 9, transition: "width 1.2s ease" }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color, width: 40, textAlign: "right" }}>{score}/10</div>
    </div>
  );
}

export default function PMApp() {
  const [phase, setPhase] = useState("home");
  const [trackType, setTrackType] = useState(null);
  const [challenge, setChallenge] = useState("");
  const [tag, setTag] = useState(null);
  const [tagColor, setTagColor] = useState("#f59e0b");
  const [hint, setHint] = useState(null);
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

  useEffect(() => {
    const streakR = storageGet("pm_streak");
    const lastR = storageGet("pm_last_date");
    const histR = storageList("pm_session:");
    if (streakR) setStreak(parseInt(streakR.value) || 0);
    if (lastR?.value === today) setTodayDone(true);
    if (histR?.keys?.length) {
      const sessions = histR.keys.slice(-30).map(k => {
        const r = storageGet(k); return r ? JSON.parse(r.value) : null;
      }).filter(Boolean).reverse();
      setHistory(sessions);
      setTotal(sessions.length);
      setHighScores(sessions.filter(s => s.scores?.overall >= 7).length);
    }
  }, []);

  async function startChallenge(track) {
    setTrackType(track);
    setPhase("loading");
    setError("");
    const pool = CHALLENGES[track];
    const lastR = storageGet("pm_last_tag");
    let filtered = pool.filter(c => c.tag !== lastR?.value);
    if (!filtered.length) filtered = pool;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setTag(pick.tag); setTagColor(pick.color); setHint(pick.hint); setHintOpen(false);
    try {
      const text = await callClaude(`You are a ${track} PM coach. Generate a concise, specific challenge.`, pick.prompt);
      setChallenge(text); setAnswer(""); setPhase("answering");
    } catch (e) {
      setError("API error: " + e.message);
      setPhase("home");
    }
  }

  async function submitAnswer() {
    if (answer.trim().length < 60) return;
    setPhase("loading");
    setError("");
    try {
      const result = await callClaude(
        ASSESS_SYSTEM,
        `TRACK: ${trackType}\nTYPE: ${tag}\n\nCHALLENGE:\n${challenge}\n\nANSWER:\n${answer}`
      );
      const splitIdx = result.indexOf("---KEY---");
      setAssessment(splitIdx > -1 ? result.slice(0, splitIdx) : result);
      setAnswerKey(splitIdx > -1 ? result.slice(splitIdx + 9) : "");
      setShowKey(false);
      const m = (l) => { const r = new RegExp(l + "[:\\s]+(\\d+)/10","i"); const x = result.match(r); return x ? parseInt(x[1]) : 5; };
      const s = { structured: m("Structured Thinking"), business: m("Business Acumen"), depth: m("Specificity"), maturity: m("PM Maturity"), overall: m("Overall") };
      setScores(s);
      saveSession(s);
      setPhase("result");
    } catch (e) {
      setError("Assessment error: " + e.message);
      setPhase("answering");
    }
  }

  function saveSession(s) {
    const lastR = storageGet("pm_last_date");
    const yest = new Date(); yest.setDate(yest.getDate()-1);
    const yStr = yest.toISOString().slice(0,10);
    const streakR = storageGet("pm_streak");
    let cur = parseInt(streakR?.value||"0");
    if (lastR?.value===yStr) cur+=1;
    else if (lastR?.value!==today) cur=1;
    storageSet("pm_streak", String(cur));
    storageSet("pm_last_date", today);
    storageSet("pm_last_tag", tag);
    storageSet(`pm_session:${today}:${Date.now()}`, JSON.stringify({date:today,tag,track:trackType,scores:s}));
    setStreak(cur); setTodayDone(true);
    setTotal(p=>p+1);
    if(s.overall>=7) setHighScores(p=>p+1);
    setHistory(prev=>[{date:today,tag,track:trackType,scores:s},...prev].slice(0,30));
  }

  const font = "'IBM Plex Mono', monospace";
  const base = { fontFamily: font, background: "#080d1a", minHeight: "100vh", color: "#e2e8f0", padding: "24px 18px" };
  const card = (x={}) => ({ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 10, padding: 20, marginBottom: 12, ...x });
  const pill = (c) => ({ fontSize: 10, padding: "3px 9px", borderRadius: 4, background: c+"18", color: c, letterSpacing: "0.1em", fontWeight: 700 });
  const btn = (bg, fg="#080d1a", off=false) => ({ background:bg, color:fg, border:"none", borderRadius:7, padding:"11px 22px", fontFamily:font, fontWeight:700, fontSize:12, cursor:off?"default":"pointer", letterSpacing:"0.04em", opacity:off?0.4:1 });

  // LOADING
  if (phase==="loading") return (
    <div style={{...base, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{fontSize:28, marginBottom:12, animation:"spin 1.6s linear infinite"}}>◌</div>
      <div style={{color:"#475569", fontSize:12}}>Loading your challenge…</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // HOME
  if (phase==="home") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:600, margin:"0 auto"}}>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:10, color:"#f59e0b", letterSpacing:"0.18em", marginBottom:6}}>PM DAILY TRAINING</div>
          <div style={{fontSize:22, fontWeight:700, color:"#f1f5f9"}}>Hey Siddhant 👋</div>
          <div style={{fontSize:12, color:"#3d5070", marginTop:4}}>One challenge. One assessment. Every day. v2</div>
        </div>

        {error && <div style={{...card({borderColor:"#ef444433", background:"#1a0808"}), fontSize:13, color:"#f87171", marginBottom:12}}>{error}</div>}

        <div style={{...card(), display:"flex"}}>
          {[["STREAK",streak,streak>0?"#f59e0b":"#334155"],["TOTAL",total,"#06b6d4"],["7+ SCORES",highScores,"#8b5cf6"]].map(([l,v,c],i)=>(
            <div key={i} style={{flex:1, textAlign:"center", borderRight:i<2?"1px solid #1a2540":"none", padding:"4px 0"}}>
              <div style={{fontSize:26, fontWeight:700, color:c}}>{v}</div>
              <div style={{fontSize:10, color:"#334155", letterSpacing:"0.08em"}}>{l}</div>
            </div>
          ))}
        </div>

        {todayDone ? (
          <div style={card()}>
            <div style={{fontSize:12, color:"#4ade80", marginBottom:8}}>✓ Today's challenge done</div>
            <div style={{fontSize:13, color:"#3d5070", lineHeight:1.7, marginBottom:14}}>Come back tomorrow. Consistency beats intensity.</div>
            <button style={btn("#1a2540","#64748b")} onClick={()=>setPhase("result")}>Review today's assessment →</button>
          </div>
        ) : (
          <div style={card()}>
            <div style={{fontSize:13, color:"#64748b", lineHeight:1.7, marginBottom:18}}>Pick your track and get a real PM scenario. Your coach scores you across 4 dimensions.</div>
            <div style={{display:"flex", gap:12}}>
              {[["B2B","#8b5cf6","🏢","Enterprise & platform"],["B2C","#06b6d4","📱","Consumer & growth"]].map(([t,c,e,d])=>(
                <button key={t} onClick={()=>startChallenge(t)} style={{flex:1, background:"#0a1020", border:`2px solid ${c}33`, borderRadius:10, padding:"18px 12px", cursor:"pointer", fontFamily:font, transition:"all 0.15s"}}
                  onMouseOver={ev=>{ev.currentTarget.style.borderColor=c; ev.currentTarget.style.background=c+"11";}}
                  onMouseOut={ev=>{ev.currentTarget.style.borderColor=c+"33"; ev.currentTarget.style.background="#0a1020";}}>
                  <div style={{fontSize:26, marginBottom:8}}>{e}</div>
                  <div style={{fontSize:13, fontWeight:700, color:c, marginBottom:4}}>{t} PM</div>
                  <div style={{fontSize:11, color:"#475569"}}>{d}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {history.length>0 && (
          <div style={card()}>
            <div style={{fontSize:10, color:"#334155", letterSpacing:"0.12em", marginBottom:12}}>RECENT SESSIONS</div>
            {history.slice(0,7).map((s,i)=>(
              <div key={i} style={{display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:i<6?"1px solid #111827":"none"}}>
                <span style={{fontSize:10, padding:"2px 6px", borderRadius:3, background:s.track==="B2C"?"#06b6d422":"#8b5cf622", color:s.track==="B2C"?"#06b6d4":"#8b5cf6", fontWeight:700}}>{s.track||"B2B"}</span>
                <span style={pill(CHALLENGES.B2B.concat(CHALLENGES.B2C).find(c=>c.tag===s.tag)?.color||"#64748b")}>{s.tag}</span>
                <span style={{fontSize:11, color:"#2d3f5a", flex:1}}>{s.date}</span>
                <span style={{fontSize:13, fontWeight:700, color:s.scores?.overall>=7?"#4ade80":s.scores?.overall>=5?"#facc15":"#f87171"}}>{s.scores?.overall??"-"}/10</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ANSWERING
  if (phase==="answering") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:660, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:18}}>
          <span style={{fontSize:10, padding:"3px 9px", borderRadius:4, background:trackType==="B2C"?"#06b6d422":"#8b5cf622", color:trackType==="B2C"?"#06b6d4":"#8b5cf6", fontWeight:700}}>{trackType}</span>
          <span style={pill(tagColor)}>{tag}</span>
          <span style={{fontSize:11, color:"#2d3f5a"}}>{today}</span>
        </div>

        <div style={card({borderColor:tagColor+"28", background:"#0a1020"})}>
          <div style={{fontSize:10, color:tagColor, letterSpacing:"0.12em", marginBottom:12}}>TODAY'S CHALLENGE</div>
          <div style={{fontSize:13, color:"#7a90b0", lineHeight:1.85, whiteSpace:"pre-wrap"}}>{challenge}</div>
        </div>

        {hint && (
          <div style={card({borderColor:"#1a3040", background:"#091520"})}>
            <button onClick={()=>setHintOpen(o=>!o)} style={{background:"none", border:"none", cursor:"pointer", width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:0, fontFamily:font}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span>💡</span>
                <span style={{fontSize:10, color:"#38bdf8", letterSpacing:"0.1em"}}>FRAMEWORK HINT</span>
                <span style={{fontSize:10, color:"#1e4060", background:"#0d2535", padding:"2px 7px", borderRadius:4}}>{hint.framework}</span>
              </div>
              <span style={{fontSize:11, color:"#334155"}}>{hintOpen?"hide ▲":"show ▼"}</span>
            </button>
            {hintOpen && (
              <div style={{marginTop:14}}>
                {hint.steps.map((s,i)=>(
                  <div key={i} style={{display:"flex", gap:8, marginBottom:7}}>
                    <span style={{color:"#38bdf8", fontWeight:700, fontSize:12, minWidth:16}}>{i+1}.</span>
                    <span style={{fontSize:13, color:"#4a7090", lineHeight:1.6}}>{s}</span>
                  </div>
                ))}
                <div style={{marginTop:12, padding:"9px 12px", background:"#0a1e30", borderRadius:6, borderLeft:"2px solid #f59e0b"}}>
                  <span style={{fontSize:12, color:"#78716c"}}>⚠ {hint.watch}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={card()}>
          <div style={{fontSize:10, color:"#334155", letterSpacing:"0.12em", marginBottom:10}}>YOUR ANSWER</div>
          <textarea value={answer} onChange={e=>setAnswer(e.target.value)}
            placeholder={"Write your answer here.\n\nUse a framework. Think out loud. Be specific."}
            style={{width:"100%", minHeight:190, background:"#080d1a", border:"1px solid #1a2540", borderRadius:7, color:"#cbd5e1", fontFamily:font, fontSize:13, padding:14, lineHeight:1.8, resize:"vertical", boxSizing:"border-box", outline:"none"}}/>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10}}>
            <div style={{fontSize:11, color:answer.length<60?"#ef4444":"#2d3f5a"}}>{answer.length<60?`${60-answer.length} more chars needed`:`${answer.length} chars`}</div>
            <div style={{display:"flex", gap:8}}>
              <button style={btn("#1a2540","#475569")} onClick={()=>setPhase("home")}>← Back</button>
              <button style={btn(answer.length>=60?tagColor:"#1a2540", answer.length>=60?"#080d1a":"#2d3f5a", answer.length<60)} onClick={submitAnswer} disabled={answer.length<60}>Submit →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // RESULT
  if (phase==="result") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:660, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:18}}>
          <span style={{fontSize:10, padding:"3px 9px", borderRadius:4, background:trackType==="B2C"?"#06b6d422":"#8b5cf622", color:trackType==="B2C"?"#06b6d4":"#8b5cf6", fontWeight:700}}>{trackType}</span>
          <span style={pill(tagColor)}>{tag}</span>
          <span style={{fontSize:11, color:"#2d3f5a"}}>Assessment · {today}</span>
        </div>

        {scores && (
          <div style={card()}>
            <div style={{fontSize:10, color:"#334155", letterSpacing:"0.12em", marginBottom:14}}>SCORES</div>
            <Bar label="Structured Thinking" score={scores.structured}/>
            <Bar label="Business Acumen" score={scores.business}/>
            <Bar label="Specificity & Depth" score={scores.depth}/>
            <Bar label="PM Maturity" score={scores.maturity}/>
            <div style={{borderTop:"1px solid #1a2540", marginTop:8, paddingTop:8}}>
              <Bar label="Overall" score={scores.overall}/>
            </div>
          </div>
        )}

        <div style={card()}>
          <div style={{fontSize:10, color:"#334155", letterSpacing:"0.12em", marginBottom:14}}>ASSESSMENT</div>
          {renderLines(assessment)}
        </div>

        {answerKey && (
          <div style={card({borderColor:showKey?"#10b98133":"#1a2540", background:showKey?"#091a12":"#0d1526"})}>
            <button onClick={()=>setShowKey(o=>!o)} style={{background:"none", border:"none", cursor:"pointer", width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:0, fontFamily:font}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span>🔑</span>
                <span style={{fontSize:10, color:"#10b981", letterSpacing:"0.1em"}}>ANSWER KEY</span>
                <span style={{fontSize:10, color:"#1a4030", background:"#0d2520", padding:"2px 7px", borderRadius:4}}>What a strong answer looks like</span>
              </div>
              <span style={{fontSize:11, color:"#334155"}}>{showKey?"hide ▲":"reveal ▼"}</span>
            </button>
            {showKey && <div style={{marginTop:14}}>{renderLines(answerKey,"#6ee7b7")}</div>}
          </div>
        )}

        <button style={btn("#1a2540","#64748b")} onClick={()=>setPhase("home")}>← Back to home</button>
      </div>
    </div>
  );

  return null;
}
