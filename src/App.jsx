import { useState, useEffect } from "react";

// ── storage ───────────────────────────────────────────────────────────────
function storageGet(key) {
  try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return { value }; } catch { return null; }
}
function storageList(prefix) {
  try { const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix)); return { keys }; } catch { return { keys: [] }; }
}

// ── challenge pool ────────────────────────────────────────────────────────
const CHALLENGES = {
  B2B: [
    {
      tag: "PRIORITIZATION", color: "#f59e0b",
      hint: {
        framework: "RICE or MoSCoW",
        steps: [
          "State which framework you're using and why",
          "Score or categorize each feature — justify every decision",
          "Factor in the compliance deadline and churn risk explicitly",
          "End with a clear priority order and what you'd cut if capacity runs out"
        ],
        watch: "Don't just describe the features. A PM prioritizes and defends trade-offs."
      },
      prompt: `Generate a B2B SaaS prioritization challenge for a junior PM (0-2 years):
- A B2B SaaS company with realistic fake data (ARR, customer count)
- A backlog of 5 features with descriptions, effort estimates, and stakeholder pressure
- Constraints: limited sprint, one enterprise customer threatening churn, a compliance deadline
End with a clear single question asking them to prioritize using a framework.`
    },
    {
      tag: "METRICS", color: "#06b6d4",
      hint: {
        framework: "Diagnose → Hypothesize → Measure",
        steps: [
          "Describe what you see in the data first — don't jump to conclusions",
          "List 2-3 hypotheses for what could be causing the issue",
          "Identify what data is missing to confirm or kill each hypothesis",
          "Define 2-3 metrics you'd add to your dashboard"
        ],
        watch: "Don't diagnose with one data point. Ask: what else would I need to know?"
      },
      prompt: `Generate a B2B platform metrics challenge for a junior PM (0-2 years):
- A platform scenario where something is wrong (API error spike, feature adoption drop, or rising support tickets)
- A simple text dashboard with 4-5 fake but realistic metrics
- One metric that looks alarming but is actually a red herring
End with a clear question asking them to diagnose and plan next steps.`
    },
    {
      tag: "STAKEHOLDER", color: "#8b5cf6",
      hint: {
        framework: "Understand → Align → Decide",
        steps: [
          "Identify what each stakeholder actually wants beneath their stated position",
          "Find any shared goals or constraints between them",
          "Propose a concrete decision — don't sit on the fence",
          "State clearly who you'd communicate what to, and how"
        ],
        watch: "PMs don't just mediate — they decide. Don't end without a clear recommendation."
      },
      prompt: `Generate a B2B stakeholder conflict for a junior PM (0-2 years):
- 2-3 stakeholders with conflicting positions (Sales vs Engineering vs Legal or similar)
- Each stakeholder has a clear motivation and power dynamic
- The PM has 1 sprint and real deadline pressure
End with a clear question about how they navigate it.`
    },
    {
      tag: "STRATEGY", color: "#10b981",
      hint: {
        framework: "Situation → Options → Recommendation",
        steps: [
          "Summarize the core tension in 1-2 sentences",
          "Name 2-3 strategic options — not just one path",
          "Pick one and defend it with business reasoning",
          "Explicitly state what you would NOT do and why"
        ],
        watch: "Strategy without trade-offs is wishful thinking. What are you giving up?"
      },
      prompt: `Generate a B2B product strategy challenge for a junior PM (0-2 years):
- A B2B company at a crossroads (expand upmarket, fight a competitor, or double down on core)
- Realistic fake market context and constraints
- Real trade-offs with no obvious answer
End with a clear strategy question.`
    },
    {
      tag: "USER RESEARCH", color: "#ef4444",
      hint: {
        framework: "Observe → Synthesize → Decide",
        steps: [
          "Summarize what each customer actually means — not what they literally said",
          "Identify the common underlying problem if any",
          "Flag what you still don't know and what you'd ask next",
          "Make a recommendation — a PM must have a point of view even with incomplete data"
        ],
        watch: "Don't just list feedback back. Synthesize it. What does it mean for what to build?"
      },
      prompt: `Generate a B2B customer discovery challenge for a junior PM (0-2 years):
- 2-3 enterprise customers gave different feedback on the same product area
- One piece is urgent (churn risk), one is contradictory
- The PM must decide what to do next with incomplete information
End with a clear question about next steps.`
    },
    {
      tag: "EXECUTION", color: "#f97316",
      hint: {
        framework: "Triage → Communicate → Adapt",
        steps: [
          "Triage first: what is most critical in the next 2 hours?",
          "List who you'd talk to and in what order — communication is half the job",
          "State what you'd cut or defer to protect the sprint goal",
          "End with how you'd run the retrospective after the crisis"
        ],
        watch: "Don't try to fix everything. A good PM in a crisis focuses and communicates."
      },
      prompt: `Generate a B2B sprint execution challenge for a junior PM (0-2 years):
- A realistic mid-sprint blocker (engineer sick, dependency delayed, or stakeholder scope creep)
- The sprint goal is at risk but saveable
- One stakeholder who needs an update
End with a step-by-step question about how they handle it.`
    },
  ],
  B2C: [
    {
      tag: "PRIORITIZATION", color: "#f59e0b",
      hint: {
        framework: "RICE or Impact vs Effort",
        steps: [
          "State which framework you're using and why",
          "Consider user volume, engagement impact, and retention effect for each feature",
          "Factor in App Store ratings, viral loops, and seasonal timing",
          "End with a clear priority order and what you'd cut"
        ],
        watch: "B2C is about volume and delight. Don't prioritize like a B2B PM — user love matters here."
      },
      prompt: `Generate a B2C mobile app prioritization challenge for a junior PM (0-2 years):
- A consumer app (social, e-commerce, fitness, or fintech) with realistic fake data (MAU, DAU, ratings)
- A backlog of 5 features with descriptions and effort estimates
- Constraints: limited engineering, a competitor just launched a similar feature, upcoming holiday season
End with a clear question asking them to prioritize using a framework.`
    },
    {
      tag: "METRICS", color: "#06b6d4",
      hint: {
        framework: "AARRR Funnel (Acquisition → Activation → Retention → Revenue → Referral)",
        steps: [
          "Map the metrics to the AARRR funnel stage they belong to",
          "Identify where in the funnel the biggest drop-off is",
          "List 2-3 hypotheses for why users are dropping off",
          "Define which single metric you'd focus on fixing first and why"
        ],
        watch: "B2C is all about the funnel. Don't look at one metric in isolation — where is the leak?"
      },
      prompt: `Generate a B2C consumer app metrics challenge for a junior PM (0-2 years):
- A consumer app with a funnel problem (sign-up drop-off, day-7 retention dip, or low referral rate)
- A simple text dashboard with 5 fake but realistic consumer metrics (DAU, MAU, D7 retention, etc.)
- One misleading metric as a red herring
End with a question asking them to diagnose the funnel and recommend one focus area.`
    },
    {
      tag: "USER RESEARCH", color: "#ef4444",
      hint: {
        framework: "Jobs To Be Done (JTBD)",
        steps: [
          "Identify what 'job' each user is hiring the product to do",
          "Find the gap between what users expect and what they're getting",
          "Separate nice-to-have feedback from genuine pain points",
          "Recommend what to build next and what to ignore"
        ],
        watch: "B2C users can't always articulate what they want. Focus on what they DO, not what they SAY."
      },
      prompt: `Generate a B2C user research challenge for a junior PM (0-2 years):
- A consumer app with 3 different user segments giving conflicting feedback (power user, casual user, churned user)
- Some feedback is emotional and vague, some is feature-specific
- The PM must figure out what to actually build from messy qualitative data
End with a clear question about how they synthesize the feedback and what they build.`
    },
    {
      tag: "GROWTH", color: "#10b981",
      hint: {
        framework: "Growth Loops (Acquisition → Engagement → Retention → Monetization)",
        steps: [
          "Identify which growth loop is broken or missing",
          "Pick ONE lever to pull — don't try to fix everything",
          "Define how you'd measure if your fix is working",
          "Estimate the potential impact in user numbers or revenue"
        ],
        watch: "Growth is not a feature. It's a system. Find the loop, don't just add buttons."
      },
      prompt: `Generate a B2C growth challenge for a junior PM (0-2 years):
- A consumer app that has plateaued (growth stalled, retention dropping, or monetization weak)
- Realistic fake metrics showing the problem
- Multiple possible levers but limited engineering resources
End with a clear question: what single growth lever would you pull and why?`
    },
    {
      tag: "STRATEGY", color: "#8b5cf6",
      hint: {
        framework: "Market → User → Product → Moat",
        steps: [
          "Describe the market opportunity and who the core user is",
          "State the product's current unique value proposition",
          "Identify the strategic threat or opportunity to respond to",
          "Recommend a direction that builds or defends a moat"
        ],
        watch: "B2C strategy is about winning hearts at scale. What makes users choose you over a competitor?"
      },
      prompt: `Generate a B2C product strategy challenge for a junior PM (0-2 years):
- A consumer app facing a strategic decision (new market, defend against a competitor, or new monetization model)
- Realistic fake user and market data
- Trade-offs between growth and monetization, or engagement and privacy
End with a clear strategy question.`
    },
    {
      tag: "EXECUTION", color: "#f97316",
      hint: {
        framework: "Triage → Communicate → Ship",
        steps: [
          "Identify what is breaking user experience RIGHT NOW — that's priority one",
          "Decide: hotfix now or wait for proper fix? State your reasoning",
          "Communicate clearly to users if the issue is visible to them",
          "Define what 'done' looks like and how you'll know it's fixed"
        ],
        watch: "B2C execution crises are public. Users tweet. Think about communication to users, not just internal teams."
      },
      prompt: `Generate a B2C app execution crisis for a junior PM (0-2 years):
- A consumer-facing incident (checkout broken, app crashing on iOS update, or a viral negative tweet)
- Public user impact with real-time social media pressure
- Engineering says 4 hours to fix, but users are already leaving reviews
End with a question about how the PM handles the crisis step by step.`
    },
  ]
};

async function callClaude(system, userMsg) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const d = await res.json();
  return d.content?.map(b => b.text || "").join("") || "";
}

const ASSESS_SYSTEM = `You are a PM coach assessing a junior PM (0-2 years, Product Owner background). They were shown a framework hint before answering.

Assess where they are TODAY to help them grow. Score fairly for their level — 7/10 = solid junior PM thinking.

Structure your response EXACTLY like this — no deviations:

**SCORE**
Structured Thinking: X/10
Business Acumen: X/10
Specificity & Depth: X/10
PM Maturity: X/10
━━━━━━━━━━━━
Overall: X/10

**WHAT YOU DID WELL**
(2-3 specific things. Quote or reference their actual answer.)

**WHAT WAS MISSING OR WEAK**
(Be honest but kind. Focus on 1-2 most important gaps only.)

**THE ONE THING TO FIX NEXT TIME**
(Single most impactful improvement. Concrete and learnable.)

**COACH'S NOTE**
(1-2 sentences. Real encouragement tied to their growth journey.)

---ANSWER_KEY_BELOW---

**WHAT A STRONG ANSWER LOOKS LIKE**
(Write a model answer for this exact challenge — 150-200 words. Show the structure, the frameworks used, the business reasoning, and the specific things a strong junior PM would say. This is the answer key — make it educational and specific to the challenge above.)`;

function MD({ text }) {
  // Split at answer key divider
  const parts = text.split("---ANSWER_KEY_BELOW---");
  const assessment = parts[0] || text;
  const answerKey = parts[1] || "";

  const renderSection = (t) => {
    const lines = t.trim().split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**"))
        return <div key={i} style={{ fontWeight: 700, color: "#e2e8f0", marginTop: 20, marginBottom: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{line.replace(/\*\*/g, "")}</div>;
      if (line.includes("━"))
        return <div key={i} style={{ borderTop: "1px solid #1e293b", margin: "8px 0" }} />;
      if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
      const ps = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
          {ps.map((p, j) => p.startsWith("**") ? <strong key={j} style={{ color: "#cbd5e1" }}>{p.replace(/\*\*/g, "")}</strong> : p)}
        </div>
      );
    });
  };

  return (
    <div>
      <div>{renderSection(assessment)}</div>
      {answerKey && <div data-answerkey>{renderSection(answerKey)}</div>}
    </div>
  );
}

function Bar({ label, score }) {
  const color = score >= 7 ? "#4ade80" : score >= 5 ? "#facc15" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0" }}>
      <div style={{ fontSize: 12, color: "#64748b", width: 170, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 5, background: "#1e293b", borderRadius: 9 }}>
        <div style={{ width: `${score * 10}%`, height: "100%", background: color, borderRadius: 9, transition: "width 1.4s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color, width: 40, textAlign: "right" }}>{score}/10</div>
    </div>
  );
}

const USERS = ["Siddhant", "Friend 2", "Friend 3", "Friend 4", "Friend 5", "Friend 6"];

export default function PMDailyTraining() {
  const [phase, setPhase] = useState("home");
  const [userName, setUserName] = useState(null);
  const [trackType, setTrackType] = useState(null); // "B2B" | "B2C"
  const [challenge, setChallenge] = useState("");
  const [tag, setTag] = useState(null);
  const [tagColor, setTagColor] = useState("#f59e0b");
  const [hint, setHint] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [assessment, setAssessment] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [scores, setScores] = useState(null);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [highScores, setHighScores] = useState(0);
  const [todayDone, setTodayDone] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadMsg, setLoadMsg] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  // Load user from storage on mount
  useEffect(() => {
    const saved = storageGet("pm_current_user");
    if (saved?.value) {
      setUserName(saved.value);
      loadUserData(saved.value);
    }
  }, []);

  function loadUserData(name) {
    const prefix = `pm_${name}_`;
    const streakR = storageGet(prefix + "streak");
    const lastR = storageGet(prefix + "last_date");
    const histR = storageList(prefix + "session:");
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
  }

  function selectUser(name) {
    setUserName(name);
    storageSet("pm_current_user", name);
    loadUserData(name);
  }

  function switchUser() {
    setUserName(null);
    setStreak(0); setTotal(0); setHighScores(0);
    setTodayDone(false); setHistory([]);
    setPhase("home");
  }

  async function startChallenge() {
    setPhase("loading");
    setLoadMsg("Preparing your challenge…");
    const pool = CHALLENGES[trackType];
    const prefix = `pm_${userName}_`;
    const lastR = storageGet(prefix + "last_tag");
    let filtered = pool.filter(c => c.tag !== lastR?.value);
    if (!filtered.length) filtered = pool;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setTag(pick.tag); setTagColor(pick.color); setHint(pick.hint); setHintOpen(false);
    try {
      const text = await callClaude(
        `You are a B2B/B2C PM coach generating a ${trackType} challenge for a junior PM. Be specific, realistic, and educational.`,
        pick.prompt
      );
      setChallenge(text); setAnswer(""); setPhase("answering");
    } catch {
      setChallenge("Network error — please check your API key and try again.");
      setPhase("answering");
    }
  }

  async function submitAnswer() {
    if (answer.trim().length < 60) return;
    setPhase("loading");
    setLoadMsg("Reviewing your answer…");
    try {
      const result = await callClaude(
        ASSESS_SYSTEM,
        `TRACK: ${trackType}\nCHALLENGE TYPE: ${tag}\n\nCHALLENGE:\n${challenge}\n\nCANDIDATE'S ANSWER:\n${answer}`
      );
      // Split assessment from answer key
      const splitIdx = result.indexOf("---ANSWER_KEY_BELOW---");
      const assessPart = splitIdx > -1 ? result.slice(0, splitIdx) : result;
      const keyPart = splitIdx > -1 ? result.slice(splitIdx + "---ANSWER_KEY_BELOW---".length) : "";
      setAssessment(assessPart);
      setAnswerKey(keyPart);
      setShowAnswerKey(false);

      const m = (label) => { const r = new RegExp(label + "[:\\s]+(\\d+)/10", "i"); const x = assessPart.match(r); return x ? parseInt(x[1]) : 5; };
      const s = { structured: m("Structured Thinking"), business: m("Business Acumen"), depth: m("Specificity"), maturity: m("PM Maturity"), overall: m("Overall") };
      setScores(s);
      saveSession(s);
      setPhase("result");
    } catch {
      setAssessment("Could not get assessment. Please check your API key.");
      setPhase("result");
    }
  }

  function saveSession(s) {
    const prefix = `pm_${userName}_`;
    const lastR = storageGet(prefix + "last_date");
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    const streakR = storageGet(prefix + "streak");
    let cur = parseInt(streakR?.value || "0");
    if (lastR?.value === yStr) cur += 1;
    else if (lastR?.value !== today) cur = 1;
    storageSet(prefix + "streak", String(cur));
    storageSet(prefix + "last_date", today);
    storageSet(prefix + "last_tag", tag);
    const session = { date: today, tag, track: trackType, scores: s };
    storageSet(`${prefix}session:${today}:${Date.now()}`, JSON.stringify(session));
    setStreak(cur); setTodayDone(true);
    setTotal(p => p + 1);
    if (s.overall >= 7) setHighScores(p => p + 1);
    setHistory(prev => [session, ...prev].slice(0, 30));
  }

  const font = "'IBM Plex Mono', monospace";
  const base = { fontFamily: font, background: "#080d1a", minHeight: "100vh", color: "#e2e8f0", padding: "28px 20px" };
  const card = (extra = {}) => ({ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 10, padding: 22, marginBottom: 14, ...extra });
  const tag_pill = (color) => ({ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: color + "18", color, letterSpacing: "0.12em", fontWeight: 700 });
  const btn = (bg, fg = "#080d1a", disabled = false) => ({
    background: bg, color: fg, border: "none", borderRadius: 7, padding: "11px 24px",
    fontFamily: font, fontWeight: 700, fontSize: 12, cursor: disabled ? "default" : "pointer",
    letterSpacing: "0.05em", opacity: disabled ? 0.4 : 1,
  });

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 30, marginBottom: 14, display: "inline-block", animation: "spin 1.8s linear infinite" }}>◌</div>
      <div style={{ color: "#475569", fontSize: 12 }}>{loadMsg}</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── USER PICKER ──────────────────────────────────────────────────────────
  if (!userName) return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 500, margin: "60px auto" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "0.18em", marginBottom: 10 }}>PM DAILY TRAINING</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>Who are you?</div>
          <div style={{ fontSize: 12, color: "#3d5070", marginTop: 6 }}>Your progress is saved separately for each person.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {USERS.map((name, i) => (
            <button key={i} onClick={() => selectUser(name)} style={{
              ...btn("#0d1526"), border: "1px solid #1a2540", borderRadius: 10, padding: "18px 12px",
              color: "#94a3b8", fontSize: 13, textAlign: "center", transition: "all 0.2s",
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = "#f59e0b"}
              onMouseOut={e => e.currentTarget.style.borderColor = "#1a2540"}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>
                {["🧑‍💼","👩‍💼","🧑‍💻","👨‍💻","👩‍🎓","🧑‍🎓"][i]}
              </div>
              <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── HOME ─────────────────────────────────────────────────────────────────
  if (phase === "home") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "0.18em", marginBottom: 6 }}>PM DAILY TRAINING</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>Hey, {userName} 👋</div>
            <div style={{ fontSize: 12, color: "#3d5070", marginTop: 4 }}>One challenge. One assessment. Every day.</div>
          </div>
          <button onClick={switchUser} style={{ ...btn("#1a2540", "#475569"), padding: "8px 14px", fontSize: 11 }}>Switch user</button>
        </div>

        {/* Stats */}
        <div style={{ ...card(), display: "flex", gap: 0 }}>
          {[["STREAK", streak, streak > 0 ? "#f59e0b" : "#334155"], ["TOTAL", total, "#06b6d4"], ["7+ SCORES", highScores, "#8b5cf6"]].map(([lbl, val, col], i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid #1a2540" : "none", padding: "4px 0" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: col }}>{val}</div>
              <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.1em" }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Today's action */}
        <div style={card()}>
          {todayDone ? (
            <>
              <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 8 }}>✓ Today's challenge is done</div>
              <div style={{ fontSize: 13, color: "#3d5070", lineHeight: 1.7, marginBottom: 16 }}>Good. Come back tomorrow. Consistency beats intensity.</div>
              <button style={btn("#1a2540", "#64748b")} onClick={() => setPhase("result")}>Review today's assessment →</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
                Choose your track, then answer a real PM scenario. Your coach will score you across 4 dimensions.
              </div>
              <button style={btn("#f59e0b")} onClick={() => setPhase("track")}>Start today's challenge →</button>
            </>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={card()}>
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 14 }}>RECENT SESSIONS</div>
            {history.slice(0, 8).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < Math.min(history.length - 1, 7) ? "1px solid #111827" : "none" }}>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: s.track === "B2C" ? "#06b6d422" : "#8b5cf622", color: s.track === "B2C" ? "#06b6d4" : "#8b5cf6", fontWeight: 700 }}>{s.track || "B2B"}</span>
                <span style={tag_pill(CHALLENGES.B2B.concat(CHALLENGES.B2C).find(c => c.tag === s.tag)?.color || "#64748b")}>{s.tag}</span>
                <span style={{ fontSize: 11, color: "#2d3f5a", flex: 1 }}>{s.date}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.scores?.overall >= 7 ? "#4ade80" : s.scores?.overall >= 5 ? "#facc15" : "#f87171" }}>
                  {s.scores?.overall ?? "–"}/10
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Track info */}
        <div style={{ ...card(), borderColor: "#111827" }}>
          <div style={{ fontSize: 10, color: "#2d3f5a", letterSpacing: "0.12em", marginBottom: 14 }}>AVAILABLE TRACKS</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 700, marginBottom: 8 }}>B2B TRACK</div>
              {["PRIORITIZATION","METRICS","STAKEHOLDER","STRATEGY","USER RESEARCH","EXECUTION"].map(t => (
                <div key={t} style={{ fontSize: 11, color: "#334155", marginBottom: 4 }}>· {t}</div>
              ))}
            </div>
            <div style={{ width: 1, background: "#1a2540" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#06b6d4", fontWeight: 700, marginBottom: 8 }}>B2C TRACK</div>
              {["PRIORITIZATION","METRICS","USER RESEARCH","GROWTH","STRATEGY","EXECUTION"].map(t => (
                <div key={t} style={{ fontSize: 11, color: "#334155", marginBottom: 4 }}>· {t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── TRACK SELECTOR ───────────────────────────────────────────────────────
  if (phase === "track") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 560, margin: "60px auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.15em", marginBottom: 10 }}>TODAY'S CHALLENGE</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>Choose your track</div>
          <div style={{ fontSize: 13, color: "#3d5070", marginTop: 6 }}>Pick the PM world you want to practice today.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { type: "B2B", color: "#8b5cf6", emoji: "🏢", desc: "Enterprise & platform products. Compliance, contracts, long sales cycles." },
            { type: "B2C", color: "#06b6d4", emoji: "📱", desc: "Consumer apps. Growth loops, funnels, user delight, viral mechanics." }
          ].map(({ type, color, emoji, desc }) => (
            <button key={type} onClick={() => { setTrackType(type); startChallenge(); }}
              style={{ background: "#0d1526", border: `2px solid ${color}33`, borderRadius: 12, padding: 24, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: font }}
              onMouseOver={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = color + "11"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = color + "33"; e.currentTarget.style.background = "#0d1526"; }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{emoji}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color, marginBottom: 8 }}>{type} PM</div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{desc}</div>
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button style={{ ...btn("#1a2540", "#475569") }} onClick={() => setPhase("home")}>← Back</button>
        </div>
      </div>
    </div>
  );

  // ── ANSWERING ────────────────────────────────────────────────────────────
  if (phase === "answering") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: trackType === "B2C" ? "#06b6d422" : "#8b5cf622", color: trackType === "B2C" ? "#06b6d4" : "#8b5cf6", letterSpacing: "0.1em", fontWeight: 700 }}>{trackType}</span>
          <span style={tag_pill(tagColor)}>{tag}</span>
          <span style={{ fontSize: 11, color: "#2d3f5a" }}>{today}</span>
        </div>

        <div style={{ ...card({ borderColor: tagColor + "28", background: "#0a1020" }) }}>
          <div style={{ fontSize: 10, color: tagColor, letterSpacing: "0.12em", marginBottom: 14 }}>TODAY'S CHALLENGE</div>
          <div style={{ fontSize: 13, color: "#7a90b0", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{challenge}</div>
        </div>

        {hint && (
          <div style={{ ...card({ borderColor: "#1a3040", background: "#091520" }) }}>
            <button onClick={() => setHintOpen(o => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13 }}>💡</span>
                <span style={{ fontSize: 10, color: "#38bdf8", letterSpacing: "0.12em" }}>FRAMEWORK HINT</span>
                <span style={{ fontSize: 10, color: "#1e4060", background: "#0d2535", padding: "2px 8px", borderRadius: 4 }}>{hint.framework}</span>
              </div>
              <span style={{ fontSize: 11, color: "#334155" }}>{hintOpen ? "hide ▲" : "show ▼"}</span>
            </button>
            {hintOpen && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: "#2d5070", letterSpacing: "0.08em", marginBottom: 10 }}>HOW TO STRUCTURE YOUR ANSWER</div>
                {hint.steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: 12, minWidth: 18 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: "#4a7090", lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: "10px 14px", background: "#0a1e30", borderRadius: 6, borderLeft: "2px solid #f59e0b" }}>
                  <span style={{ fontSize: 12, color: "#78716c" }}>⚠ {hint.watch}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={card()}>
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 12 }}>YOUR ANSWER</div>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder={"Write your answer here.\n\nThink out loud. Use a framework. Be specific.\nVague answers will be called out by your coach."}
            style={{ width: "100%", minHeight: 200, background: "#080d1a", border: "1px solid #1a2540", borderRadius: 7, color: "#cbd5e1", fontFamily: font, fontSize: 13, padding: 16, lineHeight: 1.8, resize: "vertical", boxSizing: "border-box", outline: "none" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <div style={{ fontSize: 11, color: answer.length < 60 ? "#ef4444" : "#2d3f5a" }}>
              {answer.length < 60 ? `min ${60 - answer.length} more chars` : `${answer.length} chars`}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn("#1a2540", "#475569")} onClick={() => setPhase("track")}>← Back</button>
              <button style={btn(answer.length >= 60 ? tagColor : "#1a2540", answer.length >= 60 ? "#080d1a" : "#2d3f5a", answer.length < 60)} onClick={submitAnswer} disabled={answer.length < 60}>
                Submit →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── RESULT ───────────────────────────────────────────────────────────────
  if (phase === "result") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: trackType === "B2C" ? "#06b6d422" : "#8b5cf622", color: trackType === "B2C" ? "#06b6d4" : "#8b5cf6", letterSpacing: "0.1em", fontWeight: 700 }}>{trackType}</span>
          <span style={tag_pill(tagColor)}>{tag}</span>
          <span style={{ fontSize: 11, color: "#2d3f5a" }}>Assessment · {today}</span>
        </div>

        {scores && (
          <div style={card()}>
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 16 }}>SCORES</div>
            <Bar label="Structured Thinking" score={scores.structured} />
            <Bar label="Business Acumen" score={scores.business} />
            <Bar label="Specificity & Depth" score={scores.depth} />
            <Bar label="PM Maturity" score={scores.maturity} />
            <div style={{ borderTop: "1px solid #1a2540", marginTop: 10, paddingTop: 10 }}>
              <Bar label="Overall" score={scores.overall} />
            </div>
          </div>
        )}

        <div style={card()}>
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 16 }}>ASSESSMENT</div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {assessment.split("\n").map((line, i) => {
              if (line.startsWith("**") && line.endsWith("**"))
                return <div key={i} style={{ fontWeight: 700, color: "#e2e8f0", marginTop: 20, marginBottom: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{line.replace(/\*\*/g, "")}</div>;
              if (line.includes("━")) return <div key={i} style={{ borderTop: "1px solid #1e293b", margin: "8px 0" }} />;
              if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
              const ps = line.split(/(\*\*[^*]+\*\*)/g);
              return <div key={i} style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>{ps.map((p, j) => p.startsWith("**") ? <strong key={j} style={{ color: "#cbd5e1" }}>{p.replace(/\*\*/g, "")}</strong> : p)}</div>;
            })}
          </div>
        </div>

        {/* Answer Key */}
        {answerKey && (
          <div style={{ ...card({ borderColor: showAnswerKey ? "#10b98133" : "#1a2540", background: showAnswerKey ? "#091a12" : "#0d1526" }) }}>
            <button onClick={() => setShowAnswerKey(o => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13 }}>🔑</span>
                <span style={{ fontSize: 10, color: "#10b981", letterSpacing: "0.12em" }}>ANSWER KEY</span>
                <span style={{ fontSize: 10, color: "#1a4030", background: "#0d2520", padding: "2px 8px", borderRadius: 4 }}>What a strong answer looks like</span>
              </div>
              <span style={{ fontSize: 11, color: "#334155" }}>{showAnswerKey ? "hide ▲" : "reveal ▼"}</span>
            </button>
            {showAnswerKey && (
              <div style={{ marginTop: 16 }}>
                {answerKey.split("\n").map((line, i) => {
                  if (line.startsWith("**") && line.endsWith("**"))
                    return <div key={i} style={{ fontWeight: 700, color: "#10b981", marginTop: 16, marginBottom: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{line.replace(/\*\*/g, "")}</div>;
                  if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
                  const ps = line.split(/(\*\*[^*]+\*\*)/g);
                  return <div key={i} style={{ color: "#6ee7b7", fontSize: 14, lineHeight: 1.8 }}>{ps.map((p, j) => p.startsWith("**") ? <strong key={j} style={{ color: "#a7f3d0" }}>{p.replace(/\*\*/g, "")}</strong> : p)}</div>;
                })}
              </div>
            )}
          </div>
        )}

        <button style={btn("#1a2540", "#64748b")} onClick={() => setPhase("home")}>← Back to home</button>
      </div>
    </div>
  );

  return null;
}
