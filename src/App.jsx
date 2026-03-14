import { useState, useEffect } from "react";

// ── Storage helpers (unchanged) ───────────────────────────────────────────
function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

// ── Challenge data (unchanged) ────────────────────────────────────────────
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

// ── Assessment prompt (unchanged) ─────────────────────────────────────────
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

// ── API call (unchanged) ──────────────────────────────────────────────────
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

// ── Global styles (unchanged) ─────────────────────────────────────────────
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
  .hovcard:hover { background: #252525 !important; }
  .trk { transition: background .15s; }
  .trk:hover { background: #252525 !important; }
  input:focus, textarea:focus { border-color: #7F6CF0 !important; box-shadow: 0 0 0 2px rgba(127,108,240,0.15) !important; }
`;

// ── Shared render helpers (unchanged) ─────────────────────────────────────
function renderMD(text, isKey = false) {
  const headColor = isKey ? "#7F6CF0" : "#E6E6E6";
  const bodyColor = isKey ? "rgba(0,200,150,0.85)" : "rgba(255,255,255,0.7)";
  const labelColor = isKey ? "#7F6CF0" : "rgba(255,255,255,0.35)";
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
  const bg = score >= 7 ? "rgba(127,108,240,0.15)" : score >= 5 ? "rgba(196,181,253,0.15)" : "rgba(255,107,107,0.15)";
  return (
    <div style={{ padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:"rgba(255,255,255,0.55)", fontWeight:400 }}>{label}</span>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, color, background:bg, padding:"3px 10px", borderRadius:99 }}>{score}/10</span>
      </div>
      <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:`${w}%`, height:"100%", background:`linear-gradient(90deg,${color}cc,${color})`, borderRadius:99, transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
    </div>
  );
}

// ── NEW: Guest feedback API call ──────────────────────────────────────────
async function sendFeedback(payload) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await res.json();
  if (!d.ok) throw new Error(d.error || "Failed to send");
}

// ── NEW: Guest Survey component (standalone, no shared state with main app) ─
export default function App() {
  const [rating, setRating] = useState(0);
  const [freq, setFreq] = useState("");
  const [missing, setMissing] = useState("");
  const [wouldPay, setWouldPay] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [recommend, setRecommend] = useState(null);
  const [extra, setExtra] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const font = "'Inter', sans-serif";
  const base = { fontFamily: font, background: "#191919", minHeight: "100vh", color: "#E6E6E6", padding: "24px 20px" };
  const card = (x = {}) => ({ background: "#202020", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 20, marginBottom: 10, ...x });
  const pill = c => ({ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: c + "18", color: c, letterSpacing: "0.02em", fontWeight: 500 });
  const btn = (bg, fg = "#191919", off = false) => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "10px 20px", fontFamily: font, fontWeight: 500, fontSize: 14, cursor: off ? "default" : "pointer", opacity: off ? 0.4 : 1, transition: "all 0.12s" });

  // ── NEW: Render guest form ──
  if (screen === "guestForm") return (
    <GuestForm onSubmit={startGuestSession} onBack={() => setScreen("entry")} />
  );

  // ── NEW: Render survey ──
  if (screen === "survey") return (
    <GuestSurvey guestProfile={guestProfile} lastScore={guestLastScore} onDone={endGuestSession} />
  );

  // ── NEW: Entry screen (replaces old password-only screen) ──
  if (screen === "entry" && !unlocked) return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{G}</style>
      <div style={{ width: "100%", maxWidth: 420 }} className="au">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, borderRadius: 10, background: "linear-gradient(145deg,#C4B5FD,#5B7FFF)" , display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 4px 20px rgba(127,108,240,0.4)" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 20L9 11L14 15L18 7L23 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="23" cy="6" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#E6E6E6", marginBottom: 8, letterSpacing: "-0.02em" }}>PM Training</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>Real challenges. Honest scores.<br/>Build your PM skills daily.</p>
        </div>

        {/* Guest option */}
        <div style={{ ...card({ borderColor: "#7F6CF044", background: "rgba(127,108,240,0.06)" }), marginBottom: 10 }} className="au1">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 26 }}>👋</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#E6E6E6", marginBottom: 2 }}>Try it free</p>
              <p style={{ fontSize: 12, color: "rgba(127,108,240,0.8)" }}>1 free challenge · No account needed</p>
            </div>
          </div>
          <button onClick={() => setScreen("guestForm")} style={{ ...btn("#7F6CF0", "#fff"), width: "100%", boxShadow: "0 4px 16px rgba(127,108,240,0.3)" }}>
            Continue as Guest →
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }} className="au2">
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>or sign in with access code</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
        </div>

        {/* Password */}
        <div style={card()} className="au2">
          <input type="password" value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === "Enter" && checkPassword()}
            placeholder="Enter access code"
            autoComplete="off"
            style={{ width: "100%", border: `1px solid ${pwError ? "#FF6B6B" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "13px 16px", fontFamily: font, fontSize: 14, color: "#E6E6E6", background: "#191919", marginBottom: 10 }}
          />
          {pwError && <p style={{ fontSize: 13, color: "#FF6B6B", textAlign: "center", marginBottom: 10 }}>Incorrect code. Try again.</p>}
          <button onClick={checkPassword} style={{ ...btn("rgba(255,255,255,0.08)", "rgba(255,255,255,0.7)"), width: "100%", border: "1px solid rgba(255,255,255,0.08)" }}>Sign in</button>
        </div>
      </div>
    </div>
  );

  // ── LOADING (unchanged) ───────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <style>{G}</style>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.08)", borderTopColor: "#7F6CF0" , borderRadius: "50%", animation: "spin 0.75s linear infinite" }}/>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Loading your challenge…</p>
    </div>
  );

  // ── HOME (existing + guest additions) ────────────────────────────────
  if (phase === "home") return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header — NEW: shows guest name + End Session btn; else unchanged */}
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} className="au">
          <div>
            <div style={{ fontSize: 11, color: "#7F6CF0", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 600 }}>PM DAILY TRAINING</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#E8E8E8", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {isGuest ? `Hi, ${guestProfile.firstName}! 👋` : "Hi, Siddhant! 👋"}
            </div>
            {isGuest ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                "{["Clarity beats cleverness. Strategy beats effort.", "Every PM started where you are now.", "Questions sharpen thinking. Thinking sharpens products.", "The best PMs say no more than yes."][Math.floor(Date.now() / 86400000) % 4]}"
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>One challenge. One assessment. Every day.</div>
            )}
          </div>
          {isGuest && (
            <button onClick={endGuestSession} style={{ ...btn("#FF453A22", "#FF6B6B"), fontSize: 11, padding: "7px 14px", border: "1px solid #FF453A33" }}>
              End Session
            </button>
          )}
        </div>

        {/* NEW: Guest challenge counter */}
        {isGuest && (
          <div style={{ ...card({ background: guestChallengeCount >= 1 ? "rgba(255,159,10,0.08)" : "rgba(127,108,240,0.06)", borderColor: guestChallengeCount >= 1 ? "#FF9F0A44" : "#7F6CF044" }), display: "flex", alignItems: "center", gap: 12 }} className="au1">
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ width: 32, height: 6, borderRadius: 99, background: guestChallengeCount >= 1 ? "#C4B5FD" : "rgba(255,255,255,0.1)", transition: "background .3s" }}/>
            </div>
            <span style={{ fontSize: 12, color: guestChallengeCount >= 1 ? "#C4B5FD" : "rgba(255,255,255,0.45)", fontWeight: guestChallengeCount >= 1 ? 700 : 400 }}>
              {guestChallengeCount >= 1 ? "1/1 challenge used — please give us your feedback" : "1 free challenge available"}
            </span>
            {guestChallengeCount >= 1 && (
              <button onClick={() => setScreen("survey")} style={{ ...btn("#C4B5FD", "#191919"), fontSize: 11, padding: "6px 14px", marginLeft: "auto" }}>Give Feedback →</button>
            )}
          </div>
        )}

        {error && <div style={{ ...card({ background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)" }), fontSize: 13, color: "#FF6B6B", marginBottom: 14 }}>⚠ {error}</div>}

        {/* Stats (unchanged for logged-in, hidden for guest) */}
        {!isGuest && (
          <div style={{ ...card(), display: "flex" }} className="au1">
            {[["TOTAL SESSIONS", total, "#7F6CF0", "#1D1B2E"], ["7+ SCORES", highScores, "#7F6CF0", "#0F2018"]].map(([l, v, c, bg], i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", background: bg, borderRadius: 14, margin: "0 4px", padding: "16px 8px", border: `1px solid ${c}20` }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: c, letterSpacing: "-0.03em", lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6, fontWeight: 500 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Track selection (unchanged, but disabled if guest hit limit) */}
        <div style={card()} className="au2">
          {isGuest && guestChallengeCount >= 1 ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>You've used your free challenge.</p>
              <button onClick={() => setScreen("survey")} style={{ ...btn("#7F6CF0", "#fff"), boxShadow: "0 4px 16px rgba(127,108,240,0.3)" }}>Give Feedback & See Results →</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 18 }}>
                {isGuest ? "1 free challenge available. Choose your track below." : "Choose your track. Get a real PM scenario. Write a serious answer. Your coach scores you."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[["B2B", "🏢", "#7F6CF0", "#1D1B2E", "Enterprise & platform"], ["B2C", "📱", "#7F6CF0", "#0F2018", "Consumer & growth"]].map(([t, icon, accent, bg, desc]) => (
                  <button key={t} onClick={() => startChallenge(t)} className="trk" style={{ flex: 1, background: bg, border: `1.5px solid ${accent}30`, borderRadius: 10, padding: "18px 14px", cursor: "pointer", fontFamily: font, textAlign: "left", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>{icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: accent, marginBottom: 4 }}>{t} PM</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* History (hidden for guest) */}
        {!isGuest && history.length > 0 && (
          <div style={card()} className="au3">
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 14 }}>RECENT SESSIONS</div>
            {history.slice(0, 7).map((s, i) => {
              const c = CHALLENGES.B2B.concat(CHALLENGES.B2C).find(x => x.tag === s.tag)?.color || "#64748b";
              const sc = s.scores?.overall;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < Math.min(history.length - 1, 6) ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: s.track === "B2C" ? "rgba(10,132,255,0.15)" : "rgba(127,108,240,0.15)", color: s.track === "B2C" ? "#7F6CF0" : "#7F6CF0", fontWeight: 700 }}>{s.track || "B2B"}</span>
                  <span style={pill(c)}>{s.tag}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flex: 1 }}>{s.date}</span>
                  {sc && <span style={{ fontSize: 12, fontWeight: 600, color: sc >= 7 ? "#7F6CF0" : sc >= 5 ? "#C4B5FD" : "#FF6B6B" }}>{sc}/10</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── ANSWERING (unchanged) ─────────────────────────────────────────────
  if (phase === "answering") return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }} className="au">
          <button onClick={() => setPhase("home")} style={{ ...btn("rgba(255,255,255,0.08)", "rgba(255,255,255,0.6)"), padding: "7px 14px", fontSize: 12 }}>← Back</button>
          <span style={pill(trackType === "B2C" ? "#7F6CF0" : "#7F6CF0")}>{trackType}</span>
          {pick && <span style={pill(pick.color)}>{pick.tag}</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>{today}</span>
        </div>

        <div style={{ ...card({ borderColor: (pick?.color || "#7F6CF0") + "28", background: "#202020" }) }} className="au1">
          <div style={{ fontSize: 10, color: pick?.color, letterSpacing: "0.1em", marginBottom: 12 }}>CHALLENGE</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{challenge}</div>
        </div>

        {pick?.hint && (
          <div style={card({ background: "#202020" })} className="au1">
            <button onClick={() => setHintOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>💡</span>
                <span style={{ fontSize: 10, color: "#C4B5FD", letterSpacing: "0.1em" }}>FRAMEWORK HINT</span>
                <span style={{ fontSize: 10, color: "rgba(255,159,10,0.6)", background: "rgba(255,159,10,0.08)", padding: "2px 8px", borderRadius: 4 }}>{pick.hint.framework}</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{hintOpen ? "hide ▲" : "show ▼"}</span>
            </button>
            {hintOpen && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {pick.hint.steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: "#C4B5FD", fontWeight: 600, fontSize: 12, minWidth: 18 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,159,10,0.06)", borderRadius: 8, borderLeft: "2px solid #FF9F0A" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,159,10,0.7)" }}>⚠ {pick.hint.watch}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={card()} className="au2">
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 10 }}>YOUR ANSWER</div>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder={"Use a framework. Be specific. Think out loud."}
            style={{ width: "100%", minHeight: 190, background: "#191919", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#E6E6E6", fontFamily: font, fontSize: 14, padding: "13px 16px", lineHeight: 1.8 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: answer.length < 60 ? "#FF6B6B" : "rgba(255,255,255,0.25)" }}>
              {answer.length < 60 ? `${60 - answer.length} more chars` : `${answer.length} chars`}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn("rgba(255,255,255,0.08)", "rgba(255,255,255,0.5)")} onClick={() => setPhase("home")}>Cancel</button>
              <button style={btn(answer.length >= 60 ? "#7F6CF0" : "rgba(255,255,255,0.08)", answer.length >= 60 ? "#fff" : "rgba(255,255,255,0.25)", answer.length < 60)} onClick={submitAnswer} disabled={answer.length < 60}>Submit →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── RESULT (existing + guest survey prompt) ───────────────────────────
  if (phase === "result") return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }} className="au">
          <button onClick={() => setPhase("home")} style={{ ...btn("rgba(255,255,255,0.08)", "rgba(255,255,255,0.6)"), padding: "7px 14px", fontSize: 12 }}>← Home</button>
          {trackType && <span style={pill(trackType === "B2C" ? "#7F6CF0" : "#7F6CF0")}>{trackType}</span>}
          {pick && <span style={pill(pick.color)}>{pick.tag}</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>Assessment</span>
        </div>

        {scores && (
          <div style={{ ...card(), textAlign: "center", padding: "32px 24px" }} className="au1">
            <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: scores.overall >= 7 ? "#7F6CF0" : scores.overall >= 5 ? "#C4B5FD" : "#FF6B6B" }}>{scores.overall}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>out of 10</div>
            <div style={{ marginTop: 14, display: "inline-block", background: scores.overall >= 7 ? "rgba(48,209,88,0.1)" : scores.overall >= 5 ? "rgba(255,159,10,0.1)" : "rgba(255,69,58,0.1)", borderRadius: 99, padding: "7px 18px" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: scores.overall >= 7 ? "#7F6CF0" : scores.overall >= 5 ? "#C4B5FD" : "#FF6B6B" }}>
                {scores.overall >= 7 ? "Solid junior PM thinking 💪" : scores.overall >= 5 ? "Good foundation, keep building 📈" : "Real gaps to close — fix them 🎯"}
              </span>
            </div>
          </div>
        )}

        {scores && (
          <div style={card()} className="au2">
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 14 }}>SCORES</div>
            <ScoreBar label="Structured Thinking" score={scores.structured} delay={0}/>
            <ScoreBar label="Business Acumen" score={scores.business} delay={80}/>
            <ScoreBar label="Specificity & Depth" score={scores.depth} delay={160}/>
            <ScoreBar label="PM Maturity" score={scores.maturity} delay={240}/>
          </div>
        )}

        <div style={card()} className="au3">
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 14 }}>ASSESSMENT</div>
          {renderMD(assessment)}
        </div>

        {answerKey && (
          <div style={{ ...card({ background: showKey ? "rgba(48,209,88,0.05)" : "#202020", border: showKey ? "1px solid rgba(48,209,88,0.2)" : "1px solid rgba(255,255,255,0.08)", transition: "all 0.2s" }) }} className="au4">
            <button onClick={() => setShowKey(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔑</span>
                <span style={{ fontSize: 10, color: "#7F6CF0", letterSpacing: "0.1em" }}>ANSWER KEY</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{showKey ? "hide ▲" : "reveal ▼"}</span>
            </button>
            {showKey && <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(48,209,88,0.1)" }}>{renderMD(answerKey, true)}</div>}
          </div>
        )}

        {/* Guest counter on result screen — 1 challenge limit */}
        {isGuest && (
          <div style={{ ...card({ background: "rgba(255,159,10,0.08)", borderColor: "#FF9F0A44" }), display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ width: 32, height: 6, borderRadius: 99, background: "#C4B5FD" }}/>
            </div>
            <span style={{ fontSize: 12, color: "#C4B5FD", fontWeight: 600, flex: 1 }}>
              1/1 challenge used · Your feedback helps us improve ✨
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }} className="au4">
          {isGuest ? (
            <button style={{ ...btn("#7F6CF0", "#fff"), flex: 1, boxShadow: "0 4px 16px rgba(127,108,240,0.3)" }} onClick={() => setScreen("survey")}>Share Your Feedback →</button>
          ) : (
            <>
              <button style={btn("rgba(255,255,255,0.08)", "rgba(255,255,255,0.6)")} onClick={() => setPhase("home")}>← Home</button>
              <button style={{ ...btn("#7F6CF0", "#fff"), flex: 1 }} onClick={() => { setPhase("home"); setTimeout(() => startChallenge(trackType), 50); }}>Another Challenge →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return null;
}
