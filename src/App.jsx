import { useState, useEffect } from "react";

function storageGet(key) { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function storageList(prefix) { try { return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) }; } catch { return { keys: [] }; } }

const CHALLENGES = {
  B2B: [
    { tag:"PRIORITIZATION", emoji:"⚖️", color:"#7C3AED", pastel:"#EDE9FE", dark:"#4C1D95",
      hint:{ framework:"RICE or MoSCoW", steps:["Name your framework and justify the choice","Score each backlog item — don't just list them","Address the compliance deadline and churn risk explicitly","End with a ranked list and what gets cut if capacity runs out"], watch:"Describing features ≠ prioritizing them. Defend every trade-off." },
      prompt:`B2B SaaS prioritization challenge for a junior PM. Include: company context (ARR, customer count), 5 backlog items with effort/value estimates, sprint constraint + 1 enterprise churn risk + 1 compliance deadline. Ask: prioritize using a framework. Be specific and concise.` },
    { tag:"METRICS", emoji:"📊", color:"#0284C7", pastel:"#DBEAFE", dark:"#1E40AF",
      hint:{ framework:"Diagnose → Hypothesize → Measure", steps:["Describe what you observe in the data first","Generate 2-3 root cause hypotheses","Identify what data is missing","Define 2-3 metrics you'd add to the dashboard"], watch:"Never diagnose from a single data point. Ask: what else would I need to know?" },
      prompt:`B2B platform metrics challenge for a junior PM. Show a 4-metric text dashboard with one red herring. Something is wrong (API errors, adoption drop, or ticket spike). Ask: diagnose the root cause and plan next steps. Be concise.` },
    { tag:"STAKEHOLDER", emoji:"🤝", color:"#0F766E", pastel:"#CCFBF1", dark:"#134E4A",
      hint:{ framework:"Understand → Align → Decide", steps:["Find what each stakeholder truly wants beneath their stated position","Spot any shared goals or constraints","Make a concrete decision — don't sit on the fence","State who gets which message and how"], watch:"PMs decide. They don't just mediate. End with a clear recommendation." },
      prompt:`B2B stakeholder conflict for a junior PM. 2-3 stakeholders with conflicting goals, distinct motivations, 1 hard sprint deadline. Ask: how do you navigate this and what gets built? Be concise.` },
    { tag:"STRATEGY", emoji:"🎯", color:"#15803D", pastel:"#DCFCE7", dark:"#14532D",
      hint:{ framework:"Situation → Options → Recommendation", steps:["Summarize the core tension in 1-2 sentences","Name 2-3 strategic options","Pick one and defend it with business reasoning","Explicitly state what you would NOT do and why"], watch:"Every strategy needs a trade-off. What are you giving up?" },
      prompt:`B2B product strategy challenge for a junior PM. Company at a crossroads with fake market data and real constraints. Ask: what is your strategy and what would you NOT do? Be concise.` },
    { tag:"EXECUTION", emoji:"⚡", color:"#B45309", pastel:"#FEF3C7", dark:"#78350F",
      hint:{ framework:"Triage → Communicate → Adapt", steps:["What is most critical in the next 2 hours?","Who do you talk to and in what order?","What do you cut or defer?","How do you run the retrospective after?"], watch:"Focus and communicate. Not heroics. A clear mind beats a busy one." },
      prompt:`B2B sprint execution crisis for a junior PM. Mid-sprint blocker, sprint goal at risk, one panicking stakeholder. Ask: walk through your response step by step. Be concise.` },
  ],
  B2C: [
    { tag:"PRIORITIZATION", emoji:"⚖️", color:"#DB2777", pastel:"#FCE7F3", dark:"#831843",
      hint:{ framework:"RICE or Impact vs Effort", steps:["State your framework and why it fits B2C","Consider user volume, engagement, and retention for each item","Factor in competitor timing and seasonal context","Give a final ranked order and what gets cut"], watch:"B2C is about user love at scale. Delight is a valid business metric." },
      prompt:`B2C mobile app prioritization challenge for a junior PM. Consumer app with 5 backlog items, a competitor just launched a similar feature. Ask: prioritize using a framework. Be concise.` },
    { tag:"METRICS", emoji:"📊", color:"#7C3AED", pastel:"#EDE9FE", dark:"#4C1D95",
      hint:{ framework:"AARRR Funnel", steps:["Map each metric to its funnel stage","Identify the biggest drop-off point","Form 2-3 hypotheses for the drop-off","Pick one metric to fix first and defend the choice"], watch:"Find the leak in the funnel. One metric in isolation tells you nothing." },
      prompt:`B2C consumer app metrics challenge for a junior PM. Funnel problem with 5 fake metrics, one red herring. Ask: diagnose the funnel and recommend one focus area. Be concise.` },
    { tag:"GROWTH", emoji:"🚀", color:"#0284C7", pastel:"#DBEAFE", dark:"#1E40AF",
      hint:{ framework:"Growth Loops", steps:["Identify which growth loop is broken or missing","Pick ONE lever to pull — don't try to fix everything","Define how you'd measure if your fix worked","Estimate the impact in user numbers or revenue"], watch:"Growth is a system. Fix the loop. Don't just add features." },
      prompt:`B2C growth challenge for a junior PM. Consumer app growth has plateaued with fake metrics showing the problem and limited engineering capacity. Ask: what single growth lever would you pull and why? Be concise.` },
    { tag:"USER RESEARCH", emoji:"🔍", color:"#0F766E", pastel:"#CCFBF1", dark:"#134E4A",
      hint:{ framework:"Jobs To Be Done", steps:["Identify the job each user hires the product to do","Find the gap between expectation and experience","Separate genuine pain points from nice-to-haves","Recommend what to build and what to ignore"], watch:"Focus on what users DO, not what they SAY. Behaviour beats words." },
      prompt:`B2C user research challenge for a junior PM. 3 user types giving conflicting qualitative feedback on the same feature area. Ask: synthesize the feedback and decide what to build. Be concise.` },
    { tag:"EXECUTION", emoji:"⚡", color:"#B45309", pastel:"#FEF3C7", dark:"#78350F",
      hint:{ framework:"Triage → Communicate → Ship", steps:["What is breaking user experience RIGHT NOW?","Hotfix immediately or wait for proper fix — pick one and justify","Communicate to users if the issue is visible to them","Define what resolved looks like and how you'll confirm it"], watch:"B2C crises are public. Users tweet. Think about user communication, not just internal teams." },
      prompt:`B2C app execution crisis for a junior PM. Consumer-facing incident with public user impact and social media pressure, engineering says 4 hours to fix. Ask: how does the PM handle this step by step? Be concise.` },
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
  const guestMode = storageGet("pm_guest")?.value==="true" && storageGet("pm_auth")?.value!=="true";
  const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({system,userMsg,isGuest:guestMode}) });
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.text||"";
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#f0f4f8;-webkit-font-smoothing:antialiased;}
::selection{background:#c7b8f5;}
textarea,input{outline:none;font-family:inherit;}
button{cursor:pointer;font-family:inherit;border:none;-webkit-tap-highlight-color:transparent;}
@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pop{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
@keyframes barw{from{width:0}to{width:var(--w)}}
.a0{animation:up .5s cubic-bezier(.22,1,.36,1) both}
.a1{animation:up .5s .07s cubic-bezier(.22,1,.36,1) both}
.a2{animation:up .5s .14s cubic-bezier(.22,1,.36,1) both}
.a3{animation:up .5s .21s cubic-bezier(.22,1,.36,1) both}
.a4{animation:up .5s .28s cubic-bezier(.22,1,.36,1) both}
.card{transition:transform .2s,box-shadow .2s;}
.card:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.12)!important;}
.trk:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,0.14)!important;}
.btn-primary{transition:all .2s;}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(124,58,237,0.4)!important;}
.btn-primary:active{transform:translateY(0);}
.pill-sel{transition:all .15s;}
.pill-sel:hover{opacity:.85;}
input:focus,textarea:focus{box-shadow:0 0 0 3px rgba(124,58,237,0.18)!important;}
`;

// ── Markdown renderer ─────────────────────────────────────────────────────
function MD({text,isKey=false}) {
  return <>{text.trim().split("\n").map((line,i)=>{
    if(line.startsWith("**")&&line.endsWith("**")) return <p key={i} style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:isKey?"#16A34A":"#9CA3AF",marginTop:20,marginBottom:8}}>{line.replace(/\*\*/g,"")}</p>;
    if(line.includes("━")) return <div key={i} style={{height:1,background:"#F3F4F6",margin:"8px 0"}}/>;
    if(!line.trim()) return <div key={i} style={{height:6}}/>;
    const parts=line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{fontSize:15,lineHeight:1.8,color:isKey?"#166534":"#374151",fontWeight:400}}>{parts.map((p,j)=>p.startsWith("**")?<strong key={j} style={{color:isKey?"#15803D":"#111827",fontWeight:600}}>{p.replace(/\*\*/g,"")}</strong>:p)}</p>;
  })}</>;
}

// ── Score bar ─────────────────────────────────────────────────────────────
function SBar({label,score,delay=0}) {
  const [w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(score*10),300+delay);return()=>clearTimeout(t);},[score]);
  const c=score>=7?"#10B981":score>=5?"#F59E0B":"#EF4444";
  const bg=score>=7?"#D1FAE5":score>=5?"#FEF3C7":"#FEE2E2";
  const tc=score>=7?"#065F46":score>=5?"#92400E":"#991B1B";
  return(
    <div style={{padding:"11px 0",borderBottom:"1px solid #F9FAFB"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:14,color:"#6B7280",fontWeight:400}}>{label}</span>
        <span style={{fontSize:12,fontWeight:700,color:tc,background:bg,padding:"3px 10px",borderRadius:99}}>{score}/10</span>
      </div>
      <div style={{height:8,background:"#F3F4F6",borderRadius:99,overflow:"hidden"}}>
        <div style={{width:`${w}%`,height:"100%",background:`linear-gradient(90deg,${c}cc,${c})`,borderRadius:99,transition:"width 1s cubic-bezier(.4,0,.2,1)"}}/>
      </div>
    </div>
  );
}

// ── Pill selector ─────────────────────────────────────────────────────────
function Pills({opts,val,onChange,color="#7C3AED"}) {
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      {opts.map(o=>(
        <button key={o} className="pill-sel" onClick={()=>onChange(o)} style={{background:val===o?color:"#F3F4F6",color:val===o?"#fff":"#374151",borderRadius:99,padding:"8px 16px",fontSize:13,fontWeight:val===o?600:400,transition:"all .15s"}}>
          {o}
        </button>
      ))}
    </div>
  );
}


// ── Shared UI components (defined outside to avoid re-creation on render) ──
function PCard({children,pastel="#EDE9FE",style={},cls="card"}){
  return(
    <div className={cls} style={{background:pastel,borderRadius:24,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.06)",...style}}>
      {children}
    </div>
  );
}

function WCard({children,style={},cls="card"}){
  return(
    <div className={cls} style={{background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",...style}}>
      {children}
    </div>
  );
}

function BtnPrimary({children,onClick,disabled,color="#7C3AED",style={}}){
  return(
    <button className="btn-primary" onClick={onClick} disabled={disabled} style={{background:disabled?"#E5E7EB":`linear-gradient(135deg,${color},${color}cc)`,color:disabled?"#9CA3AF":"#fff",borderRadius:16,padding:"16px 24px",fontSize:16,fontWeight:700,width:"100%",boxShadow:disabled?"none":`0 6px 20px ${color}40`,transition:"all .2s",...style}}>
      {children}
    </button>
  );
}

function BtnSec({children,onClick,style={}}){
  return(
    <button onClick={onClick} style={{background:"#fff",borderRadius:16,padding:"15px 20px",fontSize:15,fontWeight:600,color:"#374151",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",transition:"all .2s",...style}}>
      {children}
    </button>
  );
}

function BackNav({onClick,extras}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,paddingBottom:20}}>
      <button onClick={onClick} style={{background:"#fff",borderRadius:12,padding:"8px 14px",fontSize:14,fontWeight:600,color:"#7C3AED",display:"flex",alignItems:"center",gap:6,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7L7 13" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back
      </button>
      {extras}
    </div>
  );
}

export default function PMApp() {
  const [phase,setPhase]=useState("home");
  const [trackType,setTrackType]=useState(null);
  const [challenge,setChallenge]=useState("");
  const [pick,setPick]=useState(null);
  const [hintOpen,setHintOpen]=useState(false);
  const [answer,setAnswer]=useState("");
  const [assessment,setAssessment]=useState("");
  const [answerKey,setAnswerKey]=useState("");
  const [showKey,setShowKey]=useState(false);
  const [scores,setScores]=useState(null);
  const [totalSessions,setTotalSessions]=useState(0);
  const [highScores,setHighScores]=useState(0);
  const [avgScore,setAvgScore]=useState(null);
  const [history,setHistory]=useState([]);
  const [error,setError]=useState("");
  const [sessionCount,setSessionCount]=useState(0);
  const [unlocked,setUnlocked]=useState(()=>storageGet("pm_auth")?.value==="true");
  const [isGuest,setIsGuest]=useState(()=>storageGet("pm_guest")?.value==="true");
  const [guestCount,setGuestCount]=useState(()=>parseInt(storageGet("pm_guest_count")?.value||"0"));
  const [pwInput,setPwInput]=useState("");
  const [pwError,setPwError]=useState(false);
  const [showGuestForm,setShowGuestForm]=useState(false);
  const [guestProfile,setGuestProfile]=useState(()=>{const s=storageGet("pm_guest_profile");return s?JSON.parse(s.value):null;});
  const [gfFirst,setGfFirst]=useState(""); const [gfLast,setGfLast]=useState(""); const [gfAge,setGfAge]=useState(""); const [gfField,setGfField]=useState(""); const [gfExp,setGfExp]=useState(""); const [gfErr,setGfErr]=useState("");
  const [fbName,setFbName]=useState(""); const [fbRole,setFbRole]=useState(""); const [fbRating,setFbRating]=useState(0); const [fbComment,setFbComment]=useState(""); const [fbMissing,setFbMissing]=useState(""); const [fbFreq,setFbFreq]=useState(""); const [fbPay,setFbPay]=useState(""); const [fbPrice,setFbPrice]=useState(""); const [fbRec,setFbRec]=useState(null); const [fbSending,setFbSending]=useState(false); const [fbSent,setFbSent]=useState(false); const [fbErr,setFbErr]=useState("");

  const today=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  const greetName=isGuest&&guestProfile?guestProfile.firstName:"Siddhant";

  useEffect(()=>{
    const hR=storageList("pm_session:");
    if(hR?.keys?.length){
      const s=hR.keys.map(k=>{const r=storageGet(k);return r?JSON.parse(r.value):null;}).filter(Boolean).reverse();
      setHistory(s.slice(0,30));setTotalSessions(s.length);setHighScores(s.filter(x=>x.scores?.overall>=7).length);
      const ws=s.filter(x=>x.scores?.overall);
      if(ws.length)setAvgScore(Math.round(ws.reduce((a,b)=>a+b.scores.overall,0)/ws.length*10)/10);
    }
  },[]);

  async function startChallenge(track){
    setTrackType(track);setPhase("loading");setError("");
    const pool=CHALLENGES[track];
    const lastR=storageGet("pm_last_tag");
    let p2=pool.filter(c=>c.tag!==lastR?.value);
    if(!p2.length)p2=pool;
    const chosen=p2[Math.floor(Math.random()*p2.length)];
    setPick(chosen);setHintOpen(false);
    try{const text=await callClaude(`You are a ${track} PM coach. Generate a concise, realistic, specific challenge.`,chosen.prompt);setChallenge(text);setAnswer("");setPhase("answering");}
    catch(e){setError(e.message);setPhase("home");}
  }

  async function submitAnswer(){
    if(answer.trim().length<60)return;
    setPhase("loading");
    try{
      const result=await callClaude(ASSESS_SYSTEM,`TRACK:${trackType}\nTYPE:${pick?.tag}\n\nCHALLENGE:\n${challenge}\n\nANSWER:\n${answer}`);
      const idx=result.indexOf("---KEY---");
      setAssessment(idx>-1?result.slice(0,idx):result);
      setAnswerKey(idx>-1?result.slice(idx+9):"");
      setShowKey(false);
      const m=l=>{const r=new RegExp(l+"[:\\s]+(\\d+)/10","i");const x=result.match(r);return x?parseInt(x[1]):5;};
      const s={structured:m("Structured Thinking"),business:m("Business Acumen"),depth:m("Specificity"),maturity:m("PM Maturity"),overall:m("Overall")};
      setScores(s);saveSession(s);setPhase("result");
    }catch(e){setError(e.message);setPhase("answering");}
  }

  function saveSession(s){
    storageSet("pm_last_tag",pick?.tag);
    storageSet(`pm_session:${Date.now()}`,JSON.stringify({date:new Date().toISOString().slice(0,10),tag:pick?.tag,track:trackType,scores:s}));
    const ns={date:new Date().toISOString().slice(0,10),tag:pick?.tag,track:trackType,scores:s};
    setHistory(prev=>[ns,...prev].slice(0,30));setTotalSessions(p=>p+1);setSessionCount(p=>p+1);
    if(s.overall>=7)setHighScores(p=>p+1);
    const allH=[ns,...history];const ws=allH.filter(x=>x.scores?.overall);
    if(ws.length)setAvgScore(Math.round(ws.reduce((a,b)=>a+b.scores.overall,0)/ws.length*10)/10);
    if(isGuest){const nc=guestCount+1;storageSet("pm_guest_count",String(nc));setGuestCount(nc);}
  }

  function checkPassword(){
    if(pwInput.trim()==="Siddhant@0812"){storageSet("pm_auth","true");setUnlocked(true);setIsGuest(false);}
    else{setPwError(true);setPwInput("");}
  }

  function enterAsGuest(){
    const saved=storageGet("pm_guest_profile");
    if(saved){setGuestProfile(JSON.parse(saved.value));storageSet("pm_guest","true");setIsGuest(true);setUnlocked(true);}
    else{setShowGuestForm(true);}
  }

  function submitGuestForm(){
    if(!gfFirst.trim()||!gfField.trim()||!gfExp){setGfErr("Please fill in the required fields.");return;}
    const profile={firstName:gfFirst.trim(),lastName:gfLast.trim(),age:gfAge,field:gfField.trim(),experience:gfExp};
    storageSet("pm_guest_profile",JSON.stringify(profile));storageSet("pm_guest","true");
    setGuestProfile(profile);setIsGuest(true);setUnlocked(true);setShowGuestForm(false);
  }

  async function submitFeedback(){
    if(fbRating===0)return;
    setFbSending(true);setFbErr("");
    try{
      const res=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:fbName||(guestProfile?`${guestProfile.firstName} ${guestProfile.lastName}`.trim():""),role:fbRole||guestProfile?.field||"",age:guestProfile?.age||"",experience:guestProfile?.experience||"",rating:fbRating,comment:fbComment,missing:fbMissing,frequency:fbFreq,wouldPay:fbPay,priceRange:fbPrice,recommend:fbRec,sessions:guestCount})});
      const d=await res.json();
      if(d.ok)setFbSent(true);else setFbErr("Could not send. Try again.");
    }catch(e){setFbErr(e.message);}
    setFbSending(false);
  }

  // ── shared ────────────────────────────────────────────────────────────
  const PAGE={fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif",background:"#f0f4f8",minHeight:"100vh",WebkitFontSmoothing:"antialiased"};
  const WRAP={maxWidth:640,margin:"0 auto",padding:"0 16px 80px"};

  // ── LOADING ───────────────────────────────────────────────────────────
  if(phase==="loading") return(
    <div style={{...PAGE,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <style>{CSS}</style>
      <div style={{width:44,height:44,borderRadius:"50%",border:"3px solid #E9D8FD",borderTopColor:"#7C3AED",animation:"spin .8s linear infinite"}}/>
      <p style={{fontSize:15,color:"#9CA3AF",fontWeight:500}}>Preparing your challenge…</p>
    </div>
  );

  // ── ACCESS SCREEN ─────────────────────────────────────────────────────
  if(!unlocked) return(
    <div style={{...PAGE,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"24px"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:400}}>

        {/* Logo hero */}
        <div style={{textAlign:"center",marginBottom:36}} className="a0">
          <div style={{width:96,height:96,borderRadius:28,background:"linear-gradient(145deg,#7C3AED,#4338CA)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 12px 40px rgba(124,58,237,0.4)"}}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M8 32L16 18L24 26L32 12L40 20" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="40" cy="10" r="4" fill="white"/>
            </svg>
          </div>
          <h1 style={{fontWeight:800,fontSize:32,color:"#111827",letterSpacing:"-0.03em",marginBottom:8}}>PM Training</h1>
          <p style={{fontSize:16,color:"#9CA3AF",lineHeight:1.5}}>Real challenges. Honest scores.<br/>Build your PM muscle daily.</p>
        </div>

        {/* Guest card */}
        <PCard pastel="#EDE9FE" style={{marginBottom:12,padding:"24px"}} cls="a1">
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <span style={{fontSize:28}}>👋</span>
            <div>
              <p style={{fontSize:17,fontWeight:700,color:"#4C1D95",marginBottom:2}}>Try it free</p>
              <p style={{fontSize:13,color:"#7C3AED"}}>2 free challenges · No account needed</p>
            </div>
          </div>
          <BtnPrimary onClick={enterAsGuest}>Continue as Guest →</BtnPrimary>
        </PCard>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0"}} className="a2">
          <div style={{flex:1,height:1,background:"#E5E7EB"}}/>
          <span style={{fontSize:13,color:"#D1D5DB"}}>or sign in</span>
          <div style={{flex:1,height:1,background:"#E5E7EB"}}/>
        </div>

        {/* Password card */}
        <WCard style={{padding:"20px"}} cls="a2">
          <input type="password" value={pwInput} onChange={e=>{setPwInput(e.target.value);setPwError(false);}} onKeyDown={e=>e.key==="Enter"&&checkPassword()}
            placeholder="Enter access code"
            style={{width:"100%",border:`2px solid ${pwError?"#FCA5A5":"#E5E7EB"}`,borderRadius:14,padding:"14px 16px",fontSize:16,color:"#111827",background:"#F9FAFB",marginBottom:10,transition:"all .2s"}}
          />
          {pwError&&<p style={{fontSize:13,color:"#EF4444",textAlign:"center",marginBottom:10}}>Incorrect code. Try again.</p>}
          <BtnSec onClick={checkPassword} style={{width:"100%"}}>Sign in with code</BtnSec>
        </WCard>
      </div>
    </div>
  );

  // ── GUEST FORM ────────────────────────────────────────────────────────
  if(showGuestForm) return(
    <div style={{...PAGE,padding:"0 16px 40px"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:480,margin:"0 auto",paddingTop:52}}>
        <BackNav onClick={()=>setShowGuestForm(false)}/>
        <div style={{marginBottom:28}} className="a0">
          <p style={{fontSize:28,marginBottom:8}}>👋</p>
          <h1 style={{fontWeight:800,fontSize:28,color:"#111827",letterSpacing:"-0.02em",marginBottom:8}}>Quick intro</h1>
          <p style={{fontSize:15,color:"#9CA3AF",lineHeight:1.6}}>Helps us personalise your challenges.</p>
        </div>

        <WCard style={{padding:"24px",marginBottom:14}} cls="a1">
          <p style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:18}}>Your Details</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            {[["First name *",gfFirst,setGfFirst,"Alex"],["Last name",gfLast,setGfLast,"Smith"]].map(([label,val,set,ph],i)=>(
              <div key={i}>
                <label style={{fontSize:12,color:"#6B7280",display:"block",marginBottom:6,fontWeight:500}}>{label}</label>
                <input value={val} onChange={e=>{set(e.target.value);setGfErr("");}} placeholder={ph}
                  style={{width:"100%",border:"2px solid #E5E7EB",borderRadius:12,padding:"11px 14px",fontSize:14,color:"#111827",background:"#F9FAFB",transition:"all .2s"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,marginBottom:18}}>
            <div>
              <label style={{fontSize:12,color:"#6B7280",display:"block",marginBottom:6,fontWeight:500}}>Age</label>
              <input type="number" value={gfAge} onChange={e=>setGfAge(e.target.value)} placeholder="26"
                style={{width:"100%",border:"2px solid #E5E7EB",borderRadius:12,padding:"11px 14px",fontSize:14,color:"#111827",background:"#F9FAFB",transition:"all .2s"}}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#6B7280",display:"block",marginBottom:6,fontWeight:500}}>Field of work *</label>
              <input value={gfField} onChange={e=>{setGfField(e.target.value);setGfErr("");}} placeholder="e.g. Product Management"
                style={{width:"100%",border:"2px solid #E5E7EB",borderRadius:12,padding:"11px 14px",fontSize:14,color:"#111827",background:"#F9FAFB",transition:"all .2s"}}/>
            </div>
          </div>
          <div>
            <label style={{fontSize:12,color:"#6B7280",display:"block",marginBottom:10,fontWeight:500}}>Experience *</label>
            <Pills opts={["0–1 years","1–3 years","3–5 years","5–10 years","10+ years"]} val={gfExp} onChange={v=>{setGfExp(v);setGfErr("");}}/>
          </div>
        </WCard>

        {gfErr&&<p style={{fontSize:14,color:"#EF4444",textAlign:"center",marginBottom:12}}>{gfErr}</p>}
        <BtnPrimary onClick={submitGuestForm} cls="a2">Start Practising →</BtnPrimary>
        <p style={{fontSize:13,color:"#D1D5DB",textAlign:"center",marginTop:12}}>2 free challenges · No account needed</p>
      </div>
    </div>
  );

  // ── GUEST FEEDBACK WALL ───────────────────────────────────────────────
  if(isGuest&&guestCount>=2&&phase!=="result") return(
    <div style={{...PAGE,padding:"0 16px 60px"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:520,margin:"0 auto",paddingTop:48}}>
        {fbSent?(
          <div style={{textAlign:"center",paddingTop:40}} className="a0">
            <div style={{fontSize:64,marginBottom:16}}>🎉</div>
            <h2 style={{fontWeight:800,fontSize:26,color:"#111827",marginBottom:10}}>Thank you!</h2>
            <p style={{fontSize:16,color:"#9CA3AF",lineHeight:1.7,marginBottom:28}}>Feedback sent to Siddhant.<br/>He'll reach out about full access.</p>
            <PCard pastel="#EDE9FE" style={{padding:"20px",textAlign:"left"}}>
              <p style={{fontSize:15,color:"#7C3AED",fontWeight:700,marginBottom:6}}>Want full access?</p>
              <p style={{fontSize:14,color:"#6B7280"}}>Message Siddhant on LinkedIn to get a personal access code.</p>
            </PCard>
          </div>
        ):(
          <>
            <div style={{textAlign:"center",marginBottom:28}} className="a0">
              <p style={{fontSize:44,marginBottom:12}}>✋</p>
              <h2 style={{fontWeight:800,fontSize:24,color:"#111827",letterSpacing:"-0.02em",marginBottom:8}}>2 of 2 challenges used</h2>
              <p style={{fontSize:15,color:"#9CA3AF",lineHeight:1.65}}>90 seconds of honest feedback helps shape this product.</p>
            </div>

            {[
              {q:"1. Overall rating", sub:"Honest beats polite — a real 3 is more useful than a fake 5.", content:(
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setFbRating(n)} style={{background:"none",fontSize:32,lineHeight:1,padding:"2px 3px",opacity:n<=fbRating?1:0.2,transform:n<=fbRating?"scale(1.15)":"scale(1)",transition:"all .15s"}}>★</button>
                  ))}
                  {fbRating>0&&<span style={{fontSize:13,color:"#9CA3AF",marginLeft:6}}>{["","Poor","Fair","Good","Great","Excellent"][fbRating]}</span>}
                </div>
              )},
              {q:"2. How often would you use it?", content:<Pills opts={["Daily","3–4x a week","Once a week","A few times a month","Rarely"]} val={fbFreq} onChange={setFbFreq}/>},
              {q:"3. What one thing is missing?", sub:"Be specific. 'More features' is not an answer.", content:(
                <textarea value={fbMissing} onChange={e=>setFbMissing(e.target.value)} rows={3} placeholder="e.g. Mock interview mode with follow-up questions…"
                  style={{width:"100%",border:"2px solid #E5E7EB",borderRadius:14,padding:"12px 14px",fontSize:14,color:"#111827",background:"#F9FAFB",lineHeight:1.65,resize:"none",transition:"all .2s"}}/>
              )},
              {q:"4. Would you pay for full access?", content:<Pills opts={["Yes, definitely","Maybe — depends on price","No, I'd use it free","No, not paid or free"]} val={fbPay} onChange={v=>{setFbPay(v);if(v.startsWith("No"))setFbPrice("");}}/> },
              ...(fbPay==="Yes, definitely"||fbPay==="Maybe — depends on price"?[{q:"5. What monthly price feels fair?",pastel:"#EDE9FE",content:<Pills opts={["Under €3/mo","€3–5/mo","€5–10/mo","€10–15/mo","€15–20/mo","€20+/mo"]} val={fbPrice} onChange={setFbPrice} color="#7C3AED"/>}]:[]),
              {q:"6. Would you recommend to a colleague?", content:(
                <div style={{display:"flex",gap:10}}>
                  {[{v:true,l:"Yes 👍",c:"#10B981",bg:"#D1FAE5"},{v:false,l:"No 👎",c:"#EF4444",bg:"#FEE2E2"}].map(({v,l,c,bg})=>(
                    <button key={String(v)} onClick={()=>setFbRec(v)} style={{flex:1,background:fbRec===v?bg:"#F9FAFB",border:`2px solid ${fbRec===v?c:"#E5E7EB"}`,borderRadius:14,padding:"13px",fontSize:15,fontWeight:fbRec===v?700:400,color:fbRec===v?c:"#374151",transition:"all .15s"}}>{l}</button>
                  ))}
                </div>
              )},
              {q:"7. Anything else?", sub:"(optional)", content:(
                <textarea value={fbComment} onChange={e=>setFbComment(e.target.value)} rows={3} placeholder="Bugs, ideas, complaints, compliments — all welcome."
                  style={{width:"100%",border:"2px solid #E5E7EB",borderRadius:14,padding:"12px 14px",fontSize:14,color:"#111827",background:"#F9FAFB",lineHeight:1.65,resize:"none",transition:"all .2s"}}/>
              )},
            ].map((item,i)=>(
              <WCard key={i} style={{padding:"18px 20px",marginBottom:10}} cls={`a${Math.min(i+1,4)}`}>
                <p style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:item.sub?4:12}}>{item.q}</p>
                {item.sub&&<p style={{fontSize:12,color:"#9CA3AF",marginBottom:12}}>{item.sub}</p>}
                {item.content}
              </WCard>
            ))}

            {fbErr&&<p style={{fontSize:14,color:"#EF4444",textAlign:"center",marginBottom:10}}>{fbErr}</p>}
            <div className="a4">
              <BtnPrimary onClick={submitFeedback} disabled={fbRating===0||fbSending}>{fbSending?"Sending…":"Submit Feedback →"}</BtnPrimary>
              <p style={{fontSize:13,color:"#D1D5DB",textAlign:"center",marginTop:14,lineHeight:1.6}}>
                Want full access? <a href="https://linkedin.com/in/siddhantkadam" target="_blank" style={{color:"#7C3AED",textDecoration:"none",fontWeight:700}}>Message Siddhant on LinkedIn →</a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ── HOME ──────────────────────────────────────────────────────────────
  if(phase==="home") return(
    <div style={PAGE}>
      <style>{CSS}</style>
      <div style={WRAP}>

        {/* Dark nav bar */}
        <div style={{background:"#111827",borderRadius:"0 0 28px 28px",padding:"16px 20px",margin:"0 -16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}} className="a0">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#7C3AED,#4338CA)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(124,58,237,0.5)"}}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 14L7 8L10 11L13 5L17 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="17" cy="4.5" r="1.8" fill="white"/>
              </svg>
            </div>
            <span style={{fontWeight:800,fontSize:17,color:"#fff",letterSpacing:"-0.01em"}}>PM Training</span>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{fontSize:13,fontWeight:600,color:"#fff"}}>{greetName} {isGuest?"👋":"✦"}</p>
            <p style={{fontSize:11,color:"#6B7280"}}>{today}</p>
          </div>
        </div>

        {error&&<div style={{background:"#FEE2E2",borderRadius:16,padding:"14px 18px",marginBottom:14,fontSize:14,color:"#DC2626"}}>⚠ {error}</div>}

        {/* Hero greeting */}
        <div style={{marginBottom:24}} className="a0">
          <h1 style={{fontWeight:800,fontSize:32,color:"#111827",letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:8}}>
            Good day,<br/><span style={{background:"linear-gradient(135deg,#7C3AED,#DB2777)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{greetName}.</span>
          </h1>
          <p style={{fontSize:16,color:"#9CA3AF",lineHeight:1.6}}>
            {isGuest&&guestProfile?`${guestProfile.field} · ${guestProfile.experience} · ${Math.max(0,2-guestCount)} challenge${Math.max(0,2-guestCount)===1?"":"s"} left`:"Practice makes permanent. Pick a track."}
          </p>
        </div>

        {/* Stats row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}} className="a1">
          {[
            {emoji:"📚",val:totalSessions,label:"Sessions",pastel:"#DBEAFE",tc:"#1E40AF"},
            {emoji:"⭐",val:highScores,label:"7+ Scores",pastel:"#FEF3C7",tc:"#92400E"},
            {emoji:"📈",val:avgScore??"-",label:"Avg Score",pastel:"#DCFCE7",tc:"#065F46"},
          ].map((s,i)=>(
            <PCard key={i} pastel={s.pastel} style={{padding:"18px 14px",textAlign:"center"}} cls="">
              <div style={{fontSize:24,marginBottom:8}}>{s.emoji}</div>
              <div style={{fontWeight:800,fontSize:28,color:s.tc,letterSpacing:"-0.02em",lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:12,color:"#6B7280",marginTop:5,fontWeight:500}}>{s.label}</div>
            </PCard>
          ))}
        </div>

        {/* Track selection */}
        <p style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}} className="a2">Choose Your Track</p>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}} className="a2">
          {[
            {type:"B2B",emoji:"🏢",label:"B2B / Enterprise",desc:"Compliance · Stakeholders · Platform · Churn",pastel:"#EDE9FE",color:"#7C3AED",tags:["Prioritization","Metrics","Stakeholder","Strategy","Execution"]},
            {type:"B2C",emoji:"📱",label:"B2C / Consumer",desc:"Growth loops · Funnels · User research · Incidents",pastel:"#DBEAFE",color:"#0284C7",tags:["Prioritization","Metrics","Growth","User Research","Execution"]},
          ].map(({type,emoji,label,desc,pastel,color,tags})=>(
            <PCard key={type} pastel={pastel} style={{cursor:"pointer",padding:"22px"}} cls="trk" onClick={()=>startChallenge(type)}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:52,height:52,borderRadius:16,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>
                    {emoji}
                  </div>
                  <div>
                    <p style={{fontWeight:800,fontSize:18,color:"#111827",marginBottom:2}}>{label}</p>
                    <p style={{fontSize:13,color:"#9CA3AF"}}>{desc}</p>
                  </div>
                </div>
                <div style={{width:32,height:32,borderRadius:99,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.1)",flexShrink:0}}>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1L7 7L1 13" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {tags.map(t=><span key={t} style={{fontSize:11,color:color,background:"#fff",padding:"4px 10px",borderRadius:99,fontWeight:600}}>{t}</span>)}
              </div>
            </PCard>
          ))}
        </div>

        {/* History */}
        {history.length>0&&(
          <div className="a3">
            <p style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Recent Sessions</p>
            <WCard cls="">
              {history.slice(0,8).map((s,i)=>{
                const c=CHALLENGES.B2B.concat(CHALLENGES.B2C).find(x=>x.tag===s.tag);
                const sc=s.scores?.overall;
                const scC=sc>=7?"#065F46":sc>=5?"#92400E":"#991B1B";
                const scBg=sc>=7?"#D1FAE5":sc>=5?"#FEF3C7":"#FEE2E2";
                return(
                  <div key={i}>
                    {i>0&&<div style={{height:1,background:"#F9FAFB",margin:"0 20px"}}/>}
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 20px"}}>
                      <div style={{width:40,height:40,borderRadius:12,background:c?.pastel||"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c?.emoji||"📋"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:2}}>{s.tag}</p>
                        <p style={{fontSize:12,color:"#9CA3AF"}}>{s.track||"B2B"} · {s.date}</p>
                      </div>
                      {sc&&<span style={{fontSize:13,fontWeight:800,color:scC,background:scBg,padding:"4px 12px",borderRadius:99,flexShrink:0}}>{sc}/10</span>}
                    </div>
                  </div>
                );
              })}
            </WCard>
          </div>
        )}
      </div>
    </div>
  );

  // ── ANSWERING ─────────────────────────────────────────────────────────
  if(phase==="answering") return(
    <div style={PAGE}>
      <style>{CSS}</style>
      <div style={WRAP}>
        <div style={{paddingTop:52}}>
          <BackNav onClick={()=>setPhase("home")} extras={
            <div style={{display:"flex",gap:8}}>
              <span style={{background:pick?.pastel,color:pick?.color,borderRadius:99,padding:"5px 12px",fontSize:12,fontWeight:700}}>{trackType}</span>
              <span style={{background:pick?.pastel,color:pick?.color,borderRadius:99,padding:"5px 12px",fontSize:12,fontWeight:700}}>{pick?.emoji} {pick?.tag}</span>
            </div>
          }/>
        </div>

        {/* Challenge card */}
        <PCard pastel={pick?.pastel||"#EDE9FE"} style={{padding:"22px",marginBottom:12}} cls="a0 card">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:pick?.color,boxShadow:`0 0 8px ${pick?.color}`}}/>
            <span style={{fontSize:11,fontWeight:700,color:pick?.dark||"#4C1D95",letterSpacing:"0.08em",textTransform:"uppercase"}}>Today's Challenge</span>
          </div>
          <p style={{fontSize:15,color:"#1F2937",lineHeight:1.85,whiteSpace:"pre-wrap"}}>{challenge}</p>
        </PCard>

        {/* Hint */}
        {pick?.hint&&(
          <WCard style={{marginBottom:12}} cls="a1 card">
            <button onClick={()=>setHintOpen(o=>!o)} style={{background:"none",width:"100%",display:"flex",alignItems:"center",gap:12,padding:"18px 20px",textAlign:"left"}}>
              <div style={{width:40,height:40,borderRadius:12,background:"#FEF3C7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid #FDE68A"}}>
                <span style={{fontSize:20}}>💡</span>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:2}}>Framework Hint</p>
                <p style={{fontSize:13,color:"#D97706",fontWeight:500}}>{pick.hint.framework}</p>
              </div>
              <div style={{width:28,height:28,borderRadius:99,background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transform:hintOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>
                  <path d="M2 4L6 8L10 4" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
            {hintOpen&&(
              <div style={{padding:"0 20px 20px",borderTop:"2px solid #F9FAFB"}}>
                <div style={{paddingTop:16}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#D1D5DB",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>How to structure your answer</p>
                  {pick.hint.steps.map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:12,marginBottom:10,padding:"6px 0"}}>
                      <span style={{fontWeight:800,fontSize:13,color:"#D97706",minWidth:22,background:"#FEF3C7",width:24,height:24,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                      <span style={{fontSize:14,color:"#374151",lineHeight:1.65}}>{s}</span>
                    </div>
                  ))}
                  <div style={{marginTop:14,background:"#FFFBEB",border:"2px solid #FDE68A",borderRadius:14,padding:"12px 16px",display:"flex",gap:10}}>
                    <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
                    <span style={{fontSize:13,color:"#92400E",lineHeight:1.65,fontWeight:500}}>{pick.hint.watch}</span>
                  </div>
                </div>
              </div>
            )}
          </WCard>
        )}

        {/* Answer box */}
        <WCard style={{marginBottom:16}} cls="a2 card">
          <div style={{padding:"18px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",textTransform:"uppercase"}}>Your Answer</span>
            <span style={{fontSize:12,fontWeight:600,color:answer.length<60?"#EF4444":"#D1D5DB",transition:"color .2s"}}>
              {answer.length<60?`${60-answer.length} more needed`:`${answer.length} chars`}
            </span>
          </div>
          <textarea value={answer} onChange={e=>setAnswer(e.target.value)}
            placeholder={"Name a framework. Apply it. Be specific.\n\nVague answers will be called out — treat this like a real interview."}
            style={{width:"100%",minHeight:220,background:"transparent",border:"none",color:"#111827",fontSize:15,padding:"14px 20px 20px",lineHeight:1.8}}
          />
        </WCard>

        <div style={{display:"flex",gap:10}} className="a3">
          <BtnSec onClick={()=>setPhase("home")} style={{minWidth:100}}>Cancel</BtnSec>
          <BtnPrimary onClick={submitAnswer} disabled={answer.length<60} style={{flex:1}}>Submit for Assessment →</BtnPrimary>
        </div>
      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────
  if(phase==="result") return(
    <div style={PAGE}>
      <style>{CSS}</style>
      <div style={WRAP}>
        <div style={{paddingTop:52}}>
          <BackNav onClick={()=>setPhase("home")} extras={
            <div style={{display:"flex",gap:8}}>
              {trackType&&<span style={{background:pick?.pastel,color:pick?.color,borderRadius:99,padding:"5px 12px",fontSize:12,fontWeight:700}}>{trackType}</span>}
              {pick&&<span style={{background:pick?.pastel,color:pick?.color,borderRadius:99,padding:"5px 12px",fontSize:12,fontWeight:700}}>{pick.emoji} {pick.tag}</span>}
            </div>
          }/>
        </div>

        {/* Score hero */}
        {scores&&(
          <PCard pastel={scores.overall>=7?"#DCFCE7":scores.overall>=5?"#FEF3C7":"#FEE2E2"} style={{textAlign:"center",padding:"36px 24px",marginBottom:14}} cls="a0 card">
            <div style={{fontWeight:900,fontSize:96,letterSpacing:"-0.05em",lineHeight:1,color:scores.overall>=7?"#15803D":scores.overall>=5?"#B45309":"#DC2626"}}>{scores.overall}</div>
            <div style={{fontSize:15,color:"#9CA3AF",marginTop:4,fontWeight:500}}>out of 10</div>
            <div style={{marginTop:16,display:"inline-block",background:"rgba(255,255,255,0.7)",borderRadius:99,padding:"8px 20px",backdropFilter:"blur(8px)"}}>
              <span style={{fontSize:16,fontWeight:700,color:scores.overall>=7?"#15803D":scores.overall>=5?"#92400E":"#991B1B"}}>
                {scores.overall>=7?"Solid junior PM thinking 💪":scores.overall>=5?"Good foundation, keep building 📈":"Real gaps to close — let's fix them 🎯"}
              </span>
            </div>
          </PCard>
        )}

        {/* Score breakdown */}
        {scores&&(
          <WCard style={{marginBottom:14}} cls="a1 card">
            <p style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",textTransform:"uppercase",padding:"18px 20px 4px"}}>Score Breakdown</p>
            <SBar label="Structured Thinking" score={scores.structured} delay={0}/>
            <SBar label="Business Acumen" score={scores.business} delay={80}/>
            <SBar label="Specificity & Depth" score={scores.depth} delay={160}/>
            <SBar label="PM Maturity" score={scores.maturity} delay={240}/>
            <div style={{height:12}}/>
          </WCard>
        )}

        {/* Assessment */}
        <WCard style={{marginBottom:14}} cls="a2 card">
          <p style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",textTransform:"uppercase",padding:"18px 20px 4px"}}>Assessment</p>
          <div style={{padding:"4px 20px 22px"}}><MD text={assessment}/></div>
        </WCard>

        {/* Answer key */}
        {answerKey&&(
          <PCard pastel={showKey?"#DCFCE7":"#F9FAFB"} style={{marginBottom:16,transition:"background .3s"}} cls="a3 card">
            <button onClick={()=>setShowKey(o=>!o)} style={{background:"none",width:"100%",display:"flex",alignItems:"center",gap:12,padding:"18px 20px",textAlign:"left"}}>
              <div style={{width:40,height:40,borderRadius:12,background:showKey?"#BBF7D0":"#E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .3s"}}>
                <span style={{fontSize:20}}>🔑</span>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:2}}>Answer Key</p>
                <p style={{fontSize:13,color:"#16A34A",fontWeight:500}}>What a strong answer looks like</p>
              </div>
              <div style={{width:28,height:28,borderRadius:99,background:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transform:showKey?"rotate(180deg)":"none",transition:"transform .2s"}}>
                  <path d="M2 4L6 8L10 4" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
            {showKey&&(
              <div style={{padding:"0 20px 22px",borderTop:"2px solid rgba(255,255,255,0.5)"}}>
                <div style={{paddingTop:16}}><MD text={answerKey} isKey={true}/></div>
              </div>
            )}
          </PCard>
        )}

        {/* Guest counter */}
        {isGuest&&(
          <div style={{background:guestCount>=2?"#FEF3C7":"#EDE9FE",borderRadius:16,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",gap:5}}>
              {[1,2].map(n=><div key={n} style={{width:36,height:7,borderRadius:99,background:n<=guestCount?(guestCount>=2?"#D97706":"#7C3AED"):"rgba(0,0,0,0.1)",transition:"background .3s"}}/>)}
            </div>
            <span style={{fontSize:13,color:guestCount>=2?"#92400E":"#4C1D95",fontWeight:600}}>
              {guestCount>=2?"2/2 used — share feedback to help shape this app":`${guestCount}/2 used — 1 more free challenge remaining`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{display:"flex",gap:10}} className="a4">
          <BtnSec onClick={()=>setPhase("home")} style={{minWidth:100}}>{isGuest&&guestCount>=2?"← Home":"Back"}</BtnSec>
          {isGuest&&guestCount>=2?(
            <BtnPrimary onClick={()=>{storageSet("pm_guest_count","2");setPhase("home");}} color="#D97706" style={{flex:1}}>Give Feedback →</BtnPrimary>
          ):(
            <BtnPrimary onClick={()=>{setPhase("home");setTimeout(()=>startChallenge(trackType),50);}} style={{flex:1}}>
              {isGuest?"Try Challenge 2 of 2 →":"Another Challenge →"}
            </BtnPrimary>
          )}
        </div>
      </div>
    </div>
  );

  return null;
}
