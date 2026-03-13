import { useState, useEffect } from "react";

// ── storage (localStorage for standalone app) ─────────────────────────────
function storageGet(key) {
  try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return { value }; } catch { return null; }
}
function storageList(prefix) {
  try { const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix)); return { keys }; } catch { return { keys: [] }; }
}

const CHALLENGES = [
  {
    tag: "PRIORITIZATION", color: "#f59e0b",
    hint: {
      framework: "RICE or MoSCoW",
      steps: [
        "State which framework you're using and why",
        "Score or categorize each feature (don't just list them — justify each decision)",
        "Factor in the compliance deadline and churn risk explicitly",
        "End with a clear priority order and what you'd cut if capacity runs out"
      ],
      watch: "Don't just describe the features. A PM prioritizes and defends trade-offs."
    },
    prompt: `You are a B2B PM coach generating a challenge for a junior PM (0-2 years experience). Generate a prioritization challenge:
- A B2B SaaS company context with realistic fake data (ARR, customer count)
- A backlog of 5 features with brief descriptions, effort estimates, and stakeholder pressure
- Constraints: limited sprint capacity, one enterprise customer threatening churn, a compliance deadline
Keep the scenario clear and grounded. Not too complex — this is a learning exercise.
Ask the candidate to prioritize the backlog and justify using a framework. End with a clear single question.`
  },
  {
    tag: "METRICS", color: "#06b6d4",
    hint: {
      framework: "Diagnose → Hypothesize → Measure",
      steps: [
        "First, describe what you see in the data (don't jump to conclusions)",
        "List 2-3 hypotheses for what could be causing the issue",
        "Identify what data is missing that would confirm or kill each hypothesis",
        "Define 2-3 metrics you'd add to your dashboard going forward"
      ],
      watch: "Don't diagnose with one data point. Ask: what else would I need to know?"
    },
    prompt: `You are a B2B PM coach generating a challenge for a junior PM (0-2 years experience). Generate a metrics/data challenge:
- A platform product scenario where something is going wrong (pick one: API error spike, feature adoption drop, or support tickets rising)
- Present 4-5 metrics in a simple text dashboard with realistic fake numbers
- Include one metric that looks alarming but is actually a red herring
Keep it simple and educational. End with a clear question asking them to diagnose and plan next steps.`
  },
  {
    tag: "STAKEHOLDER", color: "#8b5cf6",
    hint: {
      framework: "Understand → Align → Decide",
      steps: [
        "Identify what each stakeholder actually wants underneath their stated position",
        "Find any shared goals or constraints between them",
        "Propose a concrete decision — don't sit on the fence",
        "State clearly who you'd communicate what to, and how"
      ],
      watch: "PMs don't just mediate — they decide. Don't end your answer without a clear recommendation."
    },
    prompt: `You are a B2B PM coach generating a challenge for a junior PM (0-2 years experience). Generate a stakeholder conflict:
- Two or three stakeholders with conflicting positions (e.g. Sales wants a custom feature, Engineering has concerns, a deadline is real)
- Give each stakeholder a clear motivation
- Keep the conflict realistic and resolvable — not impossibly complex
Ask the candidate how they navigate it and what gets built. End with a clear question.`
  },
  {
    tag: "STRATEGY", color: "#10b981",
    hint: {
      framework: "Situation → Options → Recommendation",
      steps: [
        "Summarize the situation in 1-2 sentences to show you understand the core tension",
        "Name 2-3 strategic options (not just one path)",
        "Pick one and defend it with business reasoning",
        "Explicitly state what you would NOT do and why — this shows real strategic thinking"
      ],
      watch: "Strategy without trade-offs is just wishful thinking. What are you giving up?"
    },
    prompt: `You are a B2B PM coach generating a challenge for a junior PM (0-2 years experience). Generate a product strategy challenge:
- A B2B company facing a clear decision (expand to a new segment, respond to a competitor, or double down on a core feature)
- Provide some market context and constraints — fake but realistic
- Make the trade-offs real but not overwhelming for a junior PM
Ask the candidate for their recommended strategy and what they would NOT do. End with a clear question.`
  },
  {
    tag: "USER RESEARCH", color: "#ef4444",
    hint: {
      framework: "Observe → Synthesize → Decide",
      steps: [
        "Summarize what each customer is actually saying (not what they literally said — what they mean)",
        "Identify the common underlying problem, if any",
        "Flag what you still don't know and what you'd ask next",
        "Make a recommendation — even with incomplete data, a PM must have a point of view"
      ],
      watch: "Don't just list the feedback back. Synthesize it. What does it mean for what to build?"
    },
    prompt: `You are a B2B PM coach generating a challenge for a junior PM (0-2 years experience). Generate a customer discovery challenge:
- Two or three enterprise customers gave different feedback about the same product area
- One piece of feedback is urgent (churn risk or big contract), one is contradictory
- The PM needs to decide what to do next with incomplete information
Keep it grounded and approachable. End with a clear question about next steps.`
  },
  {
    tag: "EXECUTION", color: "#f97316",
    hint: {
      framework: "Triage → Communicate → Adapt",
      steps: [
        "Triage first: what is most critical to address in the next 2 hours?",
        "List who you'd talk to and in what order — communication is half the job",
        "State what you'd cut or defer to protect the sprint goal (or acknowledge the goal must change)",
        "End with how you'd run the retrospective after the crisis"
      ],
      watch: "Don't try to fix everything. A good PM in a crisis focuses and communicates — not heroics."
    },
    prompt: `You are a B2B PM coach generating a challenge for a junior PM (0-2 years experience). Generate a sprint execution challenge:
- A realistic mid-sprint problem: a blocker appears (engineer sick, dependency delayed, or scope creep from a stakeholder)
- The sprint goal is at risk but not impossible to save
- Include one stakeholder who needs an update
Keep it manageable. Ask the candidate to walk through how they handle it step by step.`
  },
];

async function callClaude(system, userMsg) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const d = await res.json();
  return d.content?.map(b => b.text || "").join("") || "";
}

const ASSESS_SYSTEM = `You are a PM coach assessing a junior PM (0-2 years experience, Product Owner background, targeting B2B/Enterprise PM roles). They were shown a framework hint before answering.

Your job is to assess where they are TODAY and help them grow — not to judge them against a senior PM standard.

Score them fairly for their level. A 7/10 means they showed solid junior PM thinking. A 10/10 means they genuinely surprised you. Don't be harsh for its own sake, but don't sugarcoat real gaps either.

Structure your response EXACTLY like this:

**SCORE**
Structured Thinking: X/10
Business Acumen: X/10
Specificity & Depth: X/10
PM Maturity: X/10
━━━━━━━━━━━━
Overall: X/10

**WHAT YOU DID WELL**
(2-3 specific things. Be genuine. Quote or reference their actual answer.)

**WHAT WAS MISSING OR WEAK**
(Be honest but kind. Focus on the 1-2 most important gaps — don't overwhelm them with everything wrong.)

**THE ONE THING TO FIX NEXT TIME**
(The single most impactful habit or skill to work on. Make it concrete and learnable.)

**COACH'S NOTE**
(1-2 sentences. Connect their answer to their growth journey. Be a real coach — encouraging but honest.)`;

function MD({ text }) {
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**"))
          return <div key={i} style={{ fontWeight: 700, color: "#e2e8f0", marginTop: 20, marginBottom: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{line.replace(/\*\*/g, "")}</div>;
        if (line.includes("━"))
          return <div key={i} style={{ borderTop: "1px solid #1e293b", margin: "8px 0" }} />;
        if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
            {parts.map((p, j) =>
              p.startsWith("**") ? <strong key={j} style={{ color: "#cbd5e1" }}>{p.replace(/\*\*/g, "")}</strong> : p
            )}
          </div>
        );
      })}
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

export default function PMDailyTraining() {
  const [phase, setPhase] = useState("home");
  const [challenge, setChallenge] = useState("");
  const [tag, setTag] = useState(null);
  const [tagColor, setTagColor] = useState("#f59e0b");
  const [hint, setHint] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [assessment, setAssessment] = useState("");
  const [scores, setScores] = useState(null);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [highScores, setHighScores] = useState(0);
  const [todayDone, setTodayDone] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadMsg, setLoadMsg] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { init(); }, []);

  function init() {
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
  }

  async function startChallenge() {
    setPhase("loading");
    setLoadMsg("Your PM coach is preparing today's challenge…");
    const lastR = storageGet("pm_last_tag");
    let pool = CHALLENGES.filter(c => c.tag !== lastR?.value);
    if (!pool.length) pool = CHALLENGES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTag(pick.tag);
    setTagColor(pick.color);
    setHint(pick.hint);
    setHintOpen(false);
    try {
      const text = await callClaude(pick.prompt, "Generate the challenge now. Be direct and specific.");
      setChallenge(text);
      setAnswer("");
      setPhase("answering");
    } catch {
      setChallenge("Network error — please try again.");
      setPhase("answering");
    }
  }

  async function submitAnswer() {
    if (answer.trim().length < 60) return;
    setPhase("loading");
    setLoadMsg("Your PM coach is reviewing your answer…");
    try {
      const result = await callClaude(
        ASSESS_SYSTEM,
        `CHALLENGE TYPE: ${tag}\n\nCHALLENGE:\n${challenge}\n\nCANDIDATE'S ANSWER:\n${answer}`
      );
      setAssessment(result);
      const m = (label) => { const r = new RegExp(label + "[:\\s]+(\\d+)/10", "i"); const x = result.match(r); return x ? parseInt(x[1]) : 5; };
      const s = { structured: m("Structured Thinking"), business: m("Business Acumen"), depth: m("Specificity"), maturity: m("PM Maturity"), overall: m("Overall") };
      setScores(s);
      saveSession(s);
      setPhase("result");
    } catch {
      setAssessment("Could not get assessment. Please try again.");
      setPhase("result");
    }
  }

  function saveSession(s) {
    const lastR = storageGet("pm_last_date");
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    const streakR = storageGet("pm_streak");
    let cur = parseInt(streakR?.value || "0");
    if (lastR?.value === yStr) cur += 1;
    else if (lastR?.value !== today) cur = 1;
    storageSet("pm_streak", String(cur));
    storageSet("pm_last_date", today);
    storageSet("pm_last_tag", tag);
    const session = { date: today, tag, scores: s };
    storageSet(`pm_session:${today}:${Date.now()}`, JSON.stringify(session));
    setStreak(cur);
    setTodayDone(true);
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

  if (phase === "loading") return (
    <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 30, marginBottom: 14, display: "inline-block", animation: "spin 1.8s linear infinite" }}>◌</div>
      <div style={{ color: "#475569", fontSize: 12, letterSpacing: "0.05em" }}>{loadMsg}</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (phase === "home") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "0.18em", marginBottom: 10 }}>PM COACH · B2B/ENTERPRISE TRACK</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>Daily PM Training</div>
          <div style={{ fontSize: 12, color: "#3d5070", marginTop: 5 }}>One challenge. One assessment. Every day.</div>
        </div>

        <div style={{ ...card(), display: "flex", gap: 0 }}>
          {[["STREAK", streak, streak > 0 ? "#f59e0b" : "#1e293b"], ["TOTAL", total, "#06b6d4"], ["7+ SCORES", highScores, "#8b5cf6"]].map(([lbl, val, col], i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid #1a2540" : "none", padding: "4px 0" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: col }}>{val}</div>
              <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.1em" }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={card()}>
          {todayDone ? (
            <>
              <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 8 }}>✓ Today's challenge is done</div>
              <div style={{ fontSize: 13, color: "#3d5070", lineHeight: 1.7, marginBottom: 16 }}>Good. Come back tomorrow. Consistency beats intensity.</div>
              <button style={btn("#1a2540", "#64748b")} onClick={() => setPhase("result")}>Review today's assessment →</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 18 }}>
                A random B2B PM scenario is waiting. Write a real answer — your PM coach will score you across 4 dimensions.
              </div>
              <button style={btn("#f59e0b")} onClick={startChallenge}>Start today's challenge →</button>
            </>
          )}
        </div>

        {history.length > 0 && (
          <div style={card()}>
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 14 }}>RECENT SESSIONS</div>
            {history.slice(0, 8).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < Math.min(history.length, 8) - 1 ? "1px solid #111827" : "none" }}>
                <span style={tag_pill(CHALLENGES.find(c => c.tag === s.tag)?.color || "#64748b")}>{s.tag}</span>
                <span style={{ fontSize: 11, color: "#2d3f5a", flex: 1 }}>{s.date}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.scores?.overall >= 7 ? "#4ade80" : s.scores?.overall >= 5 ? "#facc15" : "#f87171" }}>
                  {s.scores?.overall ?? "–"}/10
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...card(), borderColor: "#111827" }}>
          <div style={{ fontSize: 10, color: "#2d3f5a", letterSpacing: "0.12em", marginBottom: 14 }}>6 CHALLENGE TYPES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CHALLENGES.map(c => <span key={c.tag} style={tag_pill(c.color)}>{c.tag}</span>)}
          </div>
        </div>
      </div>
    </div>
  );

  if (phase === "answering") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={tag_pill(tagColor)}>{tag}</span>
          <span style={{ fontSize: 11, color: "#2d3f5a" }}>{today}</span>
        </div>

        <div style={{ ...card({ borderColor: tagColor + "28", background: "#0a1020" }) }}>
          <div style={{ fontSize: 10, color: tagColor, letterSpacing: "0.12em", marginBottom: 14 }}>TODAY'S CHALLENGE</div>
          <div style={{ fontSize: 13, color: "#7a90b0", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{challenge}</div>
        </div>

        {hint && (
          <div style={{ ...card({ borderColor: "#1a3040", background: "#091520" }), marginBottom: 14 }}>
            <button
              onClick={() => setHintOpen(o => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: font }}
            >
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
                  <span style={{ fontSize: 11, color: "#78716c" }}>⚠ </span>
                  <span style={{ fontSize: 12, color: "#78716c" }}>{hint.watch}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={card()}>
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 12 }}>YOUR ANSWER</div>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder={"Write your answer here.\n\nThink out loud. Use a framework. Be specific.\nVague answers will be called out by your coach."}
            style={{
              width: "100%", minHeight: 200, background: "#080d1a", border: "1px solid #1a2540",
              borderRadius: 7, color: "#cbd5e1", fontFamily: font, fontSize: 13,
              padding: 16, lineHeight: 1.8, resize: "vertical", boxSizing: "border-box",
              outline: "none"
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <div style={{ fontSize: 11, color: answer.length < 60 ? "#ef4444" : "#2d3f5a" }}>
              {answer.length < 60 ? `min ${60 - answer.length} more chars` : `${answer.length} chars`}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn("#1a2540", "#475569")} onClick={() => setPhase("home")}>← Back</button>
              <button style={btn(answer.length >= 60 ? tagColor : "#1a2540", answer.length >= 60 ? "#080d1a" : "#2d3f5a", answer.length < 60)} onClick={submitAnswer} disabled={answer.length < 60}>
                Submit →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (phase === "result") return (
    <div style={base}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
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
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 16 }}>FULL ASSESSMENT</div>
          <MD text={assessment} />
        </div>

        <button style={btn("#1a2540", "#64748b")} onClick={() => setPhase("home")}>← Back to home</button>
      </div>
    </div>
  );

  return null;
}
