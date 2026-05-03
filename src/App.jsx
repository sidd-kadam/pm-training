import { useState, useEffect, useRef } from "react";

// ── Storage ───────────────────────────────────────────────────────────────
function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

// ── Pricing tiers ─────────────────────────────────────────────────────────
const TIERS = {
  free:  { id: "free",  label: "Free",  price: "₹0",    period: "/month",  color: "var(--color-text-tertiary)" },
  pro:   { id: "pro",   label: "Pro",   price: "₹499",  period: "/month",  color: "var(--color-accent)" },
  team:  { id: "team",  label: "Team",  price: "₹999",  period: "/user/month", color: "#10B981" },
};

const TIER_FEATURES = {
  free:  ["Both B2B & B2C tracks", "3 challenges/week", "AI scoring & feedback", "Streak counter"],
  pro:   ["Everything in Free", "Unlimited challenges", "Friend challenges", "Leaderboard access", "1 streak freeze/month", "All 5 challenge types"],
  team:  ["Everything in Pro", "Private team leaderboard", "Manager dashboard", "Assign custom challenges", "Team progress analytics"],
};

// ── Challenge data ─────────────────────────────────────────────────────────
const CHALLENGES = {
  B2B: [
    { tag: "Prioritization", color: "#6366F1", icon: "P", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "RICE or MoSCoW", steps: ["Name your framework and justify the choice","Score each backlog item — don't just list them","Address the compliance deadline and churn risk explicitly","End with a ranked list and what gets cut if capacity runs out"], watch: "Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt: `B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag: "Metrics", color: "#3B82F6", icon: "📊", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "Diagnose → Hypothesize → Measure", steps: ["Describe what you observe in the data first","Generate 2-3 root cause hypotheses","Identify what data is missing","Define 2-3 metrics you'd add to the dashboard"], watch: "Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt: `B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag: "Stakeholder", color: "#10B981", icon: "S", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "Understand → Align → Decide", steps: ["Find what each stakeholder truly wants beneath their stated position","Spot any shared goals or constraints","Make a concrete decision — don't sit on the fence","State who gets which message and how"], watch: "PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt: `B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag: "Strategy", color: "#8B5CF6", icon: "T", xp: 150, difficulty: "Hard", time: "15 min", type: "case_study",
      hint: { framework: "Situation → Options → Recommendation", steps: ["Summarize the core tension in 1-2 sentences","Name 2-3 strategic options","Pick one and defend it with business reasoning","Explicitly state what you would NOT do and why"], watch: "Every strategy needs a trade-off. What are you giving up?" },
      prompt: `B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag: "Execution", color: "#F59E0B", icon: "E", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "Triage → Communicate → Adapt", steps: ["What is most critical in the next 2 hours?","Who do you talk to and in what order?","What do you cut or defer?","How do you run the retrospective after?"], watch: "Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt: `B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
    { tag: "Estimation", color: "#EF4444", icon: "Est", xp: 150, difficulty: "Hard", time: "15 min", type: "estimation",
      hint: { framework: "Fermi Estimation", steps: ["Break the problem into components","Estimate each component independently","Sanity-check your answer against known benchmarks","State your assumptions clearly"], watch: "The method matters more than the number. Show your logic." },
      prompt: `B2B market sizing Fermi challenge for a junior PM. Ask them to estimate the total addressable market for a B2B SaaS tool in India (e.g., project management, HR software, or CRM). Provide some anchor data points. Ask them to break down their reasoning step by step. Be concise.` },
    { tag: "Roleplay", color: "#06B6D4", icon: "RP", xp: 150, difficulty: "Hard", time: "15 min", type: "roleplay",
      hint: { framework: "Navigate Without Authority", steps: ["Understand the stakeholder's underlying concern","Find common ground before disagreeing","Propose a data-driven path forward","Commit to a next step with a timeline"], watch: "You cannot command. You must influence. Lead with empathy, end with clarity." },
      prompt: `B2B roleplay: You are a PM. I am a senior engineer who believes the roadmap is wrong and is threatening to escalate to the CTO. I think the feature you're pushing is technically risky and will create 6 months of debt. You need to navigate this without formal authority. Generate the opening scenario and ask the PM how they respond. Be concise.` },
    { tag: "Debate", color: "#F97316", icon: "D", xp: 150, difficulty: "Hard", time: "15 min", type: "debate",
      hint: { framework: "Argue a Position", steps: ["State your position clearly in the first sentence","Use 2-3 specific, concrete arguments","Acknowledge the strongest counterargument","Reinforce your conclusion"], watch: "Fence-sitting loses debates. Pick a side and defend it with conviction." },
      prompt: `B2B debate challenge: The motion is "B2B PMs should write technical specs, not just PRDs." Ask the user to argue FOR this position with specific reasoning. Evaluate the strength of their argument, not just whether they agree. Be concise.` },
  ],
  B2C: [
    { tag: "Prioritization", color: "#6366F1", icon: "P", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "RICE or Impact vs Effort", steps: ["State your framework and why it fits B2C","Consider user volume, engagement, and retention for each item","Factor in competitor timing and seasonal context","Give a final ranked order and what gets cut"], watch: "B2C is about user love at scale. Delight is a valid business metric." },
      prompt: `B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag: "Metrics", color: "#3B82F6", icon: "📊", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "AARRR Funnel", steps: ["Map each metric to its funnel stage","Identify the biggest drop-off point","Form 2-3 hypotheses for the drop-off","Pick one metric to fix first and defend the choice"], watch: "Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt: `B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag: "Growth", color: "#10B981", icon: "G", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "Growth Loops", steps: ["Identify which growth loop is broken or missing","Pick ONE lever to pull — don't try to fix everything","Define how you'd measure if your fix worked","Estimate the impact in user numbers or revenue"], watch: "Growth is a system. Fix the loop. Don't just add features." },
      prompt: `B2C growth challenge for a junior PM. Consumer app growth has plateaued with fake metrics showing the problem and limited engineering capacity. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag: "User Research", color: "#8B5CF6", icon: "UR", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "Jobs To Be Done", steps: ["Identify the job each user hires the product to do","Find the gap between expectation and experience","Separate genuine pain points from nice-to-haves","Recommend what to build and what to ignore"], watch: "Focus on what users DO, not what they SAY. Behaviour beats words." },
      prompt: `B2C user research challenge for a junior PM. 3 user types giving conflicting qualitative feedback on the same feature area. Ask: synthesize the feedback and decide what to build. Be concise.` },
    { tag: "Execution", color: "#F59E0B", icon: "E", xp: 50, difficulty: "Medium", time: "10 min", type: "quiz",
      hint: { framework: "Triage → Communicate → Ship", steps: ["What is breaking user experience RIGHT NOW?","Hotfix immediately or wait for proper fix — pick one and justify","Communicate to users if the issue is visible to them","Define what resolved looks like and how you'll confirm it"], watch: "B2C crises are public. Users tweet. Think about user communication, not just internal teams." },
      prompt: `B2C app execution crisis for a junior PM. Consumer-facing incident with public user impact and social media pressure, engineering says 4 hours to fix. Ask: how does the PM handle this step by step? Be concise.` },
    { tag: "Estimation", color: "#EF4444", icon: "Est", xp: 150, difficulty: "Hard", time: "15 min", type: "estimation",
      hint: { framework: "Fermi Estimation", steps: ["Break the problem into components","Estimate each component independently","Sanity-check your answer against known benchmarks","State your assumptions clearly"], watch: "The method matters more than the number. Show your logic." },
      prompt: `B2C market sizing Fermi challenge for a junior PM. Ask them to estimate the number of daily active users a food delivery app in a Tier-1 Indian city could realistically achieve in year 2. Provide some anchor data points about the city. Ask them to break down their reasoning step by step. Be concise.` },
    { tag: "Roleplay", color: "#06B6D4", icon: "RP", xp: 150, difficulty: "Hard", time: "15 min", type: "roleplay",
      hint: { framework: "Navigate Without Authority", steps: ["Understand the stakeholder's underlying concern","Find common ground before disagreeing","Propose a data-driven path forward","Commit to a next step with a timeline"], watch: "You cannot command. You must influence. Lead with empathy, end with clarity." },
      prompt: `B2C roleplay: You are a PM at a consumer app. I am a data scientist who insists the A/B test you want to run is statistically invalid and will produce misleading results. I'm refusing to help set it up. You need to convince me or find another path. Generate the opening scenario and ask the PM how they respond. Be concise.` },
    { tag: "Debate", color: "#F97316", icon: "D", xp: 150, difficulty: "Hard", time: "15 min", type: "debate",
      hint: { framework: "Argue a Position", steps: ["State your position clearly in the first sentence","Use 2-3 specific, concrete arguments","Acknowledge the strongest counterargument","Reinforce your conclusion"], watch: "Fence-sitting loses debates. Pick a side and defend it with conviction." },
      prompt: `B2C debate challenge: The motion is "B2C PMs should prioritize retention over acquisition in year 1." Ask the user to argue FOR this position with specific reasoning. Evaluate the strength of their argument, not just whether they agree. Be concise.` },
  ]
};

const CHALLENGE_TYPE_LABELS = {
  quiz: "Quiz",
  case_study: "Case Study",
  estimation: "Estimation",
  roleplay: "Roleplay",
  debate: "Debate",
};

const ASSESS_SYSTEM = `You are a direct PM coach for a junior PM (0-2 years). Be honest, specific, encouraging. For Roleplay and Debate challenges, evaluate the quality of their response as if you are a senior PM interviewer.

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
    --color-bg: #FAFBFC;
    --color-surface: #FFFFFF;
    --color-border: #E8EAED;
    --color-border-strong: #D9DCE0;

    --color-text-primary: #1A1A1A;
    --color-text-secondary: #525252;
    --color-text-tertiary: #A0A0A0;
    --color-text-inverse: #FFFFFF;

    --color-accent: #5B5BFF;
    --color-accent-hover: #4A4AE8;
    --color-accent-light: #F0F0FF;
    --color-accent-border: #D9D9FF;

    --color-success: #0D8B4F;
    --color-success-light: #EEF9F5;
    --color-success-border: #B3E5D1;

    --color-warning: #D97706;
    --color-warning-light: #FEF6E8;
    --color-warning-border: #FDD9A3;

    --color-error: #DC2626;
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
    --font-size-xs: 12px;
    --font-size-sm: 14px;
    --font-size-base: 16px;
    --font-size-md: 17px;
    --font-size-lg: 20px;
    --font-size-xl: 24px;
    --font-size-2xl: 32px;
    --font-size-3xl: 40px;

    /* Radius */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 24px;
    --radius-full: 9999px;

    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --shadow-lg: 0 12px 24px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 40px rgba(0,0,0,0.12);

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
    line-height: 1.7;
    letter-spacing: -0.005em;
  }

  ::selection { background: var(--color-accent-light); color: var(--color-accent); }
  input, textarea, button, select { font-family: var(--font-family); }
  textarea { outline: none; resize: vertical; }
  input { outline: none; }
  button { cursor: pointer; border: none; }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes popIn {
    0%   { transform: scale(0.95); opacity: 0; }
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

  .anim-fade-up   { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-1 { animation: fadeUp 0.5s 0.08s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-2 { animation: fadeUp 0.5s 0.16s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-3 { animation: fadeUp 0.5s 0.24s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fade-up-4 { animation: fadeUp 0.5s 0.32s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-pop-in    { animation: popIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-slide-down { animation: slideDown 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .spinner        { animation: spin 0.8s linear infinite; }

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
    padding: 0 var(--space-6);
  }
  .content-container-sm {
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
    padding: 0 var(--space-6);
  }

  /* ── Topbar ── */
  .topbar {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
    background: rgba(255,255,255,0.95);
  }
  .topbar-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-4) var(--space-6);
    display: flex;
    align-items: center;
    gap: var(--space-4);
    height: 60px;
  }
  .logo-mark {
    width: 36px;
    height: 36px;
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
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-weight: 600;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
    white-space: nowrap;
    font-size: var(--font-size-sm);
    padding: 10px var(--space-4);
    letter-spacing: -0.01em;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary {
    background: var(--color-text-primary);
    color: var(--color-text-inverse);
  }
  .btn-primary:hover:not(:disabled) { background: #2A2A2A; }
  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--color-bg); border-color: var(--color-border-strong); }
  .btn-accent {
    background: var(--color-accent);
    color: var(--color-text-inverse);
  }
  .btn-accent:hover:not(:disabled) { background: var(--color-accent-hover); }
  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
  }
  .btn-ghost:hover:not(:disabled) { background: var(--color-bg); color: var(--color-text-primary); }
  .btn-lg { padding: 12px var(--space-5); font-size: var(--font-size-base); }
  .btn-sm { padding: 8px var(--space-3); font-size: var(--font-size-xs); }
  .btn-full { width: 100%; }

  /* ── Inputs ── */
  .input {
    width: 100%;
    padding: 11px var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    background: var(--color-surface);
    transition: border-color var(--transition-base);
    line-height: 1.6;
  }
  .input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-light); }
  .input-error { border-color: var(--color-error) !important; }
  .label {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }
  .field-error {
    font-size: 13px;
    color: var(--color-error);
    margin-top: var(--space-2);
  }

  /* ── Badges ── */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    letter-spacing: 0.01em;
    white-space: nowrap;
  }
  .badge-accent  { background: var(--color-accent-light);   color: var(--color-accent); }
  .badge-success { background: var(--color-success-light);  color: var(--color-success); }
  .badge-warning { background: var(--color-warning-light);  color: #92400E; }
  .badge-error   { background: var(--color-error-light);    color: var(--color-error); }
  .badge-neutral { background: var(--color-bg);             color: var(--color-text-secondary); border: 1px solid var(--color-border); }

  /* ── Divider ── */
  .divider {
    height: 1px;
    background: var(--color-border);
    margin: var(--space-5) 0;
  }

  /* ── Progress ── */
  .progress-track {
    height: 8px;
    background: var(--color-bg);
    border-radius: var(--radius-full);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }
  .progress-fill {
    height: 100%;
    background: var(--color-text-primary);
    border-radius: var(--radius-full);
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Skeleton ── */
  .skeleton {
    background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  th {
    padding: 14px var(--space-4);
    text-align: left;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-tertiary);
    border-bottom: 1px solid var(--color-border);
    letter-spacing: 0.03em;
    text-transform: uppercase;
    word-break: break-word;
  }
  td {
    padding: 14px var(--space-4);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-primary);
    vertical-align: middle;
    font-size: var(--font-size-sm);
    line-height: 1.6;
    word-break: break-word;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-bg); }
  @media (max-width: 768px) {
    th, td { padding: 12px 10px; font-size: 13px; }
    table { font-size: 13px; }
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
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
    padding: 13px var(--space-5);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    animation: toastIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    white-space: nowrap;
  }

  /* ── Track tabs ── */
  .track-tab {
    padding: 9px var(--space-4);
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
    padding: var(--space-5);
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
    transform: translateY(-2px);
  }
  .challenge-node.node-active {
    border-color: var(--color-accent-border);
    background: var(--color-accent-light);
  }
  .challenge-node.node-active:hover {
    border-color: var(--color-accent);
    box-shadow: 0 8px 20px rgba(91,91,255,0.15);
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
    border: 1px solid var(--color-border);
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
    line-height: 1.6;
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
    padding: var(--space-3) 0;
    align-items: flex-start;
  }
  .hint-step-num {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--color-warning-light);
    border: 1px solid var(--color-warning-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #92400E;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* ── Star buttons ── */
  .star-btn {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    font-size: 20px;
    cursor: pointer;
    transition: all var(--transition-base);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .star-btn:hover { border-color: var(--color-warning); background: var(--color-warning-light); }
  .star-btn.active { border-color: var(--color-warning); background: var(--color-warning-light); }

  /* ── Streak counter ── */
  .streak-counter {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    background: var(--color-warning-light);
    border: 1px solid var(--color-warning-border);
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: #92400E;
  }

  /* ── Leaderboard ── */
  .lb-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 12px var(--space-3);
    border-radius: var(--radius-md);
    transition: background var(--transition-base);
  }
  .lb-row:hover { background: var(--color-bg); }
  .lb-row.lb-me {
    background: var(--color-accent-light);
    border: 1px solid var(--color-accent-border);
    position: sticky;
    bottom: 0;
  }
  .lb-rank {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  /* ── Pricing cards ── */
  .pricing-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    background: var(--color-surface);
    transition: all var(--transition-base);
    cursor: pointer;
  }
  .pricing-card:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-md); }
  .pricing-card.selected { border-color: var(--color-accent); background: var(--color-accent-light); }

  /* ── Nav tabs ── */
  .nav-tab {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 9px var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-base);
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
  }
  .nav-tab:hover { background: var(--color-bg); color: var(--color-text-primary); }
  .nav-tab.active { background: var(--color-accent-light); color: var(--color-accent); }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .content-container, .content-container-sm {
      padding: 0 var(--space-5);
    }
    .topbar-inner {
      padding: var(--space-4) var(--space-5);
      gap: var(--space-2);
    }
    .card { padding: var(--space-5); }
    .btn { padding: 10px var(--space-3); font-size: var(--font-size-xs); }
    .btn-lg { padding: 11px var(--space-4); font-size: var(--font-size-sm); }
  }
  @media (max-width: 640px) {
    .hide-mobile { display: none !important; }
    .stack-mobile { flex-direction: column !important; }
    .full-mobile { width: 100% !important; }
    .content-container, .content-container-sm {
      padding: 0 var(--space-4);
    }
    .topbar-inner {
      padding: var(--space-3) var(--space-4);
      gap: var(--space-2);
      height: auto;
      flex-wrap: wrap;
    }
    .logo-text { font-size: 14px; }
    .card { padding: var(--space-4); }
    .btn { padding: 9px var(--space-3); font-size: var(--font-size-xs); }
    .btn-lg { padding: 10px var(--space-3); font-size: var(--font-size-xs); }
    .challenge-node { flex-direction: column; gap: var(--space-3); }
    .mcq-option { padding: var(--space-3) var(--space-4); font-size: var(--font-size-xs); }
    .badge { font-size: 11px; padding: 4px 10px; }
    .streak-counter { font-size: 11px; padding: 5px 10px; }
    table { font-size: 12px; }
    th, td { padding: 10px 8px; }
    .lb-row { padding: 10px var(--space-2); gap: var(--space-2); }
    .lb-rank { width: 28px; height: 28px; font-size: 12px; }
    .pricing-card { padding: var(--space-4); }
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
      <div key={key} style={{ overflowX: "auto", margin: "var(--space-5) 0", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
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
      result.push(<div key={i} style={{ height: "var(--space-4)" }} />);
    } else if (line.startsWith("### ")) {
      result.push(<h3 key={i} style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", margin: "var(--space-5) 0 var(--space-3)", lineHeight: 1.5 }}>{inlineFormat(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      result.push(<h2 key={i} style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", margin: "var(--space-6) 0 var(--space-4)", lineHeight: 1.4 }}>{inlineFormat(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      result.push(<h1 key={i} style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-text-primary)", margin: "var(--space-6) 0 var(--space-4)", lineHeight: 1.3 }}>{inlineFormat(line.slice(2))}</h1>);
    } else if (line.match(/^[-*] /)) {
      result.push(
        <div key={i} style={{ display: "flex", gap: "var(--space-3)", margin: "var(--space-2) 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--color-accent)", fontWeight: 700, marginTop: 3, flexShrink: 0 }}>·</span>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\./)[1];
      result.push(
        <div key={i} style={{ display: "flex", gap: "var(--space-3)", margin: "var(--space-2) 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--color-accent)", fontWeight: 700, minWidth: 22, fontSize: "var(--font-size-sm)", marginTop: 2, flexShrink: 0 }}>{num}.</span>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{inlineFormat(line.replace(/^\d+\.\s*/, ""))}</span>
        </div>
      );
    } else {
      result.push(<p key={i} style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.8, margin: "var(--space-2) 0" }}>{inlineFormat(line)}</p>);
    }
  });

  if (inTable) flushTable("t_end");
  return result;
}

function renderMD(text, isKey = false) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: "var(--space-3)" }} />;
    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      return (
        <p key={i} style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-primary)", margin: "var(--space-5) 0 var(--space-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {line.replace(/\*\*/g, "")}
        </p>
      );
    }
    if (line.startsWith("━")) {
      return <div key={i} style={{ height: 1, background: "var(--color-border)", margin: "var(--space-3) 0" }} />;
    }
    if (line.match(/^[-*] /)) {
      return (
        <div key={i} style={{ display: "flex", gap: "var(--space-2)", margin: "var(--space-2) 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--color-accent)", fontWeight: 700, marginTop: 3, flexShrink: 0, fontSize: 10 }}>●</span>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    }
    return (
      <p key={i} style={{ fontSize: "var(--font-size-sm)", color: isKey ? "var(--color-text-primary)" : "var(--color-text-secondary)", lineHeight: 1.8, margin: "var(--space-2) 0" }}>
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
    <div style={{ marginBottom: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
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
      <div className="skeleton" style={{ height: 22, width: "40%", marginBottom: "var(--space-5)" }} />
      <div className="skeleton" style={{ height: 15, width: "100%", marginBottom: "var(--space-3)" }} />
      <div className="skeleton" style={{ height: 15, width: "95%", marginBottom: "var(--space-3)" }} />
      <div className="skeleton" style={{ height: 15, width: "88%", marginBottom: "var(--space-6)" }} />
      <div className="skeleton" style={{ height: 15, width: "100%", marginBottom: "var(--space-3)" }} />
      <div className="skeleton" style={{ height: 15, width: "92%", marginBottom: "var(--space-3)" }} />
      <div className="skeleton" style={{ height: 15, width: "75%", marginBottom: "var(--space-8)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-md)" }} />
        ))}
      </div>
    </div>
  );
}

// ── Path node component ────────────────────────────────────────────────────
function PathNode({ challenge, idx, status, onClick }) {
  const statusConfig = {
    active: { label: "Start", badgeClass: "badge-accent" },
    done:   { label: "Done",  badgeClass: "badge-success" },
    locked: { label: "Locked", badgeClass: "badge-neutral" },
  };
  const cfg = statusConfig[status];
  const typeLabel = CHALLENGE_TYPE_LABELS[challenge.type] || "Challenge";
  const diffColor = challenge.difficulty === "Hard" ? "var(--color-error)" : "var(--color-warning)";

  return (
    <button
      className={`challenge-node node-${status}`}
      onClick={status !== "locked" ? onClick : undefined}
      style={{ cursor: status === "locked" ? "not-allowed" : "pointer" }}
    >
      {/* Icon badge */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "var(--radius-md)",
        background: status === "done" ? "var(--color-success-light)" : status === "active" ? "var(--color-accent-light)" : "var(--color-bg)",
        border: `1px solid ${status === "done" ? "var(--color-success-border)" : status === "active" ? "var(--color-accent-border)" : "var(--color-border)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        flexShrink: 0,
        color: status === "done" ? "var(--color-success)" : "var(--color-text-primary)",
        fontWeight: 700,
      }}>
        {status === "done" ? "✓" : challenge.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--font-size-base)", fontWeight: 600, color: "var(--color-text-primary)" }}>
            {challenge.tag}
          </span>
          <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
          <span className="badge badge-neutral">{typeLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            {status === "locked" ? "Complete the previous challenge to unlock" : `${challenge.hint?.framework || "Framework-based"} · ${challenge.time}`}
          </p>
          {challenge.difficulty === "Hard" && (
            <span style={{ fontSize: 12, color: diffColor, fontWeight: 700 }}>3× XP</span>
          )}
        </div>
      </div>

      {/* XP + Arrow */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-warning)", background: "var(--color-warning-light)", padding: "3px 10px", borderRadius: "var(--radius-sm)" }}>+{challenge.xp} XP</span>
        {status !== "locked" && (
          <div style={{ color: "var(--color-text-tertiary)", fontSize: 16 }}>→</div>
        )}
      </div>
    </button>
  );
}

// ── Leaderboard data helpers ───────────────────────────────────────────────
function buildLeaderboard(myName, myXP, myTrack) {
  const fakeUsers = [
    { name: "Priya S.", xp: 1840, track: "B2B", badge: "1" },
    { name: "Arjun M.", xp: 1620, track: "B2C", badge: "2" },
    { name: "Neha K.", xp: 1450, track: "B2B", badge: "3" },
    { name: "Rohan D.", xp: 1280, track: "B2C", badge: null },
    { name: "Sneha P.", xp: 1100, track: "B2B", badge: null },
    { name: "Vikram R.", xp: 980,  track: "B2C", badge: null },
    { name: "Ananya T.", xp: 820,  track: "B2B", badge: null },
    { name: "Karan B.", xp: 740,   track: "B2C", badge: null },
    { name: "Meera J.", xp: 610,   track: "B2B", badge: null },
    { name: "Dev S.",   xp: 530,   track: "B2C", badge: null },
  ];

  const me = { name: myName || "You", xp: myXP || 0, track: myTrack || "B2B", isMe: true };
  const all = [...fakeUsers, me].sort((a, b) => b.xp - a.xp);
  const myRank = all.findIndex(u => u.isMe) + 1;
  return { entries: all, myRank };
}

// ── Friend challenge helpers ───────────────────────────────────────────────
function buildFriendChallenges() {
  const stored = storageGet("pm_friend_challenges");
  return stored ? JSON.parse(stored.value) : [];
}

function saveFriendChallenge(fc) {
  const existing = buildFriendChallenges();
  existing.push(fc);
  storageSet("pm_friend_challenges", JSON.stringify(existing));
}

// ── Streak helpers ─────────────────────────────────────────────────────────
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function getStreakData() {
  const streak = parseInt(storageGet("pm_streak")?.value || "0");
  const lastDate = storageGet("pm_last_date")?.value || "";
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const isAlive = lastDate === today || lastDate === yesterday;
  return { streak: isAlive ? streak : 0, lastDate, today };
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PMApp() {
  const [screen, setScreen] = useState("login");
  const [homeTab, setHomeTab] = useState("challenges");
  const [isGuest, setIsGuest] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [track, setTrack] = useState("B2B");
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
    return { B2B: parsed.B2B || [], B2C: parsed.B2C || [] };
  });
  const [totalXP, setTotalXP] = useState(() => {
    const s = storageGet("pm_xp");
    return s ? parseInt(s.value) : 0;
  });
  const [streak, setStreak] = useState(0);
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

  const [openAnswer, setOpenAnswer] = useState("");

  const [friendChallenges, setFriendChallenges] = useState([]);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendInput, setFriendInput] = useState("");
  const [friendChallengeIdx, setFriendChallengeIdx] = useState(null);
  const [friendChallengeTrack, setFriendChallengeTrack] = useState("B2B");

  const [lbFilter, setLbFilter] = useState("global");

  const [fbName, setFbName] = useState("");
  const [fbAge, setFbAge] = useState("");
  const [fbIndustry, setFbIndustry] = useState("");
  const [fbYears, setFbYears] = useState("");
  const [fbRole, setFbRole] = useState("");
  const [fbTrackPref, setFbTrackPref] = useState("");
  const [fbComment, setFbComment] = useState("");
  const [fbUseful, setFbUseful] = useState(0);
  const [fbEasy, setFbEasy] = useState("");
  const [fbImprove, setFbImprove] = useState("");
  const [fbPricingTier, setFbPricingTier] = useState("");
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
    const { streak: s } = getStreakData();
    setStreak(s);
    setFriendChallenges(buildFriendChallenges());
    requestNotificationPermission();
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
    if (!chosen) {
      showToast("Challenge not found.", "error");
      return;
    }
    setPick(chosen); setCurrentIdx(idx); setHintOpen(false);
    setLoading(true); setError("");
    setChallengeText(""); setAnswer(""); setOpenAnswer("");
    setMcqOptions([]); setMcqSelected(null); setMcqRevealed(false); setMcqCorrect(null);
    setScreen("challenge");
    try {
      const text = await callClaude(`You are a ${track} PM coach. Generate a concise, realistic, specific challenge.`, chosen.prompt);
      if (!text || text.trim().length === 0) {
        throw new Error("Failed to generate challenge text");
      }
      setChallengeText(text);

      if (chosen.type === "quiz") {
        try {
          const mcqRaw = await callClaude(
            "You are a PM quiz generator. Reply with valid JSON only, no markdown, no extra text.",
            `Based on this PM challenge, generate exactly 4 multiple choice answers. One must be correct, three plausible but wrong. Mix the correct answer randomly among the 4 positions.

Reply ONLY with this JSON structure (no other text):
{"correct":"the correct answer text here","options":["option 1","option 2","option 3","option 4"]}

The correct answer must appear exactly as written in the options array.

Challenge: ${text}`
          );
          if (!mcqRaw || mcqRaw.trim().length === 0) {
            throw new Error("Empty MCQ response");
          }
          const clean = mcqRaw.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          if (!parsed.options || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
            throw new Error("Invalid MCQ options format");
          }
          if (!parsed.correct || typeof parsed.correct !== "string") {
            throw new Error("Invalid correct answer");
          }
          setMcqOptions(parsed.options);
          setMcqCorrect(parsed.correct);
        } catch (e) {
          console.error("MCQ generation error:", e);
          setMcqOptions([]); setMcqCorrect(null);
        }
      }
    } catch (e) {
      console.error("Challenge loading error:", e);
      setError(e.message || "Failed to load challenge");
      showToast("Failed to load challenge. Please try again.", "error");
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  async function submitAnswer(chosenOption) {
    const answerText = chosenOption || openAnswer || answer;
    if (!answerText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await callClaude(ASSESS_SYSTEM,
        `TRACK: ${track}\nTYPE: ${pick?.tag}\nCHALLENGE TYPE: ${pick?.type}\n\nCHALLENGE:\n${challengeText}\n\nSELECTED/WRITTEN ANSWER:\n${answerText}\n\nCORRECT ANSWER (if MCQ):\n${mcqCorrect || "N/A"}`);
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
    storageSet(`pm_session:${Date.now()}`, JSON.stringify({ date: today, tag: pick?.tag, track, scores: s, type: pick?.type }));

    const lastDate = storageGet("pm_last_date")?.value || "";
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streakR = storageGet("pm_streak");
    let cur = parseInt(streakR?.value || "0");
    if (lastDate === yesterday) cur += 1;
    else if (lastDate !== today) cur = 1;
    storageSet("pm_streak", String(cur));
    storageSet("pm_last_date", today);
    setStreak(cur);

    if ("Notification" in window && Notification.permission === "granted") {
      if (cur === 7) {
        new Notification("7-day streak!", { body: "You're in the top 12% of learners this week." });
      } else if (cur > 0 && cur % 5 === 0) {
        new Notification(`${cur}-day streak!`, { body: "Keep the momentum going. Come back tomorrow." });
      }
    }

    if (!isGuest) {
      const updated = { ...completedIdxs, [track]: [...new Set([...completedIdxs[track], currentIdx])] };
      setCompletedIdxs(updated);
      storageSet("pm_completed", JSON.stringify(updated));
      const xpMultiplier = pick?.difficulty === "Hard" ? 3 : 1;
      const gained = (10 + (s.overall * 5)) * xpMultiplier;
      const newXP = totalXP + gained;
      setTotalXP(newXP);
      storageSet("pm_xp", String(newXP));
    }
    const ns = { date: today, tag: pick?.tag, track, scores: s, type: pick?.type };
    setHistory(prev => [ns, ...prev].slice(0, 30));
  }

  // ── Friend Challenge ──
  function sendFriendChallenge() {
    if (!friendInput.trim()) return;
    const ch = CHALLENGES[friendChallengeTrack][friendChallengeIdx];
    const fc = {
      id: Date.now(),
      to: friendInput.trim(),
      from: isGuest ? guestName : "Siddhant",
      track: friendChallengeTrack,
      challengeTag: ch.tag,
      challengeIdx: friendChallengeIdx,
      status: "pending",
      sentAt: today,
    };
    saveFriendChallenge(fc);
    setFriendChallenges(buildFriendChallenges());
    setShowFriendModal(false);
    setFriendInput("");
    if (!isGuest) {
      const newXP = totalXP + 20;
      setTotalXP(newXP);
      storageSet("pm_xp", String(newXP));
    }
    showToast("Challenge sent! You earned +20 XP for inviting.", "success");
  }

  async function submitGuestFeedback() {
    if (fbUseful === 0) return;
    setFbSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fbName || guestName || "Guest",
          age: fbAge || guestAge,
          industry: fbIndustry || guestIndustry,
          experience: fbYears || guestExp,
          role: fbRole,
          trackPreference: fbTrackPref,
          rating: fbUseful,
          easyToUse: fbEasy,
          comment: fbComment,
          improve: fbImprove,
          pricingTier: fbPricingTier,
          sessions: 1,
        })
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

  const challenges = CHALLENGES[track];
  const doneCount = completedIdxs[track]?.length || 0;
  const pct = challenges.length > 0 ? Math.round((doneCount / challenges.length) * 100) : 0;
  const { entries: lbEntries, myRank } = buildLeaderboard(isGuest ? guestName : "Siddhant", totalXP, track);

  const filteredLbEntries = lbFilter === "track"
    ? lbEntries.filter(e => e.track === track || e.isMe)
    : lbEntries;

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: LOGIN
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "login" && !showGuestForm) return (
    <div className="page-container" style={{ background: "var(--color-bg)" }}>
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-10) var(--space-6)" }}>

        {/* Hero */}
        <div className="anim-fade-up" style={{ textAlign: "center", marginBottom: "var(--space-12)", maxWidth: 480 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "var(--radius-lg)",
            background: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto var(--space-8)", boxShadow: "var(--shadow-lg)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-4)", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            PM Academy
          </h1>
          <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: 1.8, maxWidth: 380, margin: "0 auto" }}>
            Real-world scenarios. AI-powered feedback. Build the instincts of a senior PM.
          </p>
        </div>

        {/* Login card */}
        <div className="card anim-fade-up-1" style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Sign in</h2>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>Enter your access code to continue</p>
          </div>

          <div style={{ marginBottom: "var(--space-5)" }}>
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
            style={{ marginBottom: "var(--space-4)" }}
          >
            {pwLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                Signing in…
              </span>
            ) : "Sign in"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", margin: "var(--space-5) 0" }}>
            <div className="divider" style={{ flex: 1, margin: 0 }} />
            <span style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontWeight: 500 }}>or</span>
            <div className="divider" style={{ flex: 1, margin: 0 }} />
          </div>

          <button className="btn btn-secondary btn-lg btn-full" onClick={loginGuest}>
            Try a free challenge
          </button>
        </div>

        {/* Social proof */}
        <div className="anim-fade-up-2" style={{ marginTop: "var(--space-12)", display: "flex", gap: "var(--space-10)", textAlign: "center" }}>
          {[
            { value: "16", label: "Challenges" },
            { value: "2", label: "Tracks" },
            { value: "5", label: "Challenge Types" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontWeight: 500, marginTop: 4 }}>{s.label}</div>
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

      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">PM Academy</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => { setShowGuestForm(false); setIsGuest(false); }}>
            Back
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-10) var(--space-6)" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div className="anim-fade-up" style={{ marginBottom: "var(--space-10)" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-3)", letterSpacing: "-0.03em" }}>
              Quick intro
            </h1>
            <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              This helps us tailor the challenge and feedback to you.
            </p>
          </div>

          <div className="card anim-fade-up-1">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div>
                <label className="label">Full name</label>
                <input className="input" placeholder="e.g. Alex Johnson" value={guestName} onChange={e => { setGuestName(e.target.value); setGuestFormErr(""); }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div>
                  <label className="label">Age</label>
                  <input className="input" placeholder="e.g. 28" value={guestAge} onChange={e => { setGuestAge(e.target.value); setGuestFormErr(""); }} />
                </div>
                <div>
                  <label className="label">Experience</label>
                  <input className="input" placeholder="e.g. 2 years" value={guestExp} onChange={e => { setGuestExp(e.target.value); setGuestFormErr(""); }} />
                </div>
              </div>
              <div>
                <label className="label">Industry</label>
                <input className="input" placeholder="e.g. SaaS, FinTech, Healthcare" value={guestIndustry} onChange={e => { setGuestIndustry(e.target.value); setGuestFormErr(""); }} />
              </div>
            </div>

            {guestFormErr && (
              <div style={{ marginTop: "var(--space-5)", padding: "12px var(--space-4)", background: "var(--color-error-light)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-error)" }}>
                {guestFormErr}
              </div>
            )}

            <button className="btn btn-primary btn-lg btn-full" style={{ marginTop: "var(--space-6)" }} onClick={submitGuestProfile}>
              Start my free challenge
            </button>
          </div>

          <p className="anim-fade-up-2" style={{ marginTop: "var(--space-5)", textAlign: "center", fontSize: 13, color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
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

      {/* Friend Challenge Modal */}
      {showFriendModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
          <div className="card anim-pop-in" style={{ width: "100%", maxWidth: 460 }}>
            <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>Challenge a friend</h3>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", marginBottom: "var(--space-6)", lineHeight: 1.7 }}>
              Both complete it independently within 24 hours. Winner gets full XP + 20% bonus. You earn +20 XP just for sending.
            </p>

            <div style={{ marginBottom: "var(--space-5)" }}>
              <label className="label">Select track</label>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {["B2B", "B2C"].map(t => (
                  <button key={t} className={`btn ${friendChallengeTrack === t ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => { setFriendChallengeTrack(t); setFriendChallengeIdx(null); }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "var(--space-5)" }}>
              <label className="label">Select challenge</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 200, overflowY: "auto" }}>
                {CHALLENGES[friendChallengeTrack].map((ch, i) => (
                  <button key={i} onClick={() => setFriendChallengeIdx(i)}
                    style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "12px var(--space-4)", borderRadius: "var(--radius-md)", border: `1px solid ${friendChallengeIdx === i ? "var(--color-accent)" : "var(--color-border)"}`, background: friendChallengeIdx === i ? "var(--color-accent-light)" : "var(--color-surface)", cursor: "pointer", textAlign: "left", fontSize: "var(--font-size-sm)" }}>
                    <span style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--color-bg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{ch.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{ch.tag}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>{CHALLENGE_TYPE_LABELS[ch.type]} · +{ch.xp} XP</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "var(--space-6)" }}>
              <label className="label">Friend's username or email</label>
              <input className="input" placeholder="e.g. priya@email.com or @priya_pm" value={friendInput} onChange={e => setFriendInput(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-ghost" onClick={() => { setShowFriendModal(false); setFriendInput(""); setFriendChallengeIdx(null); }}>Cancel</button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={!friendInput.trim() || friendChallengeIdx === null} onClick={sendFriendChallenge}>
                Send challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">PM Academy</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            {/* Streak counter */}
            {streak > 0 && (
              <div className="streak-counter">
                <span style={{ fontSize: 13 }}>🔥</span>
                <span style={{ fontWeight: 800 }}>{streak}</span>
              </div>
            )}
            {!isGuest && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontWeight: 500 }}>{totalXP}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>XP</span>
              </div>
            )}
            {isGuest && <span className="badge badge-neutral">Guest</span>}
            {!isGuest && (
              <button className="btn btn-ghost btn-sm" onClick={() => { storageSet("pm_auth", ""); setScreen("login"); setIsGuest(false); }} title="Sign out">
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: "var(--space-16)" }}>
        <div className="content-container" style={{ paddingTop: "var(--space-10)" }}>

          {/* Header */}
          <div className="anim-fade-up" style={{ marginBottom: "var(--space-8)" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-3)", letterSpacing: "-0.03em" }}>
              {isGuest ? `Welcome, ${guestName}` : "Your training path"}
            </h1>
            <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              {isGuest
                ? "Try a free challenge to see how AI-powered PM coaching works."
                : "Practice real scenarios. Get structured feedback. Build PM instincts."}
            </p>
          </div>

          {/* Nav tabs (full users only) */}
          {!isGuest && (
            <div className="anim-fade-up-1" style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-8)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-4)" }}>
              {[
                { id: "challenges", label: "Challenges" },
                { id: "leaderboard", label: "Leaderboard" },
                { id: "pricing", label: "Upgrade" },
              ].map(tab => (
                <button key={tab.id} className={`nav-tab ${homeTab === tab.id ? "active" : ""}`} onClick={() => setHomeTab(tab.id)}>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── TAB: CHALLENGES ── */}
          {(homeTab === "challenges" || isGuest) && (
            <>
              {/* Track selector */}
              {!isGuest && (
                <div className="anim-fade-up-1" style={{ marginBottom: "var(--space-8)" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-2)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", width: "fit-content" }}>
                    {["B2B", "B2C"].map(t => (
                      <button key={t} className={`track-tab ${track === t ? "active" : ""}`} onClick={() => setTrack(t)}>
                        {t === "B2B" ? "B2B SaaS" : "B2C Consumer"}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginTop: "var(--space-3)", lineHeight: 1.6 }}>
                    Both tracks are free to enter. Freemium limits apply on challenge volume.
                  </p>
                </div>
              )}

              {/* Progress bar (full users) */}
              {!isGuest && (
                <div className="card anim-fade-up-2" style={{ marginBottom: "var(--space-6)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
                    <div>
                      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                        {track === "B2B" ? "B2B SaaS Track" : "B2C Consumer Track"}
                      </div>
                      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                        {doneCount} of {challenges.length} challenges complete
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>{pct}%</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>complete</div>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: "var(--space-8)", marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--color-border)" }}>
                    {[
                      { value: totalXP, label: "Total XP" },
                      { value: history.length, label: "Sessions" },
                      { value: history.length > 0 ? `${history[0]?.scores?.overall ?? "—"}/10` : "—", label: "Last score" },
                    ].map((s, i) => (
                      <div key={i}>
                        <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500, marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friend challenge button (full users) */}
              {!isGuest && (
                <div className="anim-fade-up-2" style={{ marginBottom: "var(--space-5)" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowFriendModal(true)}>
                    Challenge a friend
                  </button>
                </div>
              )}

              {/* Pending friend challenges */}
              {!isGuest && friendChallenges.length > 0 && (
                <div className="card anim-fade-up-2" style={{ marginBottom: "var(--space-5)", borderColor: "var(--color-accent-border)", background: "var(--color-accent-light)" }}>
                  <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-accent)", marginBottom: "var(--space-4)" }}>
                    Friend challenges sent
                  </p>
                  {friendChallenges.slice(0, 3).map((fc, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "10px 0", borderBottom: i < Math.min(friendChallenges.length - 1, 2) ? "1px solid var(--color-accent-border)" : "none" }}>
                      <span style={{ fontSize: 13, color: "var(--color-accent)" }}>→</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>{fc.to}</span>
                        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}> · {fc.track} {fc.challengeTag} · {fc.sentAt}</span>
                      </div>
                      <span className="badge badge-warning">{fc.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Challenge path */}
              <div className="anim-fade-up-3">
                <div style={{ marginBottom: "var(--space-5)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {isGuest ? "Free challenge" : "Challenge path"}
                  </h2>
                  <span className="badge badge-neutral">{challenges.length} challenges</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  {(isGuest ? challenges.slice(0, 1) : challenges).map((ch, idx) => (
                    <div key={idx} className="anim-fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <PathNode challenge={ch} idx={idx} status={getStatus(idx)} onClick={() => openChallenge(idx)} />
                    </div>
                  ))}
                </div>

                {/* Guest upsell */}
                {isGuest && (
                  <div style={{ marginTop: "var(--space-6)", padding: "var(--space-6)", background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
                    <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>
                      Unlock all 16 challenges across B2B & B2C
                    </p>
                    <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                      5 challenge types · AI scoring · Streak tracking · Leaderboard
                    </p>
                  </div>
                )}
              </div>

              {/* Recent history */}
              {!isGuest && history.length > 0 && (
                <div className="card anim-fade-up-4" style={{ marginTop: "var(--space-8)" }}>
                  <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>Recent sessions</h3>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {history.slice(0, 5).map((s, i) => {
                      const sc = s.scores?.overall;
                      const scColor = sc >= 7 ? "var(--color-success)" : sc >= 5 ? "var(--color-warning)" : "var(--color-error)";
                      const allChallenges = CHALLENGES.B2B.concat(CHALLENGES.B2C);
                      const ch = allChallenges.find(x => x.tag === s.tag);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4) 0", borderBottom: i < Math.min(history.length - 1, 4) ? "1px solid var(--color-border)" : "none" }}>
                          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--color-bg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, fontWeight: 700 }}>
                            {ch?.icon || "C"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>{s.tag}</div>
                            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>{s.track} · {s.type ? CHALLENGE_TYPE_LABELS[s.type] : "Quiz"} · {s.date}</div>
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
                <div style={{ marginTop: "var(--space-8)", padding: "var(--space-10)", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ fontSize: 32, marginBottom: "var(--space-4)" }}>C</div>
                  <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>No sessions yet</p>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>Complete your first challenge to see your history here.</p>
                </div>
              )}
            </>
          )}

          {/* ── TAB: LEADERBOARD ── */}
          {homeTab === "leaderboard" && !isGuest && (
            <div className="anim-fade-up">
              <div style={{ marginBottom: "var(--space-6)" }}>
                <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "var(--space-2)" }}>Leaderboard</h2>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.7 }}>Weekly resets every Monday. Top 3 earn a profile badge.</p>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", padding: "var(--space-2)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", width: "fit-content" }}>
                {[
                  { id: "global", label: "Global" },
                  { id: "friends", label: "Friends" },
                  { id: "track", label: `${track} only` },
                ].map(f => (
                  <button key={f.id} className={`track-tab ${lbFilter === f.id ? "active" : ""}`} onClick={() => setLbFilter(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* My rank banner */}
              <div style={{ marginBottom: "var(--space-5)", padding: "var(--space-5) var(--space-6)", background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
                <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 900, color: "var(--color-accent)", letterSpacing: "-0.04em" }}>#{myRank}</div>
                <div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>Your current rank</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginTop: 2 }}>{totalXP} XP · {track} track</div>
                </div>
              </div>

              {/* Leaderboard list */}
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "var(--space-5) var(--space-6)", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Weekly rankings</span>
                </div>
                <div style={{ padding: "var(--space-3) var(--space-4)" }}>
                  {filteredLbEntries.map((entry, i) => {
                    const rank = i + 1;
                    const isMe = entry.isMe;
                    const rankColor = rank === 1 ? "#D97706" : rank === 2 ? "#9CA3AF" : rank === 3 ? "#B45309" : "var(--color-text-tertiary)";
                    return (
                      <div key={i} className={`lb-row ${isMe ? "lb-me" : ""}`}>
                        <div className="lb-rank" style={{ background: rank <= 3 ? "var(--color-warning-light)" : "var(--color-bg)", color: rankColor, border: `1px solid ${rank <= 3 ? "var(--color-warning-border)" : "var(--color-border)"}`, fontSize: 13 }}>
                          {rank}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: isMe ? 700 : 500, color: isMe ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                            {entry.name} {isMe && <span style={{ fontSize: 12, color: "var(--color-accent)" }}>(you)</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>{entry.track} track</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>{entry.xp}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>XP</div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Pinned "me" row if not in top entries */}
                  {myRank > filteredLbEntries.length && (
                    <>
                      <div style={{ padding: "6px var(--space-4)", textAlign: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>···</span>
                      </div>
                      <div className="lb-row lb-me">
                        <div className="lb-rank" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-border)", fontSize: 13 }}>
                          {myRank}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-accent)" }}>
                            Siddhant <span style={{ fontSize: 12 }}>(you)</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>{track} track</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>{totalXP}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>XP</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "var(--space-5)", padding: "var(--space-5) var(--space-6)", background: "var(--color-warning-light)", border: "1px solid var(--color-warning-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "#92400E", lineHeight: 1.7 }}>
                Hard challenges (Estimation, Roleplay, Debate) give 3× XP — complete them to climb faster.
              </div>
            </div>
          )}

          {/* ── TAB: PRICING ── */}
          {homeTab === "pricing" && !isGuest && (
            <div className="anim-fade-up">
              <div style={{ marginBottom: "var(--space-8)" }}>
                <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "var(--space-2)" }}>Upgrade your plan</h2>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.7 }}>Unlock unlimited challenges, friend battles, and team features.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                {Object.values(TIERS).map(tier => (
                  <div key={tier.id} className="pricing-card" style={{ borderColor: tier.id === "pro" ? "var(--color-accent)" : "var(--color-border)", background: tier.id === "pro" ? "var(--color-accent-light)" : "var(--color-surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-5)" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                          <span style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)" }}>{tier.label}</span>
                          {tier.id === "pro" && <span className="badge badge-accent">Most popular</span>}
                          {tier.id === "team" && <span className="badge badge-success">B2B revenue play</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: tier.color, letterSpacing: "-0.03em" }}>{tier.price}</span>
                          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>{tier.period}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {TIER_FEATURES[tier.id].map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                          <span style={{ color: "var(--color-success)", fontWeight: 700, fontSize: 13 }}>✓</span>
                          {f}
                        </div>
                      ))}
                    </div>
                    {tier.id !== "free" && (
                      <button className={`btn ${tier.id === "pro" ? "btn-primary" : "btn-secondary"} btn-lg btn-full`} style={{ marginTop: "var(--space-6)" }}>
                        {tier.id === "pro" ? "Upgrade to Pro" : "Contact for Team"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "var(--space-6)", padding: "var(--space-5) var(--space-6)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.8 }}>
                <strong style={{ color: "var(--color-text-primary)" }}>Streak freeze</strong> — Pro users get 1 streak freeze per month to protect their streak. The single highest-retention mechanic in EdTech.
              </div>
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

      <div className="topbar">
        <div className="topbar-inner">
          <button className="btn btn-ghost btn-sm" onClick={() => setScreen("home")}>
            Back
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>
              {pick?.tag}
            </span>
          </div>
          <div style={{ width: 40 }} />
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: "var(--space-16)" }}>
        <div className="content-container-sm" style={{ paddingTop: "var(--space-8)", paddingBottom: "var(--space-8)" }}>

          {/* Challenge header */}
          <div className="anim-fade-up" style={{ marginBottom: "var(--space-10)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
              <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "var(--color-accent)", flexShrink: 0 }}>
                {pick?.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "var(--space-2)", letterSpacing: "-0.02em" }}>
                  {pick?.tag}
                </h1>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  {pick?.difficulty} difficulty · {pick?.time} · {pick?.xp} XP
                </p>
              </div>
            </div>
          </div>

          {/* Challenge text */}
          {loading ? (
            <SkeletonChallenge />
          ) : error ? (
            <div style={{ padding: "var(--space-6)", background: "var(--color-error-light)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-lg)", color: "var(--color-error)", lineHeight: 1.7 }}>
              {error}
            </div>
          ) : (
            <div className="card anim-fade-up-1" style={{ marginBottom: "var(--space-8)", lineHeight: 1.8 }}>
              {renderChallenge(challengeText)}
            </div>
          )}

          {/* Hint accordion */}
          {pick?.hint && (
            <div className="card anim-fade-up-2" style={{ marginBottom: "var(--space-6)", borderColor: "var(--color-warning-border)", background: "var(--color-warning-light)" }}>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", justifyContent: "space-between", padding: 0, marginBottom: hintOpen ? "var(--space-5)" : 0 }}
                onClick={() => setHintOpen(!hintOpen)}
              >
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "#92400E" }}>Framework & tips</span>
                <span style={{ fontSize: 14, color: "#92400E", transition: "transform 0.3s" }}>
                  {hintOpen ? "−" : "+"}
                </span>
              </button>
              {hintOpen && (
                <>
                  <div style={{ height: 1, background: "var(--color-warning-border)", margin: "var(--space-4) 0" }} />
                  <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "#92400E", marginBottom: "var(--space-4)" }}>
                    {pick.hint.framework}
                  </p>
                  {pick.hint.steps.map((step, i) => (
                    <div key={i} className="hint-step">
                      <div className="hint-step-num">{i + 1}</div>
                      <p style={{ fontSize: "var(--font-size-sm)", color: "#92400E", lineHeight: 1.7 }}>{step}</p>
                    </div>
                  ))}
                  <div style={{ marginTop: "var(--space-5)", padding: "var(--space-4)", background: "rgba(146,64,14,0.1)", borderRadius: "var(--radius-md)", borderLeft: "3px solid #92400E" }}>
                    <p style={{ fontSize: "var(--font-size-sm)", color: "#92400E", fontStyle: "italic", lineHeight: 1.7 }}>
                      {pick.hint.watch}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Answer input */}
          {!loading && !error && (
            <div className="anim-fade-up-3">
              {pick?.type === "quiz" && mcqOptions.length > 0 ? (
                <>
                  <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
                    Select your answer
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
                    {mcqOptions.map((opt, i) => {
                      const isSelected = mcqSelected === i;
                      const isCorrect = opt === mcqCorrect;
                      const userGotItWrong = mcqSelected !== null && mcqSelected !== i && !isCorrect;

                      let className = "mcq-option";
                      if (mcqRevealed) {
                        if (isSelected && isCorrect) className += " mcq-correct";
                        else if (isSelected) className += " mcq-wrong";
                        else if (isCorrect) className += " mcq-show-correct";
                        className += " mcq-revealed";
                      } else if (isSelected) {
                        className += " mcq-selected";
                      }

                      return (
                        <button key={i} className={className} onClick={() => !mcqRevealed && setMcqSelected(i)}>
                          <span style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "var(--color-bg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, color: "var(--color-text-secondary)" }}>
                            {mcqRevealed && isSelected && isCorrect ? "✓" :
                             mcqRevealed && isSelected ? "✕" :
                             mcqRevealed && isCorrect && userGotItWrong ? "✓" :
                             String.fromCharCode(65 + i)}
                          </span>
                          <span style={{ flex: 1, textAlign: "left", fontSize: "var(--font-size-sm)", lineHeight: 1.6 }}>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!mcqRevealed && (
                    <button className="btn btn-primary btn-lg btn-full" disabled={mcqSelected === null || loading} onClick={() => { setMcqRevealed(true); setAnswer(mcqOptions[mcqSelected]); }}>
                      Submit answer
                    </button>
                  )}

                  {mcqRevealed && (
                    <button className="btn btn-accent btn-lg btn-full" disabled={loading} onClick={() => submitAnswer(mcqOptions[mcqSelected])}>
                      {loading ? "Assessing..." : "Get assessment"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <label className="label">Your answer</label>
                  <textarea
                    className="input"
                    placeholder={pick?.type === "estimation" ? "Break down your reasoning step by step..." : "Share your thinking..."}
                    value={openAnswer}
                    onChange={e => setOpenAnswer(e.target.value)}
                    style={{ minHeight: 160, fontFamily: "var(--font-family)", fontSize: "var(--font-size-sm)", lineHeight: 1.7, padding: "var(--space-4)" }}
                  />
                  <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: "var(--space-2)" }}>
                    Minimum 80 characters for quality feedback
                  </p>
                  <button
                    className="btn btn-primary btn-lg btn-full"
                    style={{ marginTop: "var(--space-5)" }}
                    disabled={openAnswer.trim().length < 80 || loading}
                    onClick={() => submitAnswer()}
                  >
                    {loading ? "Assessing..." : "Submit for assessment"}
                  </button>
                </>
              )}
            </div>
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

      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">PM Academy</span>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: "var(--space-16)" }}>
        <div className="content-container-sm" style={{ paddingTop: "var(--space-10)" }}>

          {/* Result header */}
          <div className="anim-fade-up" style={{ marginBottom: "var(--space-8)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: "var(--space-4)" }}>✓</div>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "var(--space-3)" }}>
              Assessment complete
            </h1>
            <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              Here's your personalized feedback from your PM coach.
            </p>
          </div>

          {/* Score card */}
          <div className="card anim-fade-up-1" style={{ marginBottom: "var(--space-6)", background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
              <div>
                <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>Overall score</p>
                <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 900, color: "var(--color-accent)", letterSpacing: "-0.04em" }}>
                  {scores?.overall}/10
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>XP earned</p>
                <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-warning)", letterSpacing: "-0.03em" }}>
                  +{Math.round(10 + (scores?.overall * 5) * (pick?.difficulty === "Hard" ? 3 : 1))}
                </div>
              </div>
            </div>
            <div className="divider" style={{ margin: "var(--space-5) 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
              {[
                { label: "Structured Thinking", key: "structured" },
                { label: "Business Acumen", key: "business" },
                { label: "Specificity", key: "depth" },
                { label: "PM Maturity", key: "maturity" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, color: "var(--color-accent)" }}>
                    {scores?.[s.key]}/10
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback card */}
          <div className="card anim-fade-up-2" style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ marginBottom: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-4)" }}>Coach's feedback</h2>
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.9 }}>
              {renderMD(assessment)}
            </div>
          </div>

          {/* Answer key toggle */}
          {answerKey && (
            <div className="card anim-fade-up-3" style={{ marginBottom: "var(--space-6)", borderColor: "var(--color-success-border)", background: "var(--color-success-light)" }}>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", justifyContent: "space-between", padding: 0, marginBottom: showKey ? "var(--space-5)" : 0 }}
                onClick={() => setShowKey(!showKey)}
              >
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-success)" }}>Model answer</span>
                <span style={{ fontSize: 14, color: "var(--color-success)" }}>
                  {showKey ? "−" : "+"}
                </span>
              </button>
              {showKey && (
                <>
                  <div style={{ height: 1, background: "var(--color-success-border)", margin: "var(--space-4) 0" }} />
                  <div style={{ fontSize: "var(--font-size-sm)", color: "#065F46", lineHeight: 1.9 }}>
                    {renderMD(answerKey, true)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="anim-fade-up-4" style={{ display: "flex", gap: "var(--space-3)" }}>
            <button className="btn btn-secondary btn-lg btn-full" onClick={() => { setScreen("home"); setHomeTab("challenges"); }}>
              Back to challenges
            </button>
            <button className="btn btn-primary btn-lg btn-full" onClick={() => { setScreen("home"); setHomeTab("challenges"); }}>
              Next challenge
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: FEEDBACK
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "feedback") return (
    <div className="page-container">
      <style>{CSS}</style>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">PM Academy</span>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: "var(--space-16)" }}>
        <div className="content-container-sm" style={{ paddingTop: "var(--space-10)" }}>

          <div className="anim-fade-up" style={{ marginBottom: "var(--space-8)" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "var(--space-3)" }}>
              Help us improve
            </h1>
            <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              Your feedback shapes the future of PM Academy.
            </p>
          </div>

          <div className="card anim-fade-up-1">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

              {/* Usefulness rating */}
              <div>
                <label className="label">How useful was this challenge?</label>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} className={`star-btn ${fbUseful === i ? "active" : ""}`} onClick={() => setFbUseful(i)}>
                      {i <= fbUseful ? "★" : "☆"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="label">Your role</label>
                <select className="input" value={fbRole} onChange={e => setFbRole(e.target.value)}>
                  <option value="">Select your role</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="APM">Associate PM / APM</option>
                  <option value="Founder">Founder</option>
                  <option value="Designer">Designer</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Track preference */}
              <div>
                <label className="label">Which track interests you more?</label>
                <select className="input" value={fbTrackPref} onChange={e => setFbTrackPref(e.target.value)}>
                  <option value="">Select track</option>
                  <option value="B2B">B2B SaaS</option>
                  <option value="B2C">B2C Consumer</option>
                  <option value="Both">Both equally</option>
                </select>
              </div>

              {/* Pricing tier */}
              <div>
                <label className="label">Would you pay for this?</label>
                <select className="input" value={fbPricingTier} onChange={e => setFbPricingTier(e.target.value)}>
                  <option value="">Select option</option>
                  <option value="Free">Keep it free</option>
                  <option value="Pro">₹499/month (Pro)</option>
                  <option value="Team">₹999/month (Team)</option>
                  <option value="Unsure">Not sure yet</option>
                </select>
              </div>

              {/* Ease of use */}
              <div>
                <label className="label">Easy to understand?</label>
                <select className="input" value={fbEasy} onChange={e => setFbEasy(e.target.value)}>
                  <option value="">Select option</option>
                  <option value="Very easy">Very easy</option>
                  <option value="Easy">Easy</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Difficult">Difficult</option>
                </select>
              </div>

              {/* Comment */}
              <div>
                <label className="label">Any comments?</label>
                <textarea
                  className="input"
                  placeholder="What could we improve?"
                  value={fbComment}
                  onChange={e => setFbComment(e.target.value)}
                  style={{ minHeight: 100, fontFamily: "var(--font-family)", fontSize: "var(--font-size-sm)", lineHeight: 1.7, padding: "var(--space-4)" }}
                />
              </div>

              {/* Improve */}
              <div>
                <label className="label">What should we build next?</label>
                <textarea
                  className="input"
                  placeholder="Your ideas..."
                  value={fbImprove}
                  onChange={e => setFbImprove(e.target.value)}
                  style={{ minHeight: 100, fontFamily: "var(--font-family)", fontSize: "var(--font-size-sm)", lineHeight: 1.7, padding: "var(--space-4)" }}
                />
              </div>

            </div>

            <button
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: "var(--space-6)" }}
              disabled={fbUseful === 0 || fbSending}
              onClick={submitGuestFeedback}
            >
              {fbSending ? "Sending..." : "Submit feedback"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: THANKS
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "thanks") return (
    <div className="page-container">
      <style>{CSS}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-10) var(--space-6)" }}>

        <div className="anim-fade-up" style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: "var(--space-6)" }}>✓</div>
          <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "var(--space-3)" }}>
            Thank you!
          </h1>
          <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: 1.8, marginBottom: "var(--space-8)" }}>
            Your feedback helps us build better PM training. We'll be in touch soon.
          </p>

          <button className="btn btn-primary btn-lg btn-full" onClick={() => { setScreen("login"); setIsGuest(false); }}>
            Back to login
          </button>
        </div>

      </div>
    </div>
  );

}
