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
  PO: [
    { tag: "Prioritization", color: "#F472B6", icon: "⚖️",
      hint: { framework: "MoSCoW + WSJF", steps: ["List all backlog items and their business value","Apply MoSCoW (Must/Should/Could/Won't) first","Use WSJF — Cost of Delay ÷ Job Size to rank Must-haves","Flag items that block plugin go-lives or host onboarding"], watch: "Don't just rank by effort. A small FHIR compliance fix could unblock 3 hospital plugins. Business value is king." },
      prompt: `You are simulating a day-in-the-life scenario for a Product Owner at CGM ASSIST — a healthcare API integration platform that sits between clinical host systems (EHRs) and external plugins or services (FHIR, third-party medical tools). The PO must manage the plugin registry backlog.

Scenario: Sprint planning is in 2 hours. You have 7 backlog items:
1. FHIR R4 patient resource mapping — 8 pts, blocks 3 pending plugin certifications
2. Plugin retry-on-timeout logic — 3 pts, causes 12% of plugin calls to silently fail
3. New plugin developer portal (docs + sandbox) — 13 pts, sales requested for Q3
4. Host system authentication token refresh bug — 2 pts, 1 hospital reporting login drops
5. Audit log export for compliance team — 5 pts, regulatory audit in 6 weeks
6. Webhook event schema versioning — 8 pts, breaking change for 2 live plugins
7. Rate limiting dashboard for plugin developers — 3 pts, nice-to-have

Sprint capacity: 18 points. Two developers, one QA.

MCQ format: Ask which items the PO should include in the sprint and why. Provide 4 options with different combinations. One option is clearly optimal using WSJF reasoning.` },
    { tag: "Stakeholder", color: "#34D399", icon: "🤝",
      hint: { framework: "Understand → Align → Decide", steps: ["Identify each stakeholder's real motivation beneath their stated request","Map who has authority vs who has influence","Find a shared goal — everyone wants the platform to work","Commit to a decision and communicate it clearly with reasoning"], watch: "As a PO you are not a Yes-machine. You own the backlog. Protect the team from conflicting demands by making a clear, defensible call." },
      prompt: `You are a Product Owner at CGM ASSIST. Three stakeholders contact you in the same week:

1. Hospital IT Lead (Host System Client): Demands SAML SSO integration within 2 sprints — their security team requires it before they go live. Without it they threaten to delay the contract.

2. Plugin Partner (MedLab Analytics): Requests a new webhook event type ("lab-result-amended") urgently — their plugin is live and clients are complaining about missing updates.

3. Internal Dev Lead: Warns the plugin routing engine has accumulated 18 months of technical debt. Performance is degrading. Wants a full refactor in the next sprint.

Sprint capacity: 20 points. All three items are estimated at 13, 5, and 21 points respectively.

MCQ format: How does the PO respond? Provide 4 options showing different prioritisation and stakeholder communication approaches. One option correctly balances urgency, feasibility, and relationship management.` },
    { tag: "Metrics", color: "#38BDF8", icon: "📊",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Start with what the data is telling you — don't jump to conclusions","Generate 2-3 distinct root cause hypotheses","Identify what additional data you need before acting","Define the one metric that, if fixed, would have the most downstream impact"], watch: "API platforms have layered failure modes — host errors, routing errors, plugin errors. A spike in failed calls could originate at any layer. Don't assume the cause — diagnose it." },
      prompt: `You are the PO for CGM ASSIST. Your weekly metrics dashboard shows:

- Total API calls (host → ASSIST): 98,000 (↑ 4% week-on-week) ✅
- Successful plugin responses: 71% (↓ from 89% last week) 🔴
- Average plugin response time: 1,240ms (↑ from 680ms) 🔴
- Authentication failures (host-side): 0.3% (stable) ✅
- Plugin timeout rate: 22% (↑ from 6%) 🔴
- FHIR service error rate: 18% (↑ from 2%) 🔴
- New plugin activations this week: 4 (normal)

The customer success team has received 3 support tickets from hospital clients this morning.

MCQ format: What is the most likely root cause and what is your immediate next action? Provide 4 diagnostic options. One correctly identifies the cascading failure pattern (FHIR service degradation → plugin timeouts → success rate drop) and the right escalation path.` },
    { tag: "Execution", color: "#FB923C", icon: "⚡",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["Assess impact severity — how many clients and plugins are affected?","Communicate immediately to affected parties with what you know now","Decide: hotfix now or roll back? Don't sit on the fence.","Schedule a post-incident review and capture action items"], watch: "In healthcare integrations, downtime is not just a SLA issue — it can affect patient data flow. Own the incident clearly, communicate proactively, and never over-promise on timelines." },
      prompt: `You are the PO for CGM ASSIST. It is 9:15am on a Tuesday.

An alert fires: the plugin routing engine is returning 503 errors for all requests involving the FHIR data layer. This affects:
- 7 live hospital host systems
- 14 active plugins that use FHIR resources
- An estimated 400 clinical API calls per hour are failing silently

Your dev lead tells you: a config change was deployed at 8:50am this morning for a new plugin onboarding feature. It has not been rolled back. The engineer who deployed it is in a different timezone and offline.

A hospital client emails you: "Our clinical dashboard is showing stale data. Is there an outage?"

MCQ format: What do you do in the next 15 minutes? Provide 4 options with different actions. One option correctly triages, initiates rollback, and communicates to the client without over-promising.` },
    { tag: "Strategy", color: "#A78BFA", icon: "🎯",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarise the strategic context in one sentence","Generate 2-3 distinct options — including the uncomfortable ones","Pick one and defend it with clear business and technical reasoning","State explicitly what you would NOT do and why"], watch: "Strategy for a platform product means thinking about ecosystem effects — every decision affects both host systems and plugin partners. Optimising for one side at the expense of the other kills the network." },
      prompt: `You are the PO for CGM ASSIST. The platform currently has 12 certified plugins and 9 live hospital integrations.

The Head of Product presents three strategic options for the next 6 months:

1. Plugin Marketplace Expansion: Invest in developer tooling, a public plugin SDK, and a self-serve certification portal. Goal: grow to 40 certified plugins. Risk: team bandwidth, quality control.

2. Enterprise Host Deepening: Focus on deeper integrations with the 3 largest hospital clients. Add specialised FHIR workflows, custom routing rules, and dedicated support SLAs. Goal: increase ARR from existing clients.

3. Compliance & Platform Stability: Pause new features. Focus on HL7 FHIR R4 full compliance, SOC 2 certification, audit trail improvements, and performance. Goal: unlock NHS and US hospital markets.

MCQ format: Which strategy should ASSIST prioritise and why? Provide 4 options with different strategic stances. One option correctly identifies that compliance unlocks the largest market opportunity and is the prerequisite for the other two strategies.` },
    { tag: "Interview", color: "#FBBF24", icon: "🎤",
      hint: { framework: "STAR + Product Thinking", steps: ["Situation — set the context briefly (2-3 sentences)","Task — what was your specific responsibility as PO?","Action — what decisions did you make and why?","Result — what was the measurable outcome?","Add Product Insight — what would you do differently now?"], watch: "Interviewers are testing your decision-making process, not just the outcome. Always explain the why behind your prioritisation. Generic answers fail — make it specific to API/healthcare products." },
      prompt: `You are preparing for a Product Owner interview. The interviewer asks:

"Tell me about a time you had to manage a difficult stakeholder who wanted a feature that you believed was wrong for the product. How did you handle it, and what was the outcome?"

Context: You work on CGM ASSIST, a healthcare API integration platform. A key hospital client's IT director is demanding that ASSIST build a custom bespoke integration directly into their legacy EHR system, bypassing the standard plugin architecture. This would create a maintenance burden, set a precedent for other clients, and undermine the platform model — but the client represents 22% of revenue.

MCQ format: Which response best demonstrates senior PO competency? Provide 4 answer options. One option correctly shows stakeholder empathy, product principle defence, and a creative alternative solution that preserves the platform model while addressing the client's underlying need.` },
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

const ASSESS_SYSTEM = `You are a direct coach for a Product Owner in a healthcare API integration platform (CGM ASSIST). Be honest, specific, encouraging. For Interview questions, evaluate answer quality as if you are a senior PO interviewer.

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

// ── Global CSS — Apple-inspired clean design ─────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #F5F5F7;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #1D1D1F;
    letter-spacing: -0.01em;
    line-height: 1.5;
  }
  ::selection { background: rgba(0, 113, 227, 0.2); }
  input, textarea, button, select { font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
  textarea { outline: none; resize: vertical; }
  input { outline: none; }
  button { cursor: pointer; border: none; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes popIn   { 0%{transform:scale(0.95);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.6} }

  .fade-up   { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-1 { animation: fadeUp 0.35s 0.05s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-2 { animation: fadeUp 0.35s 0.10s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-3 { animation: fadeUp 0.35s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-4 { animation: fadeUp 0.35s 0.20s cubic-bezier(0.16,1,0.3,1) both; }
  .pop-in    { animation: popIn 0.30s cubic-bezier(0.16,1,0.3,1) both; }
  .spinner   { animation: spin 0.75s linear infinite; }

  /* ── Buttons — Apple style ── */
  .btn-green {
    background: #0071E3; color: #fff;
    border-radius: 12px; padding: 12px 26px;
    font-size: 15px; font-weight: 600; border: none; cursor: pointer;
    transition: all 0.15s; letter-spacing: -0.01em;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-green:hover  { background: #0066DC; }
  .btn-green:active { opacity: 0.9; }

  .btn-outline {
    background: #fff; color: #0071E3;
    border-radius: 12px; padding: 12px 26px;
    font-size: 15px; font-weight: 600; border: 1px solid #D2D2D7; cursor: pointer;
    transition: all 0.15s;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-outline:hover  { background: #F9F9FB; border-color: #0071E3; }
  .btn-outline:active { opacity: 0.8; }

  .btn-ghost {
    background: transparent; color: #0071E3;
    border-radius: 10px; padding: 10px 16px;
    font-size: 14px; font-weight: 500; border: none; cursor: pointer;
    transition: all 0.15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-ghost:hover { background: #F5F5F7; }

  .btn-disabled {
    background: #F5F5F7; color: #86868B;
    border-radius: 12px; padding: 12px 26px;
    font-size: 15px; font-weight: 600; border: none; cursor: not-allowed;
    display: inline-flex; align-items: center; justify-content: center;
  }

  .btn-accent {
    background: #34C759; color: #fff;
    border-radius: 12px; padding: 12px 26px;
    font-size: 15px; font-weight: 600; border: none; cursor: pointer;
    transition: all 0.15s;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-accent:hover  { background: #30B452; }
  .btn-accent:active { opacity: 0.9; }

  /* ── Cards ── */
  .card {
    background: #fff;
    border-radius: 18px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border: 1px solid #E5E5E7;
  }
  .card-hover { transition: all 0.18s; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); border-color: #D2D2D7; }

  /* ── Challenge path ── */
  .path-node { transition: all 0.18s; }
  .path-node:hover { transform: scale(1.05); }
  .path-node-active { animation: pulse 2s infinite; }

  /* ── Inputs ── */
  .input-field {
    width: 100%; background: #F5F5F7;
    border: 1px solid #D2D2D7; border-radius: 12px;
    padding: 12px 14px; font-size: 15px; color: #1D1D1F;
    font-family: 'Inter', sans-serif; transition: all 0.15s;
  }
  .input-field:focus  { border-color: #0071E3; box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1); }
  .input-field::placeholder { color: #86868B; }

  .textarea-field {
    width: 100%; background: #F5F5F7;
    border: 1px solid #D2D2D7; border-radius: 12px;
    padding: 12px 14px; font-size: 15px; color: #1D1D1F;
    font-family: 'Inter', sans-serif;
    line-height: 1.5; transition: all 0.15s; min-height: 160px;
  }
  .textarea-field:focus { border-color: #0071E3; box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1); }

  /* ── Progress bar ── */
  .xp-bar  { height: 8px; background: #E5E5E7; border-radius: 99px; overflow: hidden; }
  .xp-fill { height: 100%; background: #0071E3; border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

  /* ── Track tabs ── */
  .track-tab { transition: all 0.15s; cursor: pointer; }
  .track-tab.active { background: #0071E3 !important; color: #fff !important; border-color: #0071E3 !important; }

  /* ── Answer key reveal ── */
  .key-section { background: #F0F5FF; border: 1px solid #D2E3FF; border-radius: 12px; }

  /* ── Tables ── */
  table { border-radius: 12px; overflow: hidden; }
  th:first-child { border-radius: 12px 0 0 0; }
  th:last-child  { border-radius: 0 12px 0 0; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #F5F5F7; }
  ::-webkit-scrollbar-thumb { background: #D2D2D7; border-radius: 99px; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .hide-sm  { display: none !important; }
    .full-sm  { width: 100% !important; }
    .stack-sm { flex-direction: column !important; }
    .px-sm    { padding-left: 16px !important; padding-right: 16px !important; }
  }
`;

// ── Markdown renderer ─────────────────────────────────────────────────────
function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") ? <strong key={i} style={{ fontWeight: 700, color: "#2d2d2d" }}>{p.replace(/\*\*/g,"")}</strong> : p
  );
}

function renderChallenge(text) {
  const lines = text.split("\n");
  const result = [];
  let tableBuffer = [];
  let inTable = false;

  const flushTable = (key) => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.filter(r => !r.match(/^\s*\|[-|\s]+\|\s*$/));
    const parsed = rows.map(r => r.split("|").filter((c,i) => i>0 && i<r.split("|").length-1).map(c=>c.trim()));
    if (parsed.length === 0) { tableBuffer=[]; inTable=false; return; }
    const [head, ...body] = parsed;
    result.push(
      <div key={key} style={{ overflowX:"auto", margin:"16px 0" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14, fontFamily:"'Inter',sans-serif" }}>
          <thead>
            <tr>{head.map((h,i)=><th key={i} style={{ background:"#142F32", color:"#fff", padding:"10px 14px", textAlign:"left", fontWeight:800, fontSize:13, whiteSpace:"nowrap" }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row,ri)=>(
              <tr key={ri} style={{ background: ri%2===0?"#fff":"#f8fdf5" }}>
                {row.map((cell,ci)=><td key={ci} style={{ padding:"10px 14px", borderBottom:"1px solid #eee", fontSize:14, color:"#282950", verticalAlign:"top" }}>{inlineFormat(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer=[]; inTable=false;
  };

  lines.forEach((line, i) => {
    if (line.trim().startsWith("|")) {
      inTable = true;
      tableBuffer.push(line.trim());
      return;
    }
    if (inTable) flushTable(`tbl-${i}`);

    // H1
    if (line.startsWith("# ")) {
      result.push(<h2 key={i} style={{ fontSize:20, fontWeight:900, color:"#282950", marginTop:32, marginBottom:16, lineHeight:1.3 }}>{line.slice(2)}</h2>);
      return;
    }
    // H2
    if (line.startsWith("## ")) {
      result.push(<h3 key={i} style={{ fontSize:16, fontWeight:800, color:"#282950", marginTop:24, marginBottom:12, paddingBottom:6, borderBottom:"2px solid #f0f0f0" }}>{line.slice(3)}</h3>);
      return;
    }
    // H3
    if (line.startsWith("### ")) {
      result.push(<h4 key={i} style={{ fontSize:14, fontWeight:800, color:"#3D4A5C", marginTop:20, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>{line.slice(4)}</h4>);
      return;
    }
    // Bullet
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      result.push(
        <div key={i} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start", paddingLeft:4 }}>
          <span style={{ color:"#142F32", fontWeight:900, fontSize:16, lineHeight:1.5, flexShrink:0 }}>•</span>
          <span style={{ fontSize:15, color:"#444", lineHeight:1.5 }}>{inlineFormat(line.trim().slice(2))}</span>
        </div>
      );
      return;
    }
    // Numbered
    if (/^\d+\.\s/.test(line.trim())) {
      const num = line.trim().match(/^(\d+)\.\s(.*)$/);
      if (num) {
        result.push(
          <div key={i} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
            <span style={{ background:"#142F32", color:"#fff", fontWeight:900, fontSize:12, width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>{num[1]}</span>
            <span style={{ fontSize:15, color:"#444", lineHeight:1.5 }}>{inlineFormat(num[2])}</span>
          </div>
        );
        return;
      }
    }
    // Divider
    if (line.includes("━") || line.match(/^---+$/)) {
      result.push(<div key={i} style={{ height:2, background:"#f0f0f0", margin:"12px 0" }}/>);
      return;
    }
    // Bold-only line (section label)
    if (line.trim().startsWith("**") && line.trim().endsWith("**") && !line.includes(" ")) {
      result.push(<p key={i} style={{ fontSize:11, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:"#B0B5C0", marginTop:24, marginBottom:8 }}>{line.trim().replace(/\*\*/g,"")}</p>);
      return;
    }
    // Empty line
    if (!line.trim()) {
      result.push(<div key={i} style={{ height:10 }}/>);
      return;
    }
    // Normal paragraph
    result.push(<p key={i} style={{ fontSize:15, color:"#444", lineHeight:1.5, marginBottom:12 }}>{inlineFormat(line)}</p>);
  });

  if (inTable) flushTable("tbl-end");
  return result;
}

function renderMD(text, isKey = false) {
  return text.trim().split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**"))
      return <p key={i} style={{ fontSize:11, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase",
        color: isKey ? "#2d9c2d" : "#B0B5C0", marginTop:24, marginBottom:8 }}>{line.replace(/\*\*/g,"")}</p>;
    if (line.includes("━")) return <div key={i} style={{ height:2, background:"#f0f0f0", margin:"10px 0" }}/>;
    if (!line.trim()) return <div key={i} style={{ height:8 }}/>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{ fontSize:15, lineHeight:1.5, color: isKey ? "#1a5c2a" : "#3D4A5C" }}>
      {parts.map((p,j) => p.startsWith("**")
        ? <strong key={j} style={{ color: isKey ? "#2d7a2d" : "#282950", fontWeight:700 }}>{p.replace(/\*\*/g,"")}</strong>
        : p)}
    </p>;
  });
}

// ── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ label, score, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score * 10), 300 + delay); return () => clearTimeout(t); }, [score]);
  const color = score >= 7 ? "#142F32" : score >= 5 ? "#FFC800" : "#C0392B";
  const bg    = score >= 7 ? "#E3FFCC" : score >= 5 ? "#fff3cc" : "#ffe0e0";
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "#3D4A5C", fontWeight: 600 }}>{label}</span>
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
      <span style={{ fontSize: 12, fontWeight: 700, color: "#142F32", whiteSpace: "nowrap" }}>⭐ {value} XP</span>
      <div className="xp-bar" style={{ flex: 1 }}>
        <div className="xp-fill" style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 12, color: "#B0B5C0", fontWeight: 600 }}>{max}</span>
    </div>
  );
}

// ── Challenge path node ───────────────────────────────────────────────────
function PathNode({ challenge, idx, status, onClick }) {
  // status: 'done' | 'active' | 'locked'
  const isDone   = status === "done";
  const isActive = status === "active";
  const isLocked = status === "locked";

  const bg     = isDone ? "#142F32" : isActive ? "#fff" : "#e8e8e8";
  const border = isDone ? "#0a1a1c" : isActive ? "#142F32" : "#d0d0d0";
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
        <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#142F32" : "#B0B5C0",
          letterSpacing: "0.06em", marginBottom: 3 }}>
          {isActive ? "CURRENT" : isDone ? "COMPLETED" : "LOCKED"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: isLocked ? "#B0B5C0" : "#282950",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {challenge.tag}
        </div>
        {isDone && <div style={{ fontSize: 12, color: "#142F32", fontWeight: 700, marginTop: 2 }}>Done ✓</div>}
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
  // PO track type selector — user picks which challenge types to include
  const PO_ALL_TYPES = ["Prioritization","Stakeholder","Metrics","Execution","Strategy","Interview"];
  const [poSelectedTypes, setPoSelectedTypes] = useState(() => {
    const s = storageGet("pm_po_types");
    return s ? JSON.parse(s.value) : PO_ALL_TYPES;
  });
  const [showPoTypePicker, setShowPoTypePicker] = useState(false);
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
    const parsed = s ? JSON.parse(s.value) : {}; return { B2B: parsed.B2B||[], B2C: parsed.B2C||[], PO: parsed.PO||[] };
  });
  const [totalXP, setTotalXP] = useState(() => {
    const s = storageGet("pm_xp");
    return s ? parseInt(s.value) : 0;
  });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  // ── Guest profile state ──
  const [guestName, setGuestName] = useState("");
  const [guestAge, setGuestAge] = useState("");
  const [guestIndustry, setGuestIndustry] = useState("");
  const [guestExp, setGuestExp] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestFormErr, setGuestFormErr] = useState("");

  // ── MCQ state ──
  const [mcqOptions, setMcqOptions] = useState([]);
  const [mcqSelected, setMcqSelected] = useState(null);
  const [mcqCorrect, setMcqCorrect] = useState(null);
  const [mcqRevealed, setMcqRevealed] = useState(false);

  // ── Guest feedback state ──
  const [fbName, setFbName] = useState("");
  const [fbAge, setFbAge] = useState("");
  const [fbIndustry, setFbIndustry] = useState("");
  const [fbYears, setFbYears] = useState("");
  const [fbComment, setFbComment] = useState("");
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
    if (pwInput.trim() === "Siddhant0809") {
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
    setShowGuestForm(true);  // show profile form first
  }

  function submitGuestProfile() {
    if (!guestName.trim() || !guestAge.trim() || !guestIndustry.trim() || !guestExp.trim()) {
      setGuestFormErr("Please fill in all fields.");
      return;
    }
    setGuestFormErr("");
    setShowGuestForm(false);
    setFbName(guestName); setFbAge(guestAge); setFbIndustry(guestIndustry); setFbYears(guestExp);
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
      // Generate MCQ options alongside challenge
      setMcqSelected(null); setMcqRevealed(false); setMcqCorrect(null);
      try {
        const mcqRaw = await callClaude(
          "You are a PM quiz generator. Reply with valid JSON only, no markdown, no extra text.",
          `Based on this PM challenge, generate exactly 4 multiple choice answers. One must be correct, three plausible but wrong. Mix the correct answer randomly among the 4 positions.

Reply ONLY with this JSON structure (no other text):
{"correct":"the correct answer text here","options":["option 1","option 2","option 3","option 4"]}

The correct answer must appear exactly as written in the options array.

Challenge: ${text}`
        );
        const clean = mcqRaw.replace(/\`\`\`json|\`\`\`/g,"").trim();
        const parsed = JSON.parse(clean);
        setMcqOptions(parsed.options);
        setMcqCorrect(parsed.correct);
      } catch(_) {
        setMcqOptions([]); setMcqCorrect(null);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function submitAnswer(chosenOption) {
    const answerText = chosenOption || answer;
    if (!answerText.trim()) return;
    setLoading(true);
    try {
      const result = await callClaude(ASSESS_SYSTEM,
        `TRACK: ${track}\nTYPE: ${pick?.tag}\n\nCHALLENGE:\n${challengeText}\n\nSELECTED ANSWER:\n${answerText}\n\nCORRECT ANSWER:\n${mcqCorrect || "N/A"}`);
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
        body: JSON.stringify({ name: fbName||guestName||"Guest", age: fbAge||guestAge, industry: fbIndustry||guestIndustry, experience: fbYears||guestExp, rating: fbUseful, easyToUse: fbEasy, comment: fbComment, improve: fbImprove, sessions: 1 })
      });
    } catch (_) {}
    setFbSending(false);
    setScreen("thanks");
  }

  // ── Status helper ──
  function getStatus(idx) {
    if (isGuest) return idx === 0 ? "active" : "locked";
    const done = completedIdxs[track] || [];
    if (done.includes(idx)) return "done";
    const firstIncomplete = challenges.findIndex((_, i) => !done.includes(i));
    return idx === firstIncomplete ? "active" : idx < firstIncomplete ? "done" : "locked";
  }

  // For PO track, filter by selected types
  const challenges = track === "PO"
    ? CHALLENGES.PO.filter(c => poSelectedTypes.includes(c.tag))
    : CHALLENGES[track];
  const doneCount  = completedIdxs[track]?.length || 0;
  const pct        = challenges.length > 0 ? Math.round((doneCount / challenges.length) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: LOGIN
  // ─────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  // SCREEN: GUEST PROFILE FORM
  // ─────────────────────────────────────────────────────────────────────
  if (showGuestForm) return (
    <div style={{ minHeight:"100vh", background:"#fff", display:"flex", flexDirection:"column" }}>
      <style>{CSS}</style>
      <div style={{ background:"#142F32", padding:"14px 24px", display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:22 }}>📈</span>
        <span style={{ fontSize:18, fontWeight:900, color:"#fff" }}>PM Training</span>
      </div>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 20px" }}>
        <div style={{ width:"100%", maxWidth:440 }}>
          <div className="fade-up" style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:12 }}>👋</div>
            <h2 style={{ fontSize:22, fontWeight:900, color:"#282950", marginBottom:8 }}>Quick Intro</h2>
            <p style={{ fontSize:14, color:"#777C90", lineHeight:1.6 }}>
              Help us personalise your experience before your free challenge.
            </p>
          </div>
          <div className="card fade-up-1" style={{ marginBottom:16 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { label:"Your Name", val:guestName, set:setGuestName, placeholder:"e.g. Alex", type:"text" },
                { label:"Age", val:guestAge, set:setGuestAge, placeholder:"e.g. 26", type:"number" },
                { label:"Industry", val:guestIndustry, set:setGuestIndustry, placeholder:"e.g. FinTech, SaaS, Healthcare", type:"text" },
                { label:"Years of Experience", val:guestExp, set:setGuestExp, placeholder:"e.g. 2 years", type:"text" },
              ].map(({label,val,set,placeholder,type}) => (
                <div key={label}>
                  <label style={{ fontSize:13, fontWeight:700, color:"#3D4A5C", display:"block", marginBottom:6 }}>
                    {label} <span style={{ color:"#C0392B" }}>*</span>
                  </label>
                  <input className="input-field" type={type} value={val}
                    onChange={e => { set(e.target.value); setGuestFormErr(""); }}
                    placeholder={placeholder} />
                </div>
              ))}
            </div>
            {guestFormErr && (
              <p style={{ fontSize:13, color:"#C0392B", fontWeight:700, marginTop:12, textAlign:"center" }}>
                ❌ {guestFormErr}
              </p>
            )}
          </div>
          <div className="fade-up-2" style={{ display:"flex", gap:10 }}>
            <button className="btn-ghost" onClick={() => { setShowGuestForm(false); setIsGuest(false); }}>← Back</button>
            <button className="btn-green" style={{ flex:1 }} onClick={submitGuestProfile}>
              Start My Challenge →
            </button>
          </div>
          <p style={{ fontSize:12, color:"#B0B5C0", textAlign:"center", marginTop:12, fontWeight:600 }}>
            1 free challenge · Your info helps us improve
          </p>
        </div>
      </div>
    </div>
  );

  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{ background: "#142F32", padding: "14px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>📈</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>PM Training</span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          {/* Hero */}
          <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg,#142F32,#2D6B52)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
              boxShadow: "0 8px 24px rgba(88,204,2,0.3)", fontSize: 34 }}>
              📈
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1D1D1F", marginBottom: 12, lineHeight: 1.2 }}>
              PM Learning
            </h1>
            <p style={{ fontSize: 15, color: "#555555", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
              Real scenarios. Structured feedback. Improve your decision-making.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 20 }}>
              {[["📋","Real scenarios"],["✓","Detailed feedback"],["📈","Track progress"]].map(([icon,label]) => (
                <div key={label} style={{ fontSize: 12, color: "#777C90", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full access */}
          <div className="card fade-up-1" style={{ marginBottom: 16, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 20 }}>🔐</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>Access Code</span>
            </div>
            <input className="input-field" type="password" value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && loginFull()}
              placeholder="Enter access code"
              style={{ marginBottom: 10 }}
            />
            {pwError && (
              <p style={{ fontSize: 13, color: "#C0392B", fontWeight: 700, marginBottom: 10, textAlign: "center" }}>
                ❌ Incorrect code — try again
              </p>
            )}
            <button className="btn-green full-sm" onClick={loginFull} style={{ width: "100%" }}>
              Start Learning →
            </button>
          </div>

          {/* Divider */}
          <div className="fade-up-2" style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#E5E5E7" }} />
            <span style={{ fontSize: 13, color: "#86868B", fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "#E5E5E7" }} />
          </div>

          {/* Guest */}
          <div className="fade-up-2" style={{ textAlign: "center" }}>
            <button className="btn-outline full-sm" onClick={loginGuest} style={{ width: "100%" }}>
              👋 Continue as Guest
            </button>
            <p style={{ fontSize: 13, color: "#86868B", marginTop: 14, fontWeight: 500, lineHeight: 1.5 }}>
              Try 1 free challenge — no sign-up required
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
    <div style={{ minHeight: "100vh", background: "#F0F2F5" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background: "#142F32", padding: "0 20px" }}>
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
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#282950", marginBottom: 6 }}>
            {isGuest ? "Welcome, Guest! 👋" : "Good day, Siddhant! 👋"}
          </h1>
          {isGuest ? (
            <p style={{ fontSize: 15, color: "#555555" }}>Complete 1 free challenge.</p>
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
            {[
              { id:"B2B", label:"🏢 B2B" },
              { id:"B2C", label:"📱 B2C" },
              { id:"PO",  label:"🏥 PO"  },
            ].map(({ id, label }) => (
              <button key={id} className={`track-tab btn-ghost ${track === id ? "active" : ""}`}
                onClick={() => setTrack(id)}
                style={{ flex: 1, justifyContent: "center", borderRadius: 12, fontSize: 14, fontWeight: 800,
                  background: track === id ? (id === "PO" ? "#142F32" : "#142F32") : "#fff",
                  color: track === id ? (id === "PO" ? "#E3FFCC" : "#E3FFCC") : "#777C90",
                  borderColor: track === id ? "#142F32" : "#D8DDE6",
                  boxShadow: track === id && id === "PO" ? "0 4px 0 #d6308e" : undefined }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* PO Type Picker */}
        {!isGuest && track === "PO" && (
          <div className="card fade-up-2" style={{ marginBottom: 14, padding: "16px 20px",
            borderColor: "#F472B6", background: "linear-gradient(135deg,#fff0f6,#fff)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showPoTypePicker ? 14 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🎛️</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#be185d" }}>
                  Challenge Types
                </span>
                <span style={{ fontSize: 12, color: "#B0B5C0", background: "#F0F2F5",
                  padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                  {poSelectedTypes.length}/{PO_ALL_TYPES.length} selected
                </span>
              </div>
              <button onClick={() => setShowPoTypePicker(v => !v)}
                style={{ background: "none", fontSize: 12, fontWeight: 700, color: "#F472B6",
                  padding: "4px 10px", border: "2px solid #F472B6", borderRadius: 8, cursor: "pointer" }}>
                {showPoTypePicker ? "Done ✓" : "Customise"}
              </button>
            </div>
            {showPoTypePicker && (
              <div style={{ display:"flex", flexWrap:"wrap", gap: 8 }}>
                {PO_ALL_TYPES.map(type => {
                  const ch = CHALLENGES.PO.find(c => c.tag === type);
                  const selected = poSelectedTypes.includes(type);
                  return (
                    <button key={type} onClick={() => {
                      const next = selected && poSelectedTypes.length > 1
                        ? poSelectedTypes.filter(t => t !== type)
                        : selected ? poSelectedTypes : [...poSelectedTypes, type];
                      setPoSelectedTypes(next);
                      storageSet("pm_po_types", JSON.stringify(next));
                    }}
                    style={{ display:"flex", alignItems:"center", gap: 6, padding: "8px 14px",
                      borderRadius: 10, border: `2px solid ${selected ? ch?.color || "#F472B6" : "#D8DDE6"}`,
                      background: selected ? (ch?.color || "#F472B6") + "15" : "#fff",
                      color: selected ? ch?.color || "#be185d" : "#B0B5C0",
                      fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                      <span>{ch?.icon}</span>
                      <span>{type}</span>
                      {selected && <span style={{ fontSize: 10 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Progress card */}
        {!isGuest && (
          <div className="card fade-up-1" style={{ marginBottom: 20, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#282950" }}>
                {track} Progress
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#142F32" }}>
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
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#282950" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#B0B5C0", fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Challenge path */}
        <div className="card fade-up-2" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>{track === "PO" ? "🏥" : "🗺️"}</span>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#282950" }}>
              {isGuest ? "Your Free Challenge"
                : track === "PO" ? "CGM ASSIST · PO Challenge Path"
                : `${track} Learning Path`}
            </h2>
          </div>
          {track === "PO" && !isGuest && (
            <div style={{ background: "#fff0f6", border: "1px solid #F472B6", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#be185d", fontWeight: 600,
              display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ flexShrink: 0 }}>💡</span>
              <span>Real-world scenarios from the CGM ASSIST API integration platform — where clinical host systems connect to plugins and FHIR services.</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(isGuest ? challenges.slice(0, 1) : challenges).map((ch, idx) => (
              <div key={idx}>
                {idx > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "-10px 0 -10px 30px" }}>
                    <div style={{ width: 2, height: 20, background: getStatus(idx) === "locked" ? "#D8DDE6" : "#142F32" }} />
                  </div>
                )}
                <PathNode challenge={ch} idx={idx} status={getStatus(idx)} onClick={() => openChallenge(idx)} />
              </div>
            ))}
          </div>

          {isGuest && (
            <div style={{ marginTop: 24, padding: "16px", background: "#F0FFF4",
              border: "2px dashed #142F32", borderRadius: 14, textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#2d7a2d" }}>
                🔓 Full access unlocks all 10 challenges + AI scoring
              </p>
            </div>
          )}
        </div>

        {/* Recent history */}
        {!isGuest && history.length > 0 && (
          <div className="card fade-up-3">
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#282950", marginBottom: 14 }}>📋 Recent Sessions</h3>
            {history.slice(0, 5).map((s, i) => {
              const c = CHALLENGES.B2B.concat(CHALLENGES.B2C).concat(CHALLENGES.PO).find(x => x.tag === s.tag && (x.tag !== 'Interview' || s.track === 'PO'))?.color || "#777C90";
              const sc = s.scores?.overall;
              const scColor = sc >= 7 ? "#142F32" : sc >= 5 ? "#FFC800" : "#C0392B";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                  borderBottom: i < Math.min(history.length - 1, 4) ? "1px solid #f5f5f5" : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: c + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0 }}>
                    {CHALLENGES.B2B.concat(CHALLENGES.B2C).concat(CHALLENGES.PO).find(x => x.tag === s.tag)?.icon || "📋"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#282950" }}>{s.tag}</div>
                    <div style={{ fontSize: 12, color: "#B0B5C0" }}>{s.track} · {s.date}</div>
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
    <div style={{ minHeight: "100vh", background: "#F0F2F5" }}>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B5C0", letterSpacing: "0.06em" }}>CHALLENGE</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#282950" }}>
              {pick?.icon} {pick?.tag}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#B0B5C0", fontWeight: 600 }}>{track}</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Loading */}
        {loading && !challengeText && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner" style={{ width: 40, height: 40, border: "3px solid #e8e8e8",
              borderTopColor: "#142F32", borderRadius: "50%", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, color: "#B0B5C0", fontWeight: 600 }}>Generating your challenge…</p>
          </div>
        )}

        {challengeText && (
          <>
            {/* Challenge card */}
            <div className="card fade-up" style={{ marginBottom: 16, borderColor: pick?.color + "30",
              background: "#fff", padding: "24px" }}>
              {/* Challenge header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
                paddingBottom: 16, borderBottom: `2px solid ${pick?.color}20` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: pick?.color + "18",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {pick?.icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: pick?.color, letterSpacing: "0.1em",
                    textTransform: "uppercase", marginBottom: 2 }}>Your Challenge</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#282950" }}>{pick?.tag}</div>
                </div>
                <div style={{ marginLeft: "auto", background: "#F5F5F7", borderRadius: 8,
                  padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#555555" }}>
                  {track}
                </div>
              </div>
              {/* Challenge body — fully formatted */}
              <div style={{ fontSize: 15, lineHeight: 1.5, color: "#444" }}>{renderChallenge(challengeText)}</div>
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
                    <span style={{ fontSize: 12, color: "#9DA3AE", background: "#fff5cc",
                      padding: "2px 10px", borderRadius: 99, fontWeight: 600 }}>{pick.hint.framework}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#B0B5C0", fontWeight: 700 }}>{hintOpen ? "▲" : "▼"}</span>
                </button>
                {hintOpen && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #ffe88a" }}>
                    {pick.hint.steps.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, padding: "4px 0" }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: "#FFC800",
                          background: "#fffae0", width: 24, height: 24, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</span>
                        <span style={{ fontSize: 14, color: "#3D4A5C", lineHeight: 1.65 }}>{s}</span>
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

            {/* MCQ Answer */}
            <div className="card fade-up-2" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", marginBottom: 8 }}>
                Multiple choice
              </h3>
              <p style={{ fontSize: 13, color: "#555555", marginBottom: 16, fontWeight: 500 }}>
                Pick the best answer.
              </p>

              {mcqOptions.length === 0 && loading && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div className="spinner" style={{ width: 28, height: 28, border: "3px solid #eee",
                    borderTopColor: "#142F32", borderRadius: "50%", margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "#B0B5C0", fontWeight: 600 }}>Loading options…</p>
                </div>
              )}

              {mcqOptions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mcqOptions.map((opt, i) => {
                    const isSelected = mcqSelected === opt;
                    const isCorrect  = opt === mcqCorrect;
                    // Bug fix: only colour an option if it was selected OR
                    // if it was the correct one AND user got it wrong (so they see the right answer)
                    let bg = "#FAFAFA", border = "#D8DDE6", color = "#282950", icon = null;
                    const userGotItWrong = mcqRevealed && mcqSelected && mcqSelected !== mcqCorrect;
                    if (mcqRevealed) {
                      if (isSelected && isCorrect)  { bg="#E8F9E0"; border="#2D8A4E"; color="#1a5c2a"; icon="✓"; }
                      else if (isSelected)           { bg="#FDECEA"; border="#C0392B"; color="#922B21"; icon="✗"; }
                      else if (isCorrect && userGotItWrong) { bg="#E8F9E0"; border="#2D8A4E"; color="#1a5c2a"; icon="✓"; }
                    } else if (isSelected)           { bg="#EAF0FB"; border="#142F32"; color="#142F32"; }
                    const labelBg = mcqRevealed && (isSelected || (isCorrect && userGotItWrong)) ? border + "25" : "#EEEFF2";
                    return (
                      <button key={i} onClick={() => !mcqRevealed && setMcqSelected(opt)}
                        style={{ width: "100%", textAlign: "left", padding: "16px 20px", borderRadius: 10,
                          border: `1.5px solid ${border}`, background: bg, color, fontSize: 15, fontWeight: 500,
                          cursor: mcqRevealed ? "default" : "pointer", transition: "all 0.15s",
                          display: "flex", alignItems: "center", gap: 12, fontFamily: "'Inter',sans-serif",
                          letterSpacing: "-0.01em", lineHeight: 1.5 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 6, background: labelBg,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize: 13, fontWeight: 700,
                          color: isSelected || (mcqRevealed && isCorrect && userGotItWrong) ? color : "#777C90",
                          flexShrink: 0, fontFamily: "'Inter',sans-serif" }}>
                          {icon || String.fromCharCode(65+i)}
                        </span>
                        <span style={{ flex: 1, lineHeight: 1.55 }}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Reveal / Submit */}
              {mcqOptions.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", gap: 10 }} className="stack-sm">
                  <button className="btn-ghost full-sm" onClick={() => setScreen("home")}>Cancel</button>
                  {!mcqRevealed ? (
                    <button className={mcqSelected ? "btn-green full-sm" : "btn-disabled full-sm"}
                      style={{ flex: 1 }} disabled={!mcqSelected}
                      onClick={() => { if(mcqSelected) setMcqRevealed(true); }}>
                      Check Answer →
                    </button>
                  ) : (
                    loading ? (
                      <button className="btn-disabled full-sm" style={{ flex: 1 }}>Scoring…</button>
                    ) : (
                      <button className="btn-green full-sm" style={{ flex: 1 }}
                        onClick={() => submitAnswer(mcqSelected)}>
                        Submit for Full Assessment →
                      </button>
                    )
                  )}
                </div>
              )}

              {error && <div style={{ fontSize: 13, color: "#C0392B", fontWeight: 700, marginTop: 10 }}>⚠ {error}</div>}
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
    <div style={{ minHeight: "100vh", background: "#F0F2F5" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "2px solid #f0f0f0", padding: "0 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "12px 0",
          display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#282950" }}>Your Assessment</span>
          </div>
          {pick && <span style={{ fontSize: 11, color: "#B0B5C0", marginLeft: "auto", fontWeight: 600 }}>
            {track} · {pick.tag}
          </span>}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Score hero */}
        {scores && (() => {
          const sc = scores.overall;
          const color  = sc >= 7 ? "#142F32" : sc >= 5 ? "#FFC800" : "#C0392B";
          const bg     = sc >= 7 ? "linear-gradient(135deg,#F0FFF4,#E3FFCC)" : sc >= 5 ? "linear-gradient(135deg,#FFFBF0,#FEF3C7)" : "linear-gradient(135deg,#FDF2F0,#FADBD8)";
          const label  = sc >= 7 ? "Excellent thinking 🎉" : sc >= 5 ? "Good effort, keep going 📈" : "Keep practising 💪";
          return (
            <div className="card pop-in" style={{ marginBottom: 16, background: bg,
              borderColor: color + "40", textAlign: "center", padding: "32px 24px" }}>
              <div style={{ fontSize: 72, fontWeight: 900, color, letterSpacing: "-0.04em",
                lineHeight: 1, marginBottom: 6 }}>{sc}</div>
              <div style={{ fontSize: 15, color: "#9DA3AE", marginBottom: 14 }}>out of 10</div>
              <div style={{ display: "inline-block", background: color + "18",
                borderRadius: 99, padding: "8px 20px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: "-0.01em" }}>{label}</span>
              </div>
              {!isGuest && (
                <div style={{ marginTop: 12, fontSize: 13, color: "#777C90", fontWeight: 600 }}>
                  +{10 + (sc * 5)} XP earned 🌟
                </div>
              )}
            </div>
          );
        })()}

        {/* Score breakdown */}
        {scores && (
          <div className="card fade-up-1" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#282950", marginBottom: 14 }}>📉 Score Breakdown</h3>
            <ScoreBar label="Structured Thinking" score={scores.structured} delay={0} />
            <ScoreBar label="Business Acumen"     score={scores.business}   delay={80} />
            <ScoreBar label="Specificity & Depth"  score={scores.depth}      delay={160} />
            <ScoreBar label="PM Maturity"          score={scores.maturity}   delay={240} />
          </div>
        )}

        {/* Assessment */}
        <div className="card fade-up-2" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#282950", marginBottom: 14 }}>🧠 Coach Feedback</h3>
          {renderMD(assessment)}
        </div>

        {/* Answer key */}
        {answerKey && (
          <div className="fade-up-3" style={{ marginBottom: 24 }}>
            <button onClick={() => setShowKey(o => !o)}
              style={{ width: "100%", background: showKey ? "#E3FFCC" : "#F0F2F5",
                border: `2px solid ${showKey ? "#142F32" : "#ddd"}`, borderRadius: 16,
                padding: "14px 20px", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                transition: "all 0.2s", fontFamily: "'Inter', sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔑</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: showKey ? "#2d7a2d" : "#3D4A5C" }}>
                  Model Answer
                </span>
                <span style={{ fontSize: 12, color: "#B0B5C0", fontWeight: 600 }}>tap to reveal</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#B0B5C0" }}>{showKey ? "▲" : "▼"}</span>
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
    <div style={{ minHeight: "100vh", background: "#F0F2F5", display: "flex", alignItems: "center", padding: "32px 20px" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>

        <div className="fade-up" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#282950", marginBottom: 8 }}>Quick Feedback</h2>
          <p style={{ fontSize: 15, color: "#777C90" }}>Takes 60 seconds. Helps us improve.</p>
        </div>

        <div className="card fade-up-1" style={{ marginBottom: 16 }}>

          {/* User details (pre-filled from profile) */}
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "2px solid #f5f5f5" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#B0B5C0", letterSpacing: "0.06em",
              textTransform: "uppercase", marginBottom: 14 }}>Your Details</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label:"Name", val:fbName, set:setFbName, placeholder:"Your name" },
                { label:"Age", val:fbAge, set:setFbAge, placeholder:"Your age" },
                { label:"Industry", val:fbIndustry, set:setFbIndustry, placeholder:"e.g. SaaS, FinTech" },
                { label:"Years of Experience", val:fbYears, set:setFbYears, placeholder:"e.g. 3 years" },
              ].map(({label,val,set,placeholder}) => (
                <div key={label}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#777C90", display:"block", marginBottom:5 }}>
                    {label} <span style={{ color:"#C0392B" }}>*</span>
                  </label>
                  <input className="input-field" value={val} onChange={e => set(e.target.value)}
                    placeholder={placeholder} style={{ padding:"10px 12px", fontSize:14 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Q1 — Rating */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#282950", marginBottom: 12 }}>
              1. How useful was this challenge?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setFbUseful(n)}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12,
                    border: `2px solid ${fbUseful >= n ? "#142F32" : "#D8DDE6"}`,
                    background: fbUseful >= n ? "#142F32" : "#fff",
                    color: fbUseful >= n ? "#fff" : "#B0B5C0",
                    fontSize: 16, fontWeight: 800, cursor: "pointer", transition: "all 0.12s" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "#B0B5C0", fontWeight: 600 }}>Not useful</span>
              <span style={{ fontSize: 11, color: "#B0B5C0", fontWeight: 600 }}>Very useful</span>
            </div>
          </div>

          {/* Q2 — Easy */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#282950", marginBottom: 10 }}>
              2. Was the interface easy to use?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {["Yes", "No"].map(v => (
                <button key={v} onClick={() => setFbEasy(v)}
                  style={{ flex: 1, padding: "12px", borderRadius: 12,
                    border: `2px solid ${fbEasy === v ? "#142F32" : "#D8DDE6"}`,
                    background: fbEasy === v ? "#F0FFF4" : "#fff",
                    color: fbEasy === v ? "#2d7a2d" : "#777C90",
                    fontSize: 15, fontWeight: 800, cursor: "pointer", transition: "all 0.12s" }}>
                  {v === "Yes" ? "👍 Yes" : "👎 No"}
                </button>
              ))}
            </div>
          </div>

          {/* Q3 — Comments */}
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#282950", marginBottom: 10 }}>
              3. Feedback & Comments <span style={{ color: "#B0B5C0", fontWeight: 600, fontSize: 13 }}>(required)</span>
            </p>
            <textarea className="textarea-field" value={fbComment} onChange={e => setFbComment(e.target.value)}
              placeholder="What did you think? What would make this more useful for you?"
              style={{ minHeight: 100 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }} className="stack-sm fade-up-2">
          <button className="btn-ghost full-sm" onClick={() => setScreen("result")}>← Back</button>
          <button
            className={fbUseful > 0 && fbName && fbComment ? "btn-green full-sm" : "btn-disabled full-sm"}
            style={{ flex: 1 }}
            disabled={fbUseful === 0 || !fbName.trim() || !fbComment.trim() || fbSending}
            onClick={fbUseful > 0 && fbName && fbComment ? submitGuestFeedback : undefined}>
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
    <div style={{ minHeight: "100vh", background: "#F0F2F5", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "32px 20px" }}>
      <style>{CSS}</style>
      <div className="card pop-in" style={{ maxWidth: 420, width: "100%", textAlign: "center", padding: "48px 32px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "#282950", marginBottom: 12 }}>
          Thanks for trying it!
        </h2>
        <p style={{ fontSize: 15, color: "#777C90", lineHeight: 1.7, marginBottom: 28 }}>
          Thanks for trying the app.<br/>
          <strong style={{ color: "#282950" }}>Full access requires an access code.</strong><br/>
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
