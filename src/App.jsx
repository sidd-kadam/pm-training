import { useState, useEffect, useRef } from "react";

// ── Storage ───────────────────────────────────────────────────────────────
function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

// ── Challenge data ─────────────────────────────────────────────────────────
const CHALLENGES = {
  B2B: [
    { tag: "Prioritization", color: "#6366F1", icon: "⚖️",
      hint: { framework: "RICE or MoSCoW", steps: ["Name your framework and justify the choice","Score each backlog item — don't just list them","Address the compliance deadline and churn risk explicitly","End with a ranked list and what gets cut if capacity runs out"], watch: "Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag: "Metrics", color: "#3B82F6", icon: "📊",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you observe in the data first","Generate 2-3 root cause hypotheses","Identify what data is missing","Define 2-3 metrics you'd add to the dashboard"], watch: "Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag: "Stakeholder", color: "#10B981", icon: "🤝",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder truly wants beneath their stated position","Spot any shared goals or constraints","Make a concrete decision — don't sit on the fence","State who gets which message and how"], watch: "PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "Strategy", color: "#8B5CF6", icon: "🎯",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 sentences","Name 2-3 strategic options","Pick one and defend it with business reasoning","Explicitly state what you would NOT do and why"], watch: "Every strategy needs a trade-off. What are you giving up?" },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "Execution", color: "#F59E0B", icon: "⚡",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What is most critical in the next 2 hours?","Who do you talk to and in what order?","What do you cut or defer?","How do you run the retrospective after?"], watch: "Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  PO: [
    { tag: "Prioritization", color: "#EC4899", icon: "⚖️",
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
    { tag: "Stakeholder", color: "#10B981", icon: "🤝",
      hint: { framework: "Understand → Align → Decide", steps: ["Identify each stakeholder's real motivation beneath their stated request","Map who has authority vs who has influence","Find a shared goal — everyone wants the platform to work","Commit to a decision and communicate it clearly with reasoning"], watch: "As a PO you are not a Yes-machine. You own the backlog. Protect the team from conflicting demands by making a clear, defensible call." },
      prompt: `You are a Product Owner at CGM ASSIST. Three stakeholders contact you in the same week:

1. Hospital IT Lead (Host System Client): Demands SAML SSO integration within 2 sprints — their security team requires it before they go live. Without it they threaten to delay the contract.

2. Plugin Partner (MedLab Analytics): Requests a new webhook event type ("lab-result-amended") urgently — their plugin is live and clients are complaining about missing updates.

3. Internal Dev Lead: Warns the plugin routing engine has accumulated 18 months of technical debt. Performance is degrading. Wants a full refactor in the next sprint.

Sprint capacity: 20 points. All three items are estimated at 13, 5, and 21 points respectively.

MCQ format: How does the PO respond? Provide 4 options showing different prioritisation and stakeholder communication approaches. One option correctly balances urgency, feasibility, and relationship management.` },
    { tag: "Metrics", color: "#3B82F6", icon: "📊",
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
    { tag: "Execution", color: "#F59E0B", icon: "⚡",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["Assess impact severity — how many clients and plugins are affected?","Communicate immediately to affected parties with what you know now","Decide: hotfix now or roll back? Don't sit on the fence.","Schedule a post-incident review and capture action items"], watch: "In healthcare integrations, downtime is not just a SLA issue — it can affect patient data flow. Own the incident clearly, communicate proactively, and never over-promise on timelines." },
      prompt: `You are the PO for CGM ASSIST. It is 9:15am on a Tuesday.

An alert fires: the plugin routing engine is returning 503 errors for all requests involving the FHIR data layer. This affects:
- 7 live hospital host systems
- 14 active plugins that use FHIR resources
- An estimated 400 clinical API calls per hour are failing silently

Your dev lead tells you: a config change was deployed at 8:50am this morning for a new plugin onboarding feature. It has not been rolled back. The engineer who deployed it is in a different timezone and offline.

A hospital client emails you: "Our clinical dashboard is showing stale data. Is there an outage?"

MCQ format: What do you do in the next 15 minutes? Provide 4 options with different actions. One option correctly triages, initiates rollback, and communicates to the client without over-promising.` },
    { tag: "Strategy", color: "#8B5CF6", icon: "🎯",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarise the strategic context in one sentence","Generate 2-3 distinct options — including the uncomfortable ones","Pick one and defend it with clear business and technical reasoning","State explicitly what you would NOT do and why"], watch: "Strategy for a platform product means thinking about ecosystem effects — every decision affects both host systems and plugin partners. Optimising for one side at the expense of the other kills the network." },
      prompt: `You are the PO for CGM ASSIST. The platform currently has 12 certified plugins and 9 live hospital integrations.

The Head of Product presents three strategic options for the next 6 months:

1. Plugin Marketplace Expansion: Invest in developer tooling, a public plugin SDK, and a self-serve certification portal. Goal: grow to 40 certified plugins. Risk: team bandwidth, quality control.

2. Enterprise Host Deepening: Focus on deeper integrations with the 3 largest hospital clients. Add specialised FHIR workflows, custom routing rules, and dedicated support SLAs. Goal: increase ARR from existing clients.

3. Compliance & Platform Stability: Pause new features. Focus on HL7 FHIR R4 full compliance, SOC 2 certification, audit trail improvements, and performance. Goal: unlock NHS and US hospital markets.

MCQ format: Which strategy should ASSIST prioritise and why? Provide 4 options with different strategic stances. One option correctly identifies that compliance unlocks the largest market opportunity and is the prerequisite for the other two strategies.` },
    { tag: "Interview", color: "#F59E0B", icon: "🎤",
      hint: { framework: "STAR + Product Thinking", steps: ["Situation — set the context briefly (2-3 sentences)","Task — what was your specific responsibility as PO?","Action — what decisions did you make and why?","Result — what was the measurable outcome?","Add Product Insight — what would you do differently?"], watch: "Interviewers want to see how you think, not just what happened. Show your reasoning, not just your actions." },
      prompt: `You are preparing for a Product Owner interview. The interviewer asks:

"Tell me about a time you had to manage a difficult stakeholder who wanted a feature that you believed was wrong for the product. How did you handle it, and what was the outcome?"

Context: You work on CGM ASSIST, a healthcare API integration platform. A key hospital client's IT director is demanding that ASSIST build a custom bespoke integration directly into their legacy EHR system, bypassing the standard plugin architecture. This would create a maintenance burden, set a precedent for other clients, and undermine the platform model — but the client represents 22% of revenue.

MCQ format: Which response best demonstrates senior PO competency? Provide 4 answer options. One option correctly shows stakeholder empathy, product principle defence, and a creative alternative solution that preserves the platform model while addressing the client's underlying need.` },
  ],
  B2C: [
    { tag: "Prioritization", color: "#6366F1", icon: "⚖️",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework and why it fits B2C","Consider user volume, engagement, and retention for each item","Factor in competitor timing and seasonal context","Give a final ranked order and what gets cut"], watch: "B2C is about user love at scale. Delight is a valid business metric." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "Metrics", color: "#3B82F6", icon: "📊",
      hint: { framework: "AARRR Funnel", steps: ["Map each metric to its funnel stage","Identify the biggest drop-off point","Form 2-3 hypotheses for the drop-off","Pick one metric to fix first and defend the choice"], watch: "Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag: "Growth", color: "#10B981", icon: "🚀",
      hint: { framework: "Growth Loops", steps: ["Identify which growth loop is broken or missing","Pick ONE lever to pull — don't try to fix everything","Define how you'd measure if your fix worked","Estimate the impact in user numbers or revenue"], watch: "Growth is a system. Fix the loop. Don't just add features." },
      prompt: `B2C growth challenge for a junior PM. Consumer app growth has plateaued with fake metrics showing the problem and limited engineering capacity. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag: "User Research", color: "#8B5CF6", icon: "🔍",
      hint: { framework: "Jobs To Be Done", steps: ["Identify the job each user hires the product to do","Find the gap between expectation and experience","Separate genuine pain points from nice-to-haves","Recommend what to build and what to ignore"], watch: "Focus on what users DO, not what they SAY. Behaviour beats words." },
      prompt: `B2C user research challenge for a junior PM. 3 user types giving conflicting qualitative feedback on the same feature area. Ask: synthesize the feedback and decide what to build. Be concise.` },
    { tag: "Execution", color: "#F59E0B", icon: "⚡",
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

// ── Design System CSS ──────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    /* Colors */
    --color-bg: #F9FAFB;
    --color-surface: #FFFFFF;
    --color-border: #E5E7EB;
    --color-border-strong: #D1D5DB;

    --color-text-primary: #111827;
    --color-text-secondary: #4B5563;
    --color-text-tertiary: #9CA3AF;
    --color-text-inverse: #FFFFFF;

    --color-accent: #6366F1;
    --color-accent-hover: #4F46E5;
    --color-accent-light: #EEF2FF;
    --color-accent-border: #C7D2FE;

    --color-success: #10B981;
    --color-success-light: #ECFDF5;
    --color-success-border: #A7F3D0;

    --color-warning: #F59E0B;
    --color-warning-light: #FFFBEB;
    --color-warning-border: #FDE68A;

    --color-error: #EF4444;
    --color-error-light: #FEF2F2;
    --color-error-border: #FECACA;

    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;
    --space-12: 48px;
    --space-16: 64px;

    /* Typography */
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-size-xs: 11px;
    --font-size-sm: 13px;
    --font-size-base: 15px;
    --font-size-md: 16px;
    --font-size-lg: 18px;
    --font-size-xl: 22px;
    --font-size-2xl: 28px;
    --font-size-3xl: 36px;

    /* Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-xl: 20px;
    --radius-full: 9999px;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);

    /* Transitions */
    --transition-fast: 100ms ease;
    --transition-base: 150ms ease;
    --transition-slow: 250ms ease;
  }

  html, body {
    background: var(--color-bg);
    font-family: var(--font-family);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    line-height: 1.6;
    letter-spacing: -0.011em;
  }

  ::selection { background: var(--color-accent-light); color: var(--color-accent); }
  input, textarea, button, select { font-family: var(--font-family); }
  textarea { outline: none; resize: vertical; }
  input { outline: none; }
  button { cursor: pointer; border: none; }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes popIn {
    0%   { transform: scale(0.96); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(16px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes progressFill {
    from { width: 0%; }
    to   { width: var(--target-width); }
  }

  .anim-fade-up   { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-1 { animation: fadeUp 0.45s 0.06s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-2 { animation: fadeUp 0.45s 0.12s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-3 { animation: fadeUp 0.45s 0.18s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-4 { animation: fadeUp 0.45s 0.24s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-pop-in    { animation: popIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-slide-down { animation: slideDown 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .spinner        { animation: spin 0.7s linear infinite; }

  /* ── Layout ── */
  .page-container {
    min-height: 100vh;
    background: var(--color-bg);
    display: flex;
    flex-direction: column;
  }
  .content-container {
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
    padding: 0 var(--space-5);
  }
  .content-container-sm {
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
    padding: 0 var(--space-5);
  }

  /* ── Topbar ── */
  .topbar {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(8px);
    background: rgba(255,255,255,0.92);
  }
  .topbar-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-3) var(--space-5);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 56px;
  }
  .logo-mark {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-text {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
  }

  /* ── Cards ── */
  .card {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    padding: var(--space-6);
    transition: box-shadow var(--transition-base);
  }
  .card-hover:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }
  .card-accent {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-accent-border);
    box-shadow: 0 0 0 3px var(--color-accent-light);
    padding: var(--space-6);
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: -0.01em;
    border: none;
    cursor: pointer;
    transition: all var(--transition-base);
    white-space: nowrap;
    border-radius: var(--radius-md);
    padding: 10px var(--space-4);
    line-height: 1;
    text-decoration: none;
  }
  .btn:disabled { cursor: not-allowed; opacity: 0.5; }
  .btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .btn-primary {
    background: var(--color-text-primary);
    color: var(--color-text-inverse);
  }
  .btn-primary:hover:not(:disabled) {
    background: #1F2937;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }

  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }
  .btn-secondary:hover:not(:disabled) {
    background: var(--color-bg);
    border-color: var(--color-border-strong);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid transparent;
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--color-bg);
    color: var(--color-text-primary);
    border-color: var(--color-border);
  }

  .btn-accent {
    background: var(--color-accent);
    color: var(--color-text-inverse);
    box-shadow: 0 1px 2px rgba(99,102,241,0.2);
  }
  .btn-accent:hover:not(:disabled) {
    background: var(--color-accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99,102,241,0.3);
  }
  .btn-accent:active:not(:disabled) { transform: translateY(0); }

  .btn-success {
    background: var(--color-success);
    color: var(--color-text-inverse);
  }
  .btn-success:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16,185,129,0.3);
  }

  .btn-lg {
    font-size: var(--font-size-base);
    padding: 13px var(--space-6);
    border-radius: var(--radius-md);
  }
  .btn-sm {
    font-size: 12px;
    padding: 7px var(--space-3);
    border-radius: var(--radius-sm);
  }
  .btn-full { width: 100%; }
  .btn-icon {
    padding: 9px;
    border-radius: var(--radius-sm);
  }

  /* ── Inputs ── */
  .input {
    width: 100%;
    padding: 10px var(--space-3);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: border-color var(--transition-base), box-shadow var(--transition-base);
    line-height: 1.5;
  }
  .input::placeholder { color: var(--color-text-tertiary); }
  .input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-accent-light);
    outline: none;
  }
  .input-error {
    border-color: var(--color-error);
    box-shadow: 0 0 0 3px var(--color-error-light);
  }
  .input-error:focus {
    border-color: var(--color-error);
    box-shadow: 0 0 0 3px var(--color-error-light);
  }

  .label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-1);
    letter-spacing: 0.01em;
  }
  .field-error {
    font-size: 12px;
    color: var(--color-error);
    margin-top: var(--space-1);
    font-weight: 500;
  }

  /* ── Badges ── */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.5;
  }
  .badge-neutral {
    background: var(--color-bg);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }
  .badge-accent {
    background: var(--color-accent-light);
    color: var(--color-accent);
    border: 1px solid var(--color-accent-border);
  }
  .badge-success {
    background: var(--color-success-light);
    color: var(--color-success);
    border: 1px solid var(--color-success-border);
  }
  .badge-warning {
    background: var(--color-warning-light);
    color: #92400E;
    border: 1px solid var(--color-warning-border);
  }
  .badge-error {
    background: var(--color-error-light);
    color: var(--color-error);
    border: 1px solid var(--color-error-border);
  }

  /* ── Progress ── */
  .progress-track {
    height: 6px;
    background: var(--color-border);
    border-radius: var(--radius-full);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--color-accent);
    transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }
  .progress-fill-success { background: var(--color-success); }

  /* ── Divider ── */
  .divider {
    height: 1px;
    background: var(--color-border);
    margin: var(--space-6) 0;
  }
  .divider-sm { margin: var(--space-4) 0; }

  /* ── Skeleton ── */
  .skeleton {
    background: linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
  th {
    background: var(--color-bg);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-align: left;
    padding: 10px var(--space-3);
    border-bottom: 1px solid var(--color-border);
    font-size: 12px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  td {
    padding: 11px var(--space-3);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-primary);
    vertical-align: top;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-bg); }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: var(--radius-full); }
  ::-webkit-scrollbar-thumb:hover { background: var(--color-text-tertiary); }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-text-primary);
    color: var(--color-text-inverse);
    padding: 12px var(--space-5);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: 500;
    box-shadow: var(--shadow-xl);
    z-index: 9999;
    animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    white-space: nowrap;
  }

  /* ── Track tabs ── */
  .track-tab {
    padding: 8px var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-base);
    border: 1px solid transparent;
    color: var(--color-text-secondary);
    background: transparent;
  }
  .track-tab:hover {
    background: var(--color-bg);
    color: var(--color-text-primary);
    border-color: var(--color-border);
  }
  .track-tab.active {
    background: var(--color-text-primary);
    color: var(--color-text-inverse);
    border-color: transparent;
  }

  /* ── Challenge node ── */
  .challenge-node {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    cursor: pointer;
    transition: all var(--transition-base);
    text-align: left;
    width: 100%;
  }
  .challenge-node:hover:not(.node-locked) {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .challenge-node.node-active {
    border-color: var(--color-accent-border);
    background: var(--color-accent-light);
  }
  .challenge-node.node-active:hover {
    border-color: var(--color-accent);
    box-shadow: 0 4px 12px rgba(99,102,241,0.15);
  }
  .challenge-node.node-done {
    border-color: var(--color-success-border);
    background: var(--color-success-light);
  }
  .challenge-node.node-locked {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-bg);
  }

  /* ── MCQ Options ── */
  .mcq-option {
    width: 100%;
    text-align: left;
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    font-weight: 400;
    cursor: pointer;
    transition: all var(--transition-base);
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    font-family: var(--font-family);
    letter-spacing: -0.01em;
    line-height: 1.55;
  }
  .mcq-option:hover:not(.mcq-revealed) {
    border-color: var(--color-accent);
    background: var(--color-accent-light);
  }
  .mcq-option.mcq-selected {
    border-color: var(--color-accent);
    background: var(--color-accent-light);
    color: var(--color-accent);
    font-weight: 500;
  }
  .mcq-option.mcq-correct {
    border-color: var(--color-success);
    background: var(--color-success-light);
    color: #065F46;
  }
  .mcq-option.mcq-wrong {
    border-color: var(--color-error);
    background: var(--color-error-light);
    color: #991B1B;
  }
  .mcq-option.mcq-show-correct {
    border-color: var(--color-success);
    background: var(--color-success-light);
    color: #065F46;
  }
  .mcq-option.mcq-revealed { cursor: default; }

  /* ── Score bars ── */
  .score-bar-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Hint accordion ── */
  .hint-step {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    align-items: flex-start;
  }
  .hint-step-num {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-full);
    background: var(--color-warning-light);
    border: 1px solid var(--color-warning-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: #92400E;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* ── Feedback stars ── */
  .star-btn {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    font-size: 18px;
    cursor: pointer;
    transition: all var(--transition-base);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .star-btn:hover { border-color: var(--color-warning); background: var(--color-warning-light); }
  .star-btn.active { border-color: var(--color-warning); background: var(--color-warning-light); }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .hide-mobile { display: none !important; }
    .stack-mobile { flex-direction: column !important; }
    .full-mobile { width: 100% !important; }
    .content-container, .content-container-sm {
      padding: 0 var(--space-4);
    }
    .topbar-inner {
      padding: var(--space-3) var(--space-4);
    }
  }
`;

// ── Markdown renderer ──────────────────────────────────────────────────────
function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") ? (
      <strong key={i} style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
        {p.replace(/\*\*/g, "")}
      </strong>
    ) : p
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
    const parsed = rows.map(r => r.split("|").map(c => c.trim()).filter(Boolean));
    if (parsed.length === 0) { tableBuffer = []; inTable = false; return; }
    const [head, ...body] = parsed;
    result.push(
      <div key={key} style={{ overflowX: "auto", margin: "var(--space-4) 0", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
        <table>
          <thead>
            <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{inlineFormat(cell)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = []; inTable = false;
  };

  lines.forEach((line, i) => {
    if (line.trim().startsWith("|")) {
      inTable = true;
      tableBuffer.push(line);
      return;
    }
    if (inTable) flushTable(`t${i}`);

    if (!line.trim()) {
      result.push(<div key={i} style={{ height: "var(--space-3)" }} />);
    } else if (line.startsWith("### ")) {
      result.push(<h3 key={i} style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", margin: "var(--space-5) 0 var(--space-2)" }}>{inlineFormat(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      result.push(<h2 key={i} style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", margin: "var(--space-6) 0 var(--space-3)" }}>{inlineFormat(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      result.push(<h1 key={i} style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-text-primary)", margin: "var(--space-6) 0 var(--space-3)" }}>{inlineFormat(line.slice(2))}</h1>);
    } else if (line.match(/^[-*] /)) {
      result.push(
        <div key={i} style={{ display: "flex", gap: "var(--space-3)", margin: "var(--space-1) 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--color-accent)", fontWeight: 700, marginTop: 2, flexShrink: 0 }}>·</span>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\./)[1];
      result.push(
        <div key={i} style={{ display: "flex", gap: "var(--space-3)", margin: "var(--space-1) 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--color-accent)", fontWeight: 700, minWidth: 20, fontSize: "var(--font-size-sm)", marginTop: 2, flexShrink: 0 }}>{num}.</span>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>{inlineFormat(line.replace(/^\d+\.\s*/, ""))}</span>
        </div>
      );
    } else {
      result.push(<p key={i} style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.7, margin: "var(--space-1) 0" }}>{inlineFormat(line)}</p>);
    }
  });

  if (inTable) flushTable("t-final");
  return result;
}

function renderMD(text, isKey = false) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: "var(--space-2)" }} />;
    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      return (
        <p key={i} style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", margin: "var(--space-4) 0 var(--space-2)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "11px" }}>
          {line.replace(/\*\*/g, "")}
        </p>
      );
    }
    if (line.startsWith("━")) {
      return <div key={i} style={{ height: 1, background: "var(--color-border)", margin: "var(--space-2) 0" }} />;
    }
    if (line.match(/^[-*] /)) {
      return (
        <div key={i} style={{ display: "flex", gap: "var(--space-2)", margin: "3px 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--color-accent)", fontWeight: 700, marginTop: 3, flexShrink: 0, fontSize: 10 }}>●</span>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    }
    return (
      <p key={i} style={{ fontSize: "var(--font-size-sm)", color: isKey ? "var(--color-text-primary)" : "var(--color-text-secondary)", lineHeight: 1.7, margin: "2px 0" }}>
        {inlineFormat(line)}
      </p>
    );
  });
}

// ── Score bar component ────────────────────────────────────────────────────
function ScoreBar({ label, score, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score * 10), delay + 100);
    return () => clearTimeout(t);
  }, [score, delay]);

  const color = score >= 7 ? "var(--color-success)" : score >= 5 ? "var(--color-warning)" : "var(--color-error)";

  return (
    <div style={{ marginBottom: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color }}>{score}<span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>/10</span></span>
      </div>
      <div className="progress-track">
        <div
          className="score-bar-fill"
          style={{ width: `${width}%`, background: color, transition: `width 0.8s ${delay}ms cubic-bezier(0.4,0,0.2,1)` }}
        />
      </div>
    </div>
  );
}

// ── Toast component ────────────────────────────────────────────────────────
function Toast({ message, type = "default" }) {
  const icons = { success: "✓", error: "✕", default: "·" };
  const colors = { success: "var(--color-success)", error: "var(--color-error)", default: "var(--color-text-tertiary)" };
  return (
    <div className="toast">
      <span style={{ color: colors[type], fontWeight: 700 }}>{icons[type]}</span>
      {message}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function SkeletonChallenge() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      <div className="skeleton" style={{ height: 20, width: "40%", marginBottom: "var(--space-4)" }} />
      <div className="skeleton" style={{ height: 14, width: "100%", marginBottom: "var(--space-2)" }} />
      <div className="skeleton" style={{ height: 14, width: "95%", marginBottom: "var(--space-2)" }} />
      <div className="skeleton" style={{ height: 14, width: "88%", marginBottom: "var(--space-5)" }} />
      <div className="skeleton" style={{ height: 14, width: "100%", marginBottom: "var(--space-2)" }} />
      <div className="skeleton" style={{ height: 14, width: "92%", marginBottom: "var(--space-2)" }} />
      <div className="skeleton" style={{ height: 14, width: "75%", marginBottom: "var(--space-6)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height: 52, borderRadius: "var(--radius-md)" }} />
        ))}
      </div>
    </div>
  );
}

// ── Path node component ────────────────────────────────────────────────────
function PathNode({ challenge, idx, status, onClick }) {
  const statusConfig = {
    active: { icon: null, label: "Start", badgeClass: "badge-accent" },
    done:   { icon: "✓",  label: "Done",  badgeClass: "badge-success" },
    locked: { icon: "🔒", label: "Locked", badgeClass: "badge-neutral" },
  };
  const cfg = statusConfig[status];

  return (
    <button
      className={`challenge-node node-${status}`}
      onClick={status !== "locked" ? onClick : undefined}
      style={{ cursor: status === "locked" ? "not-allowed" : "pointer" }}
    >
      {/* Icon */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "var(--radius-md)",
        background: status === "done" ? "var(--color-success-light)" : status === "active" ? "var(--color-accent-light)" : "var(--color-bg)",
        border: `1px solid ${status === "done" ? "var(--color-success-border)" : status === "active" ? "var(--color-accent-border)" : "var(--color-border)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: status === "done" ? 18 : 20,
        flexShrink: 0,
        color: status === "done" ? "var(--color-success)" : "inherit",
        fontWeight: 700,
      }}>
        {status === "done" ? "✓" : challenge.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
          <span style={{ fontSize: "var(--font-size-base)", fontWeight: 600, color: "var(--color-text-primary)" }}>
            {challenge.tag}
          </span>
          <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
        </div>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.4 }}>
          {status === "locked" ? "Complete the previous challenge to unlock" : `${challenge.hint?.framework || "Framework-based"} challenge`}
        </p>
      </div>

      {/* Arrow */}
      {status !== "locked" && (
        <div style={{ color: "var(--color-text-tertiary)", fontSize: 16, flexShrink: 0 }}>→</div>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PMApp() {
  const [screen, setScreen] = useState("login");
  const [isGuest, setIsGuest] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [track, setTrack] = useState("B2B");
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

  const [assessment, setAssessment] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scores, setScores] = useState(null);

  const [completedIdxs, setCompletedIdxs] = useState(() => {
    const s = storageGet("pm_completed");
    const parsed = s ? JSON.parse(s.value) : {};
    return { B2B: parsed.B2B||[], B2C: parsed.B2C||[], PO: parsed.PO||[] };
  });
  const [totalXP, setTotalXP] = useState(() => {
    const s = storageGet("pm_xp");
    return s ? parseInt(s.value) : 0;
  });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const [guestName, setGuestName] = useState("");
  const [guestAge, setGuestAge] = useState("");
  const [guestIndustry, setGuestIndustry] = useState("");
  const [guestExp, setGuestExp] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestFormErr, setGuestFormErr] = useState("");

  const [mcqOptions, setMcqOptions] = useState([]);
  const [mcqSelected, setMcqSelected] = useState(null);
  const [mcqCorrect, setMcqCorrect] = useState(null);
  const [mcqRevealed, setMcqRevealed] = useState(false);

  const [fbName, setFbName] = useState("");
  const [fbAge, setFbAge] = useState("");
  const [fbIndustry, setFbIndustry] = useState("");
  const [fbYears, setFbYears] = useState("");
  const [fbComment, setFbComment] = useState("");
  const [fbUseful, setFbUseful] = useState(0);
  const [fbEasy, setFbEasy] = useState("");
  const [fbImprove, setFbImprove] = useState("");
  const [fbSending, setFbSending] = useState(false);

  const [toast, setToast] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  function showToast(msg, type = "default") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const hR = storageList("pm_session:");
    if (hR?.keys?.length) {
      const s = hR.keys.map(k => { const r = storageGet(k); return r ? JSON.parse(r.value) : null; }).filter(Boolean).reverse();
      setHistory(s.slice(0, 30));
    }
  }, []);

  // ── Auth ──
  async function loginFull() {
    setPwLoading(true);
    await new Promise(r => setTimeout(r, 400));
    if (pwInput.trim() === "Siddhant0809") {
      storageSet("pm_auth", "true");
      setIsGuest(false);
      setScreen("home");
      showToast("Welcome back!", "success");
    } else {
      setPwError(true);
      setPwInput("");
    }
    setPwLoading(false);
  }

  function loginGuest() {
    setIsGuest(true);
    setShowGuestForm(true);
  }

  function submitGuestProfile() {
    if (!guestName.trim() || !guestAge.trim() || !guestIndustry.trim() || !guestExp.trim()) {
      setGuestFormErr("Please fill in all fields to continue.");
      return;
    }
    setGuestFormErr("");
    setShowGuestForm(false);
    setFbName(guestName); setFbAge(guestAge); setFbIndustry(guestIndustry); setFbYears(guestExp);
    setScreen("home");
    showToast("Welcome! Your free challenge is ready.", "success");
  }

  // ── Challenge flow ──
  async function openChallenge(idx) {
    if (isGuest && idx > 0) return;
    const chosen = CHALLENGES[track][idx];
    setPick(chosen); setCurrentIdx(idx); setHintOpen(false);
    setLoading(true); setError("");
    setChallengeText(""); setAnswer("");
    setMcqOptions([]); setMcqSelected(null); setMcqRevealed(false); setMcqCorrect(null);
    setScreen("challenge");
    try {
      const text = await callClaude(`You are a ${track} PM coach. Generate a concise, realistic, specific challenge.`, chosen.prompt);
      setChallengeText(text);
      try {
        const mcqRaw = await callClaude(
          "You are a PM quiz generator. Reply with valid JSON only, no markdown, no extra text.",
          `Based on this PM challenge, generate exactly 4 multiple choice answers. One must be correct, three plausible but wrong. Mix the correct answer randomly among the 4 positions.

Reply ONLY with this JSON structure (no other text):
{"correct":"the correct answer text here","options":["option 1","option 2","option 3","option 4"]}

The correct answer must appear exactly as written in the options array.

Challenge: ${text}`
        );
        const clean = mcqRaw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setMcqOptions(parsed.options);
        setMcqCorrect(parsed.correct);
      } catch (_) {
        setMcqOptions([]); setMcqCorrect(null);
      }
    } catch (e) {
      setError(e.message);
      showToast("Failed to load challenge. Please try again.", "error");
    }
    setLoading(false);
  }

  async function submitAnswer(chosenOption) {
    const answerText = chosenOption || answer;
    if (!answerText.trim()) return;
    setLoading(true);
    setError("");
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
      showToast("Assessment complete!", "success");
    } catch (e) {
      setError(e.message);
      showToast("Assessment failed. Please try again.", "error");
    }
    setLoading(false);
  }

  function saveProgress(s) {
    storageSet("pm_last_tag", pick?.tag);
    storageSet(`pm_session:${Date.now()}`, JSON.stringify({ date: today, tag: pick?.tag, track, scores: s }));
    if (!isGuest) {
      const updated = { ...completedIdxs, [track]: [...new Set([...completedIdxs[track], currentIdx])] };
      setCompletedIdxs(updated);
      storageSet("pm_completed", JSON.stringify(updated));
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

  function getStatus(idx) {
    if (isGuest) return idx === 0 ? "active" : "locked";
    const done = completedIdxs[track] || [];
    if (done.includes(idx)) return "done";
    const firstIncomplete = challenges.findIndex((_, i) => !done.includes(i));
    return idx === firstIncomplete ? "active" : idx < firstIncomplete ? "done" : "locked";
  }

  const challenges = track === "PO"
    ? CHALLENGES.PO.filter(c => poSelectedTypes.includes(c.tag))
    : CHALLENGES[track];
  const doneCount = completedIdxs[track]?.length || 0;
  const pct = challenges.length > 0 ? Math.round((doneCount / challenges.length) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: LOGIN
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "login" && !showGuestForm) return (
    <div className="page-container" style={{ background: "var(--color-bg)" }}>
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-8) var(--space-5)" }}>

        {/* Hero */}
        <div className="anim-fade-up" style={{ textAlign: "center", marginBottom: "var(--space-10)", maxWidth: 440 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "var(--radius-lg)",
            background: "var(--color-text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto var(--space-6)",
            boxShadow: "var(--shadow-lg)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-3)", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            PM Training
          </h1>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)", lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
            Real-world scenarios. AI-powered feedback. Build the instincts of a senior PM.
          </p>
        </div>

        {/* Login card */}
        <div className="card anim-fade-up-1" style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>Sign in</h2>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>Enter your access code to continue</p>
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <label className="label">Access code</label>
            <input
              className={`input ${pwError ? "input-error" : ""}`}
              type="password"
              placeholder="Enter your code"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && loginFull()}
              autoFocus
            />
            {pwError && <p className="field-error">Incorrect code. Please try again.</p>}
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={loginFull}
            disabled={!pwInput.trim() || pwLoading}
            style={{ marginBottom: "var(--space-3)" }}
          >
            {pwLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                Signing in…
              </span>
            ) : "Sign in →"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", margin: "var(--space-4) 0" }}>
            <div className="divider" style={{ flex: 1, margin: 0 }} />
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500 }}>or</span>
            <div className="divider" style={{ flex: 1, margin: 0 }} />
          </div>

          <button
            className="btn btn-secondary btn-lg btn-full"
            onClick={loginGuest}
          >
            Try a free challenge
          </button>
        </div>

        {/* Social proof */}
        <div className="anim-fade-up-2" style={{ marginTop: "var(--space-8)", display: "flex", gap: "var(--space-8)", textAlign: "center" }}>
          {[
            { value: "15+", label: "Challenges" },
            { value: "3", label: "Tracks" },
            { value: "AI", label: "Scoring" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: GUEST PROFILE FORM
  // ─────────────────────────────────────────────────────────────────────────
  if (showGuestForm) return (
    <div className="page-container">
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">PM Training</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => { setShowGuestForm(false); setIsGuest(false); }}>
            ← Back
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-8) var(--space-5)" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          <div className="anim-fade-up" style={{ marginBottom: "var(--space-8)" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-2)", letterSpacing: "-0.03em" }}>
              Quick intro
            </h1>
            <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              This helps us tailor the challenge and feedback to you.
            </p>
          </div>

          <div className="card anim-fade-up-1">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label className="label">Full name <span style={{ color: "var(--color-error)" }}>*</span></label>
                <input className="input" placeholder="e.g. Alex Johnson" value={guestName} onChange={e => { setGuestName(e.target.value); setGuestFormErr(""); }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label className="label">Age <span style={{ color: "var(--color-error)" }}>*</span></label>
                  <input className="input" placeholder="e.g. 28" value={guestAge} onChange={e => { setGuestAge(e.target.value); setGuestFormErr(""); }} />
                </div>
                <div>
                  <label className="label">Experience <span style={{ color: "var(--color-error)" }}>*</span></label>
                  <input className="input" placeholder="e.g. 2 years" value={guestExp} onChange={e => { setGuestExp(e.target.value); setGuestFormErr(""); }} />
                </div>
              </div>
              <div>
                <label className="label">Industry <span style={{ color: "var(--color-error)" }}>*</span></label>
                <input className="input" placeholder="e.g. SaaS, FinTech, Healthcare" value={guestIndustry} onChange={e => { setGuestIndustry(e.target.value); setGuestFormErr(""); }} />
              </div>
            </div>

            {guestFormErr && (
              <div style={{ marginTop: "var(--space-4)", padding: "10px var(--space-3)", background: "var(--color-error-light)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)", color: "var(--color-error)" }}>
                {guestFormErr}
              </div>
            )}

            <button
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: "var(--space-5)" }}
              onClick={submitGuestProfile}
            >
              Start my free challenge →
            </button>
          </div>

          <p className="anim-fade-up-2" style={{ marginTop: "var(--space-4)", textAlign: "center", fontSize: 12, color: "var(--color-text-tertiary)" }}>
            Your information is only used to personalise your experience.
          </p>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: HOME
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div className="page-container">
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">PM Training</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {!isGuest && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500 }}>{totalXP} XP</span>
              </div>
            )}
            {isGuest && (
              <span className="badge badge-neutral">Guest</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: "var(--space-16)" }}>
        <div className="content-container" style={{ paddingTop: "var(--space-8)" }}>

          {/* Header */}
          <div className="anim-fade-up" style={{ marginBottom: "var(--space-8)" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-2)", letterSpacing: "-0.03em" }}>
              {isGuest ? `Welcome, ${guestName}` : "Your training path"}
            </h1>
            <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              {isGuest
                ? "Try a free challenge to see how AI-powered PM coaching works."
                : "Practice real scenarios. Get structured feedback. Build PM instincts."}
            </p>
          </div>

          {/* Track selector */}
          {!isGuest && (
            <div className="anim-fade-up-1" style={{ marginBottom: "var(--space-6)" }}>
              <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-1)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", width: "fit-content" }}>
                {["B2B", "B2C", "PO"].map(t => (
                  <button
                    key={t}
                    className={`track-tab ${track === t ? "active" : ""}`}
                    onClick={() => setTrack(t)}
                  >
                    {t === "PO" ? "Product Owner" : t === "B2B" ? "B2B SaaS" : "B2C Consumer"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar (full users) */}
          {!isGuest && (
            <div className="card anim-fade-up-2" style={{ marginBottom: "var(--space-5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                <div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>
                    {track === "PO" ? "CGM ASSIST · Product Owner" : track === "B2B" ? "B2B SaaS Track" : "B2C Consumer Track"}
                  </div>
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                    {doneCount} of {challenges.length} challenges complete
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>{pct}%</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>complete</div>
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: "var(--space-6)", marginTop: "var(--space-5)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--color-border)" }}>
                {[
                  { value: totalXP, label: "Total XP" },
                  { value: history.length, label: "Sessions" },
                  { value: history.length > 0 ? `${history[0]?.scores?.overall ?? "—"}/10` : "—", label: "Last score" },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500, marginTop: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PO type filter */}
          {track === "PO" && !isGuest && (
            <div className="anim-fade-up-2" style={{ marginBottom: "var(--space-4)" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPoTypePicker(o => !o)}
              >
                Filter challenges {showPoTypePicker ? "▲" : "▼"}
              </button>
              {showPoTypePicker && (
                <div className="anim-slide-down" style={{ marginTop: "var(--space-3)", padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  {PO_ALL_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const updated = poSelectedTypes.includes(type)
                          ? poSelectedTypes.filter(t => t !== type)
                          : [...poSelectedTypes, type];
                        if (updated.length > 0) {
                          setPoSelectedTypes(updated);
                          storageSet("pm_po_types", JSON.stringify(updated));
                        }
                      }}
                      className={`badge ${poSelectedTypes.includes(type) ? "badge-accent" : "badge-neutral"}`}
                      style={{ cursor: "pointer", border: "1px solid", padding: "6px 12px", fontSize: 13, fontWeight: 600 }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Challenge path */}
          <div className="anim-fade-up-3">
            <div style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)" }}>
                {isGuest ? "Free challenge" : "Challenge path"}
              </h2>
              {track === "PO" && !isGuest && (
                <span className="badge badge-neutral">CGM ASSIST scenarios</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(isGuest ? challenges.slice(0, 1) : challenges).map((ch, idx) => (
                <div key={idx} className="anim-fade-up" style={{ animationDelay: `${idx * 0.04}s` }}>
                  <PathNode challenge={ch} idx={idx} status={getStatus(idx)} onClick={() => openChallenge(idx)} />
                </div>
              ))}
            </div>

            {/* Guest upsell */}
            {isGuest && (
              <div style={{ marginTop: "var(--space-5)", padding: "var(--space-5)", background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
                <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-accent)", marginBottom: "var(--space-1)" }}>
                  Unlock all 15 challenges
                </p>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  Get full access to B2B, B2C, and Product Owner tracks with AI-powered scoring.
                </p>
              </div>
            )}
          </div>

          {/* Recent history */}
          {!isGuest && history.length > 0 && (
            <div className="card anim-fade-up-4" style={{ marginTop: "var(--space-6)" }}>
              <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-4)" }}>Recent sessions</h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {history.slice(0, 5).map((s, i) => {
                  const sc = s.scores?.overall;
                  const scColor = sc >= 7 ? "var(--color-success)" : sc >= 5 ? "var(--color-warning)" : "var(--color-error)";
                  const allChallenges = CHALLENGES.B2B.concat(CHALLENGES.B2C).concat(CHALLENGES.PO);
                  const ch = allChallenges.find(x => x.tag === s.tag);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) 0", borderBottom: i < Math.min(history.length - 1, 4) ? "1px solid var(--color-border)" : "none" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "var(--radius-sm)",
                        background: "var(--color-bg)", border: "1px solid var(--color-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0,
                      }}>
                        {ch?.icon || "📋"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>{s.tag}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{s.track} · {s.date}</div>
                      </div>
                      {sc != null && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span style={{ fontSize: "var(--font-size-base)", fontWeight: 800, color: scColor }}>{sc}</span>
                          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>/10</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state for history */}
          {!isGuest && history.length === 0 && (
            <div style={{ marginTop: "var(--space-6)", padding: "var(--space-8)", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" }}>
              <div style={{ fontSize: 32, marginBottom: "var(--space-3)" }}>📋</div>
              <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>No sessions yet</p>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>Complete your first challenge to see your history here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: CHALLENGE
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "challenge") return (
    <div className="page-container">
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <button className="btn btn-ghost btn-sm" onClick={() => setScreen("home")}>
            ← Back
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>
              {pick?.icon} {pick?.tag}
            </span>
          </div>
          <span className="badge badge-neutral hide-mobile">{track}</span>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: "var(--space-16)" }}>
        <div className="content-container" style={{ paddingTop: "var(--space-6)" }}>

          {/* Loading skeleton */}
          {loading && !challengeText && (
            <div className="card anim-fade-up">
              <SkeletonChallenge />
            </div>
          )}

          {challengeText && (
            <>
              {/* Challenge card */}
              <div className="card anim-fade-up" style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)", paddingBottom: "var(--space-5)", borderBottom: "1px solid var(--color-border)" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "var(--radius-md)",
                    background: "var(--color-bg)", border: "1px solid var(--color-border)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
                  }}>
                    {pick?.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Challenge</div>
                    <div style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)" }}>{pick?.tag}</div>
                  </div>
                  <span className="badge badge-neutral">{track}</span>
                </div>
                <div style={{ fontSize: "var(--font-size-sm)", lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
                  {renderChallenge(challengeText)}
                </div>
              </div>

              {/* Hint accordion */}
              {pick?.hint && (
                <div className="card anim-fade-up-1" style={{ marginBottom: "var(--space-4)", borderColor: hintOpen ? "var(--color-warning-border)" : "var(--color-border)", background: hintOpen ? "var(--color-warning-light)" : "var(--color-surface)" }}>
                  <button
                    onClick={() => setHintOpen(o => !o)}
                    style={{ background: "none", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, cursor: "pointer", border: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span style={{ fontSize: 16 }}>💡</span>
                      <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>Framework hint</span>
                      <span className="badge badge-warning">{pick.hint.framework}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 600 }}>{hintOpen ? "Hide ▲" : "Show ▼"}</span>
                  </button>

                  {hintOpen && (
                    <div className="anim-slide-down" style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--color-warning-border)" }}>
                      {pick.hint.steps.map((s, i) => (
                        <div key={i} className="hint-step">
                          <span className="hint-step-num">{i + 1}</span>
                          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>{s}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: "var(--space-4)", padding: "10px var(--space-3)", background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--color-warning)", fontSize: "var(--font-size-sm)", color: "#92400E", fontWeight: 500 }}>
                        Watch out: {pick.hint.watch}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MCQ section */}
              <div className="card anim-fade-up-2" style={{ marginBottom: "var(--space-5)" }}>
                <div style={{ marginBottom: "var(--space-5)" }}>
                  <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
                    Select your answer
                  </h3>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                    Choose the best response to this scenario.
                  </p>
                </div>

                {/* MCQ loading skeleton */}
                {mcqOptions.length === 0 && loading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} className="skeleton" style={{ height: 52, borderRadius: "var(--radius-md)" }} />
                    ))}
                  </div>
                )}

                {mcqOptions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {mcqOptions.map((opt, i) => {
                      const isSelected = mcqSelected === opt;
                      const isCorrect = opt === mcqCorrect;
                      const userGotItWrong = mcqRevealed && mcqSelected && mcqSelected !== mcqCorrect;

                      let className = "mcq-option";
                      if (mcqRevealed) {
                        className += " mcq-revealed";
                        if (isSelected && isCorrect) className += " mcq-correct";
                        else if (isSelected) className += " mcq-wrong";
                        else if (isCorrect && userGotItWrong) className += " mcq-show-correct";
                      } else if (isSelected) {
                        className += " mcq-selected";
                      }

                      return (
                        <button
                          key={i}
                          className={className}
                          onClick={() => !mcqRevealed && setMcqSelected(opt)}
                        >
                          <span style={{
                            width: 28, height: 28, borderRadius: "var(--radius-sm)",
                            background: "var(--color-bg)", border: "1px solid var(--color-border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                            color: "var(--color-text-secondary)",
                          }}>
                            {mcqRevealed && isSelected && isCorrect ? "✓" :
                             mcqRevealed && isSelected ? "✕" :
                             mcqRevealed && isCorrect && userGotItWrong ? "✓" :
                             String.fromCharCode(65 + i)}
                          </span>
                          <span style={{ flex: 1, lineHeight: 1.55 }}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                {mcqOptions.length > 0 && (
                  <div style={{ marginTop: "var(--space-5)", display: "flex", gap: "var(--space-3)" }} className="stack-mobile">
                    <button className="btn btn-ghost" onClick={() => setScreen("home")}>Cancel</button>
                    {!mcqRevealed ? (
                      <button
                        className={`btn ${mcqSelected ? "btn-primary" : "btn-secondary"} btn-lg`}
                        style={{ flex: 1 }}
                        disabled={!mcqSelected}
                        onClick={() => { if (mcqSelected) setMcqRevealed(true); }}
                      >
                        Check answer →
                      </button>
                    ) : (
                      loading ? (
                        <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} disabled>
                          <span className="spinner" style={{ width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-text-primary)", borderRadius: "50%", display: "inline-block" }} />
                          Scoring…
                        </button>
                      ) : (
                        <button
                          className="btn btn-accent btn-lg"
                          style={{ flex: 1 }}
                          onClick={() => submitAnswer(mcqSelected)}
                        >
                          Get full assessment →
                        </button>
                      )
                    )}
                  </div>
                )}

                {error && (
                  <div style={{ marginTop: "var(--space-4)", padding: "10px var(--space-3)", background: "var(--color-error-light)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)", color: "var(--color-error)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span>⚠</span> {error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: RESULT
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "result") return (
    <div className="page-container">
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <button className="btn btn-ghost btn-sm" onClick={() => setScreen("home")}>
            ← Back to path
          </button>
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginLeft: "auto" }}>
            Assessment
          </span>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: "var(--space-16)" }}>
        <div className="content-container" style={{ paddingTop: "var(--space-6)" }}>

          {/* Score hero */}
          {scores && (() => {
            const sc = scores.overall;
            const isHigh = sc >= 7;
            const isMid = sc >= 5 && sc < 7;
            const color = isHigh ? "var(--color-success)" : isMid ? "var(--color-warning)" : "var(--color-error)";
            const bg = isHigh ? "var(--color-success-light)" : isMid ? "var(--color-warning-light)" : "var(--color-error-light)";
            const borderColor = isHigh ? "var(--color-success-border)" : isMid ? "var(--color-warning-border)" : "var(--color-error-border)";
            const label = isHigh ? "Excellent thinking" : isMid ? "Good effort — keep going" : "Keep practising";
            const emoji = isHigh ? "🎉" : isMid ? "📈" : "💪";
            return (
              <div className="anim-pop-in" style={{ marginBottom: "var(--space-4)", background: bg, border: `1px solid ${borderColor}`, borderRadius: "var(--radius-lg)", padding: "var(--space-8) var(--space-6)", textAlign: "center" }}>
                <div style={{ fontSize: 64, fontWeight: 900, color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "var(--space-2)" }}>{sc}</div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", marginBottom: "var(--space-4)" }}>out of 10</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", background: "rgba(255,255,255,0.7)", borderRadius: "var(--radius-full)", padding: "6px 16px", border: `1px solid ${borderColor}` }}>
                  <span>{emoji}</span>
                  <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color }}>{label}</span>
                </div>
                {!isGuest && (
                  <div style={{ marginTop: "var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                    +{10 + (sc * 5)} XP earned
                  </div>
                )}
              </div>
            );
          })()}

          {/* Score breakdown */}
          {scores && (
            <div className="card anim-fade-up-1" style={{ marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>Score breakdown</h3>
              <ScoreBar label="Structured Thinking" score={scores.structured} delay={0} />
              <ScoreBar label="Business Acumen"     score={scores.business}   delay={80} />
              <ScoreBar label="Specificity & Depth"  score={scores.depth}      delay={160} />
              <ScoreBar label="PM Maturity"          score={scores.maturity}   delay={240} />
            </div>
          )}

          {/* Coach feedback */}
          <div className="card anim-fade-up-2" style={{ marginBottom: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-4)" }}>Coach feedback</h3>
            <div style={{ fontSize: "var(--font-size-sm)", lineHeight: 1.7 }}>
              {renderMD(assessment)}
            </div>
          </div>

          {/* Model answer */}
          {answerKey && (
            <div className="anim-fade-up-3" style={{ marginBottom: "var(--space-6)" }}>
              <button
                onClick={() => setShowKey(o => !o)}
                style={{
                  width: "100%",
                  background: showKey ? "var(--color-success-light)" : "var(--color-surface)",
                  border: `1px solid ${showKey ? "var(--color-success-border)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-4) var(--space-5)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all var(--transition-base)",
                  fontFamily: "var(--font-family)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ fontSize: 18 }}>🔑</span>
                  <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: showKey ? "#065F46" : "var(--color-text-primary)" }}>
                    Model answer
                  </span>
                  {!showKey && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>tap to reveal</span>}
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 600 }}>{showKey ? "Hide ▲" : "Show ▼"}</span>
              </button>

              {showKey && (
                <div className="anim-slide-down" style={{ marginTop: "var(--space-2)", padding: "var(--space-5)", background: "var(--color-success-light)", border: "1px solid var(--color-success-border)", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ fontSize: "var(--font-size-sm)", lineHeight: 1.7 }}>
                    {renderMD(answerKey, true)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="anim-fade-up-4" style={{ display: "flex", gap: "var(--space-3)" }}>
            <button className="btn btn-ghost" onClick={() => setScreen("home")}>← Back to path</button>
            {isGuest ? (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setScreen("feedback")}>
                Leave feedback →
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
                onClick={() => {
                  setScreen("home");
                  setTimeout(() => openChallenge(Math.min(currentIdx + 1, challenges.length - 1)), 50);
                }}
              >
                Next challenge →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: GUEST FEEDBACK
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "feedback") return (
    <div className="page-container">
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">PM Training</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "var(--space-8) var(--space-5)" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>

          <div className="anim-fade-up" style={{ marginBottom: "var(--space-8)" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-2)", letterSpacing: "-0.03em" }}>
              Quick feedback
            </h1>
            <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              Takes 60 seconds. Helps us improve the product.
            </p>
          </div>

          <div className="card anim-fade-up-1" style={{ marginBottom: "var(--space-4)" }}>

            {/* Pre-filled details */}
            <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-5)", borderBottom: "1px solid var(--color-border)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "var(--space-3)" }}>Your details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                {[
                  { label: "Name", val: fbName, set: setFbName, placeholder: "Your name" },
                  { label: "Age", val: fbAge, set: setFbAge, placeholder: "Your age" },
                  { label: "Industry", val: fbIndustry, set: setFbIndustry, placeholder: "e.g. SaaS" },
                  { label: "Experience", val: fbYears, set: setFbYears, placeholder: "e.g. 3 years" },
                ].map(({ label, val, set, placeholder }) => (
                  <div key={label}>
                    <label className="label">{label}</label>
                    <input className="input" value={val} onChange={e => set(e.target.value)} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>
                How useful was this challenge? <span style={{ color: "var(--color-error)" }}>*</span>
              </p>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`star-btn ${fbUseful >= n ? "active" : ""}`}
                    onClick={() => setFbUseful(n)}
                  >
                    {fbUseful >= n ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            {/* Easy to use */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>
                Was it easy to use?
              </p>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {["Yes", "Somewhat", "No"].map(opt => (
                  <button
                    key={opt}
                    className={`badge ${fbEasy === opt ? "badge-accent" : "badge-neutral"}`}
                    style={{ cursor: "pointer", padding: "8px 16px", fontSize: 13, fontWeight: 600 }}
                    onClick={() => setFbEasy(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <label className="label">What did you think?</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Any thoughts, suggestions, or reactions…"
                value={fbComment}
                onChange={e => setFbComment(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Improve */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <label className="label">What would make it better?</label>
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. More scenarios, better hints…"
                value={fbImprove}
                onChange={e => setFbImprove(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>

            <button
              className={`btn ${fbUseful > 0 ? "btn-primary" : "btn-secondary"} btn-lg btn-full`}
              disabled={fbUseful === 0 || fbSending}
              onClick={submitGuestFeedback}
            >
              {fbSending ? (
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                  Sending…
                </span>
              ) : "Submit feedback →"}
            </button>
          </div>

          <button
            className="btn btn-ghost btn-full"
            onClick={() => setScreen("thanks")}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: THANKS
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "thanks") return (
    <div className="page-container" style={{ alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>

      <div className="anim-pop-in" style={{ textAlign: "center", maxWidth: 400, padding: "var(--space-8) var(--space-5)" }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: "var(--radius-xl)",
          background: "var(--color-success-light)",
          border: "1px solid var(--color-success-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto var(--space-6)",
          fontSize: 32,
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-3)", letterSpacing: "-0.03em" }}>
          Thank you
        </h1>
        <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "var(--space-8)" }}>
          Your feedback helps us build a better product. We read every response.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => { setScreen("login"); setIsGuest(false); }}
        >
          Back to start
        </button>
      </div>
    </div>
  );

  return null;
}
