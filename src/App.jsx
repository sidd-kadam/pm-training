import { useState, useEffect } from "react";

// ── Storage helpers (unchanged) ───────────────────────────────────────────
function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

// ── Challenge data (unchanged) ────────────────────────────────────────────
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
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080d1a; }
  ::selection { background: rgba(124,58,237,0.3); }
  textarea, input { outline: none; font-family: inherit; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  .au  { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .au1 { animation: fadeUp 0.4s 0.05s cubic-bezier(0.16,1,0.3,1) both; }
  .au2 { animation: fadeUp 0.4s 0.10s cubic-bezier(0.16,1,0.3,1) both; }
  .au3 { animation: fadeUp 0.4s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
  .au4 { animation: fadeUp 0.4s 0.20s cubic-bezier(0.16,1,0.3,1) both; }
`;

// ── Shared render helpers (unchanged) ─────────────────────────────────────
function renderMD(text, isKey = false) {
  const headColor = isKey ? "#30D158" : "#e2e8f0";
  const bodyColor = isKey ? "rgba(48,209,88,0.85)" : "rgba(255,255,255,0.75)";
  const labelColor = isKey ? "#30D158" : "rgba(255,255,255,0.35)";
  return text.trim().split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**"))
      return <p key={i} style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:labelColor, marginTop:20, marginBottom:8, fontFamily:"IBM Plex Mono,monospace" }}>{line.replace(/\*\*/g,"")}</p>;
    if (line.includes("━")) return <div key={i} style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"10px 0" }}/>;
    if (!line.trim()) return <div key={i} style={{ height:8 }}/>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{ fontSize:15, lineHeight:1.8, color:bodyColor, fontFamily:"IBM Plex Mono,monospace" }}>
      {parts.map((p,j) => p.startsWith("**") ? <strong key={j} style={{ color:headColor, fontWeight:700 }}>{p.replace(/\*\*/g,"")}</strong> : p)}
    </p>;
  });
}

function ScoreBar({ label, score, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score * 10), 300 + delay); return () => clearTimeout(t); }, [score]);
  const color = score >= 7 ? "#30D158" : score >= 5 ? "#FF9F0A" : "#FF453A";
  return (
    <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:13, color:"rgba(255,255,255,0.5)" }}>{label}</span>
        <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:13, fontWeight:700, color }}>{score}/10</span>
      </div>
      <div style={{ height:4, background:"rgba(255,255,255,0.08)", borderRadius:99 }}>
        <div style={{ width:`${w}%`, height:"100%", background:color, borderRadius:99, transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
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
function GuestSurvey({ guestProfile, lastScore, onDone }) {
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

  const font = "'IBM Plex Mono', monospace";
  const base = { fontFamily: font, background: "#080d1a", minHeight: "100vh", color: "#e2e8f0", padding: "28px 20px" };
  const card = (x = {}) => ({ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 12, padding: 20, marginBottom: 12, ...x });
  const btnPill = (active, color = "#7C3AED") => ({ background: active ? color : "#1a2540", color: active ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: 99, padding: "7px 16px", fontFamily: font, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", transition: "all .15s" });

  async function submit() {
    if (rating === 0) { setErr("Please select a star rating."); return; }
    setSending(true); setErr("");
    try {
      await sendFeedback({
        name: `${guestProfile.firstName} ${guestProfile.lastName}`.trim(),
        age: guestProfile.age,
        field: guestProfile.field,
        experience: guestProfile.experience,
        lastScore,
        rating, freq, missing, wouldPay, priceRange,
        recommend: recommend === null ? "not answered" : recommend ? "Yes" : "No",
        extra,
      });
      setSent(true);
    } catch (e) { setErr(e.message); }
    setSending(false);
  }

  if (sent) return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{G}</style>
      <div style={{ textAlign: "center", maxWidth: 400 }} className="au">
        <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>Thank you for your feedback!</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 28 }}>
          Your responses have been sent. If you want full access, message Siddhant on LinkedIn.
        </p>
        <button onClick={onDone} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "13px 28px", fontFamily: font, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Return to Main Page
        </button>
      </div>
    </div>
  );

  return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }} className="au">
          <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: "0.18em", marginBottom: 6 }}>GUEST FEEDBACK</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>Help us improve 📋</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>90 seconds · Honest answers only</p>
        </div>

        {/* Q1 — Star rating */}
        <div style={card()} className="au1">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Q1 — Overall, how would you rate this app?</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 14 }}>Be honest — a polite 5 stars doesn't help.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", opacity: n <= rating ? 1 : 0.2, transform: n <= rating ? "scale(1.15)" : "scale(1)", transition: "all .15s", padding: "2px 3px" }}>★</button>
            ))}
            {rating > 0 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>{["","Poor","Fair","Good","Great","Excellent"][rating]}</span>}
          </div>
        </div>

        {/* Q2 — Frequency */}
        <div style={card()} className="au1">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>Q2 — If fully available, how often would you use it?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Daily","3–4x a week","Once a week","Few times a month","Rarely"].map(o => (
              <button key={o} onClick={() => setFreq(o)} style={btnPill(freq === o)}>{o}</button>
            ))}
          </div>
        </div>

        {/* Q3 — Missing */}
        <div style={card()} className="au2">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Q3 — What one thing is missing for this to be a must-use?</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Be specific — "more features" is not an answer.</p>
          <textarea value={missing} onChange={e => setMissing(e.target.value)} rows={3}
            placeholder="e.g. Mock interview mode with follow-up questions…"
            style={{ width: "100%", background: "#080d1a", border: "1px solid #1a2540", borderRadius: 8, padding: "11px 14px", color: "#e2e8f0", fontSize: 13, lineHeight: 1.65, resize: "none" }}
          />
        </div>

        {/* Q4 — Would you pay */}
        <div style={card()} className="au2">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>Q4 — Would you pay for full access?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Yes, definitely","Maybe — depends on price","No, I'd use it free","No, not paid or free"].map(o => (
              <button key={o} onClick={() => { setWouldPay(o); if (o.startsWith("No")) setPriceRange(""); }} style={btnPill(wouldPay === o)}>{o}</button>
            ))}
          </div>
        </div>

        {/* Q5 — Price (conditional) */}
        {(wouldPay === "Yes, definitely" || wouldPay === "Maybe — depends on price") && (
          <div style={card({ borderColor: "#7C3AED44", background: "rgba(124,58,237,0.06)" })} className="au">
            <p style={{ fontSize: 12, color: "rgba(124,58,237,0.8)", marginBottom: 14 }}>Q5 — What monthly price feels fair?</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Under €3/mo","€3–5/mo","€5–10/mo","€10–15/mo","€15–20/mo","€20+/mo"].map(o => (
                <button key={o} onClick={() => setPriceRange(o)} style={btnPill(priceRange === o)}>{o}</button>
              ))}
            </div>
          </div>
        )}

        {/* Q6 — Recommend */}
        <div style={card()} className="au3">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>Q6 — Would you recommend this to a colleague becoming a PM?</p>
          <div style={{ display: "flex", gap: 10 }}>
            {[{v:true,l:"Yes 👍",c:"#30D158"},{v:false,l:"No 👎",c:"#FF453A"}].map(({v,l,c}) => (
              <button key={String(v)} onClick={() => setRecommend(v)} style={{ flex: 1, background: recommend === v ? c + "18" : "#1a2540", border: `1px solid ${recommend === v ? c : "#1a2540"}`, borderRadius: 8, padding: "12px", fontFamily: font, fontSize: 14, fontWeight: recommend === v ? 700 : 400, color: recommend === v ? c : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all .15s" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Q7 — Extra */}
        <div style={card()} className="au3">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Q7 — Anything else? <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span></p>
          <textarea value={extra} onChange={e => setExtra(e.target.value)} rows={3}
            placeholder="Bugs, ideas, complaints, compliments — all welcome."
            style={{ width: "100%", background: "#080d1a", border: "1px solid #1a2540", borderRadius: 8, padding: "11px 14px", color: "#e2e8f0", fontSize: 13, lineHeight: 1.65, resize: "none", marginTop: 10 }}
          />
        </div>

        {err && <p style={{ fontSize: 13, color: "#FF453A", textAlign: "center", marginBottom: 12 }}>{err}</p>}

        <div className="au4">
          <button onClick={submit} disabled={sending} style={{ width: "100%", background: rating > 0 ? "#7C3AED" : "#1a2540", color: rating > 0 ? "#fff" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, padding: "14px", fontFamily: font, fontWeight: 700, fontSize: 14, cursor: rating > 0 ? "pointer" : "default", transition: "all .2s", marginBottom: 12 }}>
            {sending ? "Sending…" : "Submit Feedback →"}
          </button>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            Want full access? Message Siddhant on LinkedIn.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── NEW: Guest Registration Form ──────────────────────────────────────────
function GuestForm({ onSubmit, onBack }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [field, setField] = useState("");
  const [experience, setExperience] = useState("");
  const [err, setErr] = useState("");

  const font = "'IBM Plex Mono', monospace";
  const base = { fontFamily: font, background: "#080d1a", minHeight: "100vh", color: "#e2e8f0", padding: "28px 20px" };
  const card = (x = {}) => ({ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 12, padding: 22, marginBottom: 14, ...x });
  const inputStyle = (err) => ({ width: "100%", background: "#080d1a", border: `1px solid ${err ? "#FF453A" : "#1a2540"}`, borderRadius: 8, padding: "11px 14px", fontFamily: font, fontSize: 14, color: "#e2e8f0", transition: "border .2s" });
  const label = { fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", display: "block", marginBottom: 6 };
  const expOpts = ["0–1 years","1–3 years","3–5 years","5–10 years","10+ years"];

  function submit() {
    if (!firstName.trim() || !lastName.trim() || !age || !field.trim() || !experience) {
      setErr("Please fill in all fields."); return;
    }
    setErr("");
    onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), age, field: field.trim(), experience });
  }

  return (
    <div style={base}>
      <style>{G}</style>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }} className="au">
          <button onClick={onBack} style={{ background: "#1a2540", border: "none", borderRadius: 8, padding: "7px 14px", fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", marginBottom: 20 }}>← Back</button>
          <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: "0.18em", marginBottom: 6 }}>GUEST ACCESS</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Quick intro 👋</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Tell us about yourself to personalise your experience. You get 2 free challenges.</p>
        </div>

        <div style={card()} className="au1">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label}>FIRST NAME *</label>
              <input value={firstName} onChange={e => { setFirstName(e.target.value); setErr(""); }} placeholder="Alex" style={inputStyle(!firstName && err)} />
            </div>
            <div>
              <label style={label}>LAST NAME *</label>
              <input value={lastName} onChange={e => { setLastName(e.target.value); setErr(""); }} placeholder="Smith" style={inputStyle(!lastName && err)} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>AGE *</label>
            <input type="number" value={age} onChange={e => { setAge(e.target.value); setErr(""); }} placeholder="26" min="16" max="65" style={inputStyle(!age && err)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>FIELD OF WORK *</label>
            <input value={field} onChange={e => { setField(e.target.value); setErr(""); }} placeholder="e.g. Product Management, Engineering" style={inputStyle(!field && err)} />
          </div>
          <div>
            <label style={label}>YEARS OF EXPERIENCE *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {expOpts.map(o => (
                <button key={o} onClick={() => { setExperience(o); setErr(""); }} style={{ background: experience === o ? "#7C3AED" : "#1a2540", color: experience === o ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: 99, padding: "7px 14px", fontFamily: font, fontSize: 12, fontWeight: experience === o ? 700 : 400, cursor: "pointer", transition: "all .15s" }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        {err && <p style={{ fontSize: 13, color: "#FF453A", textAlign: "center", marginBottom: 12 }}>{err}</p>}

        <button onClick={submit} className="au2" style={{ width: "100%", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontFamily: font, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>
          Start Practising →
        </button>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 10 }}>2 free challenges · No account needed</p>
      </div>
    </div>
  );
}

// ── MAIN APP COMPONENT ────────────────────────────────────────────────────
export default function PMApp() {
  // ── Existing state (unchanged) ──
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

  // ── NEW: Guest state (isolated, no overlap with existing state) ──
  const [screen, setScreen] = useState("entry"); // "entry" | "guestForm" | "app" | "survey"
  const [guestProfile, setGuestProfile] = useState(null);
  const [guestChallengeCount, setGuestChallengeCount] = useState(0);
  const [guestLastScore, setGuestLastScore] = useState(null);
  const isGuest = screen === "app" && guestProfile !== null && !unlocked;

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const hR = storageList("pm_session:");
    if (hR?.keys?.length) {
      const s = hR.keys.map(k => { const r = storageGet(k); return r ? JSON.parse(r.value) : null; }).filter(Boolean).reverse();
      setHistory(s.slice(0, 30));
      setTotal(s.length);
      setHighScores(s.filter(x => x.scores?.overall >= 7).length);
    }
  }, []);

  // ── Existing auth (unchanged) ──
  function checkPassword() {
    if (pwInput.trim() === "Siddhant@0812") {
      storageSet("pm_auth", "true");
      setUnlocked(true);
      setScreen("app");
    } else {
      setPwError(true);
      setPwInput("");
    }
  }

  // ── NEW: Guest session controls ──
  function startGuestSession(profile) {
    setGuestProfile(profile);
    setGuestChallengeCount(0);
    setGuestLastScore(null);
    setScreen("app");
    setPhase("home");
  }

  function endGuestSession() {
    setGuestProfile(null);
    setGuestChallengeCount(0);
    setGuestLastScore(null);
    setScreen("entry");
    setPhase("home");
    setChallenge("");
    setAssessment("");
    setScores(null);
  }

  // ── Existing challenge logic (unchanged) ──
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
      setScores(s);
      saveSession(s);
      // NEW: track guest challenge count and store score for survey
      if (isGuest) {
        const newCount = guestChallengeCount + 1;
        setGuestChallengeCount(newCount);
        setGuestLastScore(s.overall);
      }
      setPhase("result");
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

  // ── Design tokens (unchanged) ──
  const font = "'IBM Plex Mono', monospace";
  const base = { fontFamily: font, background: "#080d1a", minHeight: "100vh", color: "#e2e8f0", padding: "28px 20px" };
  const card = (x = {}) => ({ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 12, padding: 22, marginBottom: 14, ...x });
  const pill = c => ({ fontSize: 10, padding: "3px 9px", borderRadius: 4, background: c + "18", color: c, letterSpacing: "0.1em", fontWeight: 700 });
  const btn = (bg, fg = "#080d1a", off = false) => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "12px 22px", fontFamily: font, fontWeight: 700, fontSize: 13, cursor: off ? "default" : "pointer", letterSpacing: "0.04em", opacity: off ? 0.4 : 1, transition: "all 0.15s" });

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
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#7C3AED,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 20L9 11L14 15L18 7L23 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="23" cy="6" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0", marginBottom: 8, letterSpacing: "-0.02em" }}>PM Training</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Real challenges. Honest scores.<br/>Build your PM skills daily.</p>
        </div>

        {/* Guest option */}
        <div style={{ ...card({ borderColor: "#7C3AED44", background: "rgba(124,58,237,0.06)" }), marginBottom: 10 }} className="au1">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 26 }}>👋</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>Try it free</p>
              <p style={{ fontSize: 12, color: "rgba(124,58,237,0.8)" }}>2 free challenges · No account needed</p>
            </div>
          </div>
          <button onClick={() => setScreen("guestForm")} style={{ ...btn("#7C3AED", "#fff"), width: "100%", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
            Continue as Guest →
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }} className="au2">
          <div style={{ flex: 1, height: 1, background: "#1a2540" }}/>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>or sign in with access code</span>
          <div style={{ flex: 1, height: 1, background: "#1a2540" }}/>
        </div>

        {/* Password */}
        <div style={card()} className="au2">
          <input type="password" value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === "Enter" && checkPassword()}
            placeholder="Enter access code"
            autoComplete="off"
            style={{ width: "100%", border: `1px solid ${pwError ? "#FF453A" : "#1a2540"}`, borderRadius: 8, padding: "13px 16px", fontFamily: font, fontSize: 14, color: "#e2e8f0", background: "#080d1a", marginBottom: 10 }}
          />
          {pwError && <p style={{ fontSize: 13, color: "#FF453A", textAlign: "center", marginBottom: 10 }}>Incorrect code. Try again.</p>}
          <button onClick={checkPassword} style={{ ...btn("#1a2540", "rgba(255,255,255,0.7)"), width: "100%", border: "1px solid #1a2540" }}>Sign in</button>
        </div>
      </div>
    </div>
  );

  // ── LOADING (unchanged) ───────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <style>{G}</style>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.75s linear infinite" }}/>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Loading your challenge…</p>
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
            <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: "0.18em", marginBottom: 6 }}>PM DAILY TRAINING</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
              {isGuest ? `Welcome, ${guestProfile.firstName}! 👋` : "Hey Siddhant 👋"}
            </div>
            {isGuest ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                "{["Clarity beats cleverness. Strategy beats effort.", "Every PM started where you are now.", "Questions sharpen thinking. Thinking sharpens products.", "The best PMs say no more than yes."][Math.floor(Date.now() / 86400000) % 4]}"
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>One challenge. One assessment. Every day.</div>
            )}
          </div>
          {isGuest && (
            <button onClick={endGuestSession} style={{ ...btn("#FF453A22", "#FF453A"), fontSize: 11, padding: "7px 14px", border: "1px solid #FF453A33" }}>
              End Session
            </button>
          )}
        </div>

        {/* NEW: Guest challenge counter */}
        {isGuest && (
          <div style={{ ...card({ background: guestChallengeCount >= 2 ? "rgba(255,159,10,0.08)" : "rgba(124,58,237,0.06)", borderColor: guestChallengeCount >= 2 ? "#FF9F0A44" : "#7C3AED44" }), display: "flex", alignItems: "center", gap: 12 }} className="au1">
            <div style={{ display: "flex", gap: 5 }}>
              {[1,2].map(n => <div key={n} style={{ width: 32, height: 6, borderRadius: 99, background: n <= guestChallengeCount ? (guestChallengeCount >= 2 ? "#FF9F0A" : "#7C3AED") : "rgba(255,255,255,0.1)", transition: "background .3s" }}/>)}
            </div>
            <span style={{ fontSize: 12, color: guestChallengeCount >= 2 ? "#FF9F0A" : "rgba(255,255,255,0.4)", fontWeight: guestChallengeCount >= 2 ? 700 : 400 }}>
              {guestChallengeCount >= 2 ? "2/2 challenges used — please give us your feedback" : `${guestChallengeCount}/2 free challenges used`}
            </span>
            {guestChallengeCount >= 2 && (
              <button onClick={() => setScreen("survey")} style={{ ...btn("#FF9F0A", "#080d1a"), fontSize: 11, padding: "6px 14px", marginLeft: "auto" }}>Give Feedback →</button>
            )}
          </div>
        )}

        {error && <div style={{ ...card({ background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)" }), fontSize: 13, color: "#FF453A", marginBottom: 14 }}>⚠ {error}</div>}

        {/* Stats (unchanged for logged-in, hidden for guest) */}
        {!isGuest && (
          <div style={{ ...card(), display: "flex" }} className="au1">
            {[["TOTAL", total, "#0A84FF"], ["7+ SCORES", highScores, "#30D158"]].map(([l, v, c], i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 1 ? "1px solid #1a2540" : "none", padding: "4px 0" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: v > 0 ? c : "rgba(255,255,255,0.15)", letterSpacing: "-0.02em" }}>{v}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Track selection (unchanged, but disabled if guest hit limit) */}
        <div style={card()} className="au2">
          {isGuest && guestChallengeCount >= 2 ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>You've used your 2 free challenges.</p>
              <button onClick={() => setScreen("survey")} style={{ ...btn("#7C3AED", "#fff"), boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>Give Feedback & See Results →</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 18 }}>
                {isGuest ? `${2 - guestChallengeCount} free challenge${2 - guestChallengeCount === 1 ? "" : "s"} remaining. Choose your track below.` : "Choose your track. Get a real PM scenario. Write a serious answer. Your coach scores you."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[["B2B", "🏢", "#7C3AED", "Enterprise & platform"], ["B2C", "📱", "#0A84FF", "Consumer & growth"]].map(([t, icon, c, desc]) => (
                  <button key={t} onClick={() => startChallenge(t)} style={{ flex: 1, background: "#0a1020", border: `1.5px solid ${c}22`, borderRadius: 10, padding: "16px 12px", cursor: "pointer", fontFamily: font, textAlign: "left", transition: "all 0.15s" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = c; e.currentTarget.style.background = c + "11"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = c + "22"; e.currentTarget.style.background = "#0a1020"; }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 4 }}>{t} PM</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* History (hidden for guest) */}
        {!isGuest && history.length > 0 && (
          <div style={card()} className="au3">
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 14 }}>RECENT SESSIONS</div>
            {history.slice(0, 7).map((s, i) => {
              const c = CHALLENGES.B2B.concat(CHALLENGES.B2C).find(x => x.tag === s.tag)?.color || "#64748b";
              const sc = s.scores?.overall;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < Math.min(history.length - 1, 6) ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: s.track === "B2C" ? "rgba(10,132,255,0.15)" : "rgba(124,58,237,0.15)", color: s.track === "B2C" ? "#0A84FF" : "#7C3AED", fontWeight: 700 }}>{s.track || "B2B"}</span>
                  <span style={pill(c)}>{s.tag}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flex: 1 }}>{s.date}</span>
                  {sc && <span style={{ fontSize: 12, fontWeight: 700, color: sc >= 7 ? "#30D158" : sc >= 5 ? "#FF9F0A" : "#FF453A" }}>{sc}/10</span>}
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
          <button onClick={() => setPhase("home")} style={{ ...btn("#1a2540", "rgba(255,255,255,0.6)"), padding: "7px 14px", fontSize: 12 }}>← Back</button>
          <span style={pill(trackType === "B2C" ? "#0A84FF" : "#7C3AED")}>{trackType}</span>
          {pick && <span style={pill(pick.color)}>{pick.tag}</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>{today}</span>
        </div>

        <div style={{ ...card({ borderColor: (pick?.color || "#7C3AED") + "28", background: "#0a1020" }) }} className="au1">
          <div style={{ fontSize: 10, color: pick?.color, letterSpacing: "0.1em", marginBottom: 12 }}>CHALLENGE</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{challenge}</div>
        </div>

        {pick?.hint && (
          <div style={card({ background: "#091520" })} className="au1">
            <button onClick={() => setHintOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>💡</span>
                <span style={{ fontSize: 10, color: "#FF9F0A", letterSpacing: "0.1em" }}>FRAMEWORK HINT</span>
                <span style={{ fontSize: 10, color: "rgba(255,159,10,0.6)", background: "rgba(255,159,10,0.08)", padding: "2px 8px", borderRadius: 4 }}>{pick.hint.framework}</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{hintOpen ? "hide ▲" : "show ▼"}</span>
            </button>
            {hintOpen && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {pick.hint.steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: "#FF9F0A", fontWeight: 700, fontSize: 12, minWidth: 18 }}>{i + 1}.</span>
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
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 10 }}>YOUR ANSWER</div>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder={"Use a framework. Be specific. Think out loud."}
            style={{ width: "100%", minHeight: 190, background: "#080d1a", border: "1px solid #1a2540", borderRadius: 8, color: "#e2e8f0", fontFamily: font, fontSize: 14, padding: "13px 16px", lineHeight: 1.8 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: answer.length < 60 ? "#FF453A" : "rgba(255,255,255,0.25)" }}>
              {answer.length < 60 ? `${60 - answer.length} more chars` : `${answer.length} chars`}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn("#1a2540", "rgba(255,255,255,0.5)")} onClick={() => setPhase("home")}>Cancel</button>
              <button style={btn(answer.length >= 60 ? "#7C3AED" : "#1a2540", answer.length >= 60 ? "#fff" : "rgba(255,255,255,0.2)", answer.length < 60)} onClick={submitAnswer} disabled={answer.length < 60}>Submit →</button>
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
          <button onClick={() => setPhase("home")} style={{ ...btn("#1a2540", "rgba(255,255,255,0.6)"), padding: "7px 14px", fontSize: 12 }}>← Home</button>
          {trackType && <span style={pill(trackType === "B2C" ? "#0A84FF" : "#7C3AED")}>{trackType}</span>}
          {pick && <span style={pill(pick.color)}>{pick.tag}</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>Assessment</span>
        </div>

        {scores && (
          <div style={{ ...card(), textAlign: "center", padding: "32px 24px" }} className="au1">
            <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: scores.overall >= 7 ? "#30D158" : scores.overall >= 5 ? "#FF9F0A" : "#FF453A" }}>{scores.overall}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>out of 10</div>
            <div style={{ marginTop: 14, display: "inline-block", background: scores.overall >= 7 ? "rgba(48,209,88,0.1)" : scores.overall >= 5 ? "rgba(255,159,10,0.1)" : "rgba(255,69,58,0.1)", borderRadius: 99, padding: "7px 18px" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: scores.overall >= 7 ? "#30D158" : scores.overall >= 5 ? "#FF9F0A" : "#FF453A" }}>
                {scores.overall >= 7 ? "Solid junior PM thinking 💪" : scores.overall >= 5 ? "Good foundation, keep building 📈" : "Real gaps to close — fix them 🎯"}
              </span>
            </div>
          </div>
        )}

        {scores && (
          <div style={card()} className="au2">
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 14 }}>SCORES</div>
            <ScoreBar label="Structured Thinking" score={scores.structured} delay={0}/>
            <ScoreBar label="Business Acumen" score={scores.business} delay={80}/>
            <ScoreBar label="Specificity & Depth" score={scores.depth} delay={160}/>
            <ScoreBar label="PM Maturity" score={scores.maturity} delay={240}/>
          </div>
        )}

        <div style={card()} className="au3">
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 14 }}>ASSESSMENT</div>
          {renderMD(assessment)}
        </div>

        {answerKey && (
          <div style={{ ...card({ background: showKey ? "rgba(48,209,88,0.05)" : "#0d1526", border: showKey ? "1px solid rgba(48,209,88,0.2)" : "1px solid #1a2540", transition: "all 0.2s" }) }} className="au4">
            <button onClick={() => setShowKey(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔑</span>
                <span style={{ fontSize: 10, color: "#30D158", letterSpacing: "0.1em" }}>ANSWER KEY</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{showKey ? "hide ▲" : "reveal ▼"}</span>
            </button>
            {showKey && <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(48,209,88,0.1)" }}>{renderMD(answerKey, true)}</div>}
          </div>
        )}

        {/* NEW: Guest counter + action buttons on result screen */}
        {isGuest && (
          <div style={{ ...card({ background: guestChallengeCount >= 2 ? "rgba(255,159,10,0.08)" : "rgba(124,58,237,0.06)", borderColor: guestChallengeCount >= 2 ? "#FF9F0A44" : "#7C3AED44" }), display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[1,2].map(n => <div key={n} style={{ width: 32, height: 6, borderRadius: 99, background: n <= guestChallengeCount ? (guestChallengeCount >= 2 ? "#FF9F0A" : "#7C3AED") : "rgba(255,255,255,0.1)" }}/>)}
            </div>
            <span style={{ fontSize: 12, color: guestChallengeCount >= 2 ? "#FF9F0A" : "rgba(255,255,255,0.4)", fontWeight: 600, flex: 1 }}>
              {guestChallengeCount >= 2 ? "2/2 challenges used" : `${guestChallengeCount}/2 challenges used`}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }} className="au4">
          <button style={btn("#1a2540", "rgba(255,255,255,0.6)")} onClick={() => setPhase("home")}>← Home</button>
          {isGuest && guestChallengeCount >= 2 ? (
            <button style={{ ...btn("#FF9F0A", "#080d1a"), flex: 1 }} onClick={() => setScreen("survey")}>Give Feedback →</button>
          ) : (
            <button style={{ ...btn("#7C3AED", "#fff"), flex: 1 }} onClick={() => { setPhase("home"); setTimeout(() => startChallenge(trackType), 50); }}>
              {isGuest ? `Try Challenge ${guestChallengeCount + 1} of 2 →` : "Another Challenge →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return null;
}
