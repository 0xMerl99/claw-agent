import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell
} from "recharts";
import { useAgentSocket, API_URL } from "./useAgentSocket";

const X = {
  b:"#08090d",s:"#101118",bd:"#1c1e30",a:"#ff3d00",as:"#ff6d3a",ag:"rgba(255,61,0,.12)",
  g:"#00e676",gd:"rgba(0,230,118,.1)",r:"#ff1744",rd:"rgba(255,23,68,.1)",
  y:"#ffd600",yd:"rgba(255,214,0,.08)",c:"#00e5ff",cd:"rgba(0,229,255,.08)",
  p:"#d500f9",t:"#e4e4ec",d:"#5f6280",m:"#33354a"
};
const ST = ["market-alpha","meme-post","engage-reply","shill","on-chain"];
const SC = ["#ff3d00","#00e5ff","#d500f9","#ffd600","#00e676"];
const IS = {width:"100%",padding:"8px 10px",borderRadius:4,background:X.b,border:`1px solid ${X.bd}`,color:X.t,fontFamily:"inherit",fontSize:11,outline:"none",boxSizing:"border-box"};

function Cd({ti,children}){return <div style={{background:X.s,border:`1px solid ${X.bd}`,borderRadius:8,padding:"14px 16px"}}>{ti&&<div style={{fontSize:8,fontWeight:700,color:X.d,letterSpacing:2.5,textTransform:"uppercase",marginBottom:10}}>{ti}</div>}{children}</div>}
function Tg({c,bg,children}){return <span style={{fontSize:7,fontWeight:800,padding:"2px 6px",borderRadius:3,background:bg,color:c,textTransform:"uppercase"}}>{children}</span>}
function Bt({on,dis,c,gh,sm,children}){return <button onClick={on} disabled={dis} style={{padding:sm?"4px 12px":"9px 20px",borderRadius:5,border:gh?`1px solid ${X.bd}`:"none",background:gh?"transparent":dis?X.bd:`linear-gradient(135deg,${c},${c}cc)`,color:gh?X.d:dis?X.d:"#fff",fontFamily:"inherit",fontSize:sm?9:11,fontWeight:700,cursor:dis?"not-allowed":"pointer"}}>{children}</button>}
function Mb({on,children}){return <button onClick={on} style={{padding:"3px 9px",borderRadius:3,border:`1px solid ${X.bd}`,background:X.b,color:X.d,fontFamily:"inherit",fontSize:8,cursor:"pointer"}}>{children}</button>}
function Sl({v,set,c}){return <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:5,borderRadius:3,background:X.b,position:"relative",cursor:"pointer"}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();set(+Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)).toFixed(2))}}><div style={{height:"100%",borderRadius:3,background:c,width:`${v*100}%`}}/><div style={{position:"absolute",top:-4,left:`calc(${v*100}% - 7px)`,width:14,height:14,borderRadius:"50%",background:c,border:`2px solid ${X.s}`}}/></div><span style={{fontSize:13,fontWeight:800,minWidth:32,textAlign:"right",color:c}}>{v}</span></div>}
function Tog({on,ck}){return <div onClick={ck} style={{width:38,height:20,borderRadius:10,cursor:"pointer",background:on?X.a:X.m,position:"relative",flexShrink:0}}><div style={{width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?21:3,transition:"left .2s"}}/></div>}

const mkE=()=>Array.from({length:24},(_,i)=>({h:`${String(i).padStart(2,"0")}:00`,lk:~~(Math.random()*200+50),rt:~~(Math.random()*60+10)}));
const mkV=()=>{const d=[];let f={};ST.forEach(s=>f[s]=.5);for(let i=1;i<=14;i++){const e={g:`G${i}`};ST.forEach(s=>{f[s]=Math.max(.05,Math.min(1,f[s]+(Math.random()-.4)*.15));e[s]=+f[s].toFixed(3)});d.push(e)}return d};
const mkW=()=>{const r=ST.map(()=>Math.random()*.4+.1),s=r.reduce((a,b)=>a+b);return ST.map((st,i)=>({nm:st,v:+(r[i]/s).toFixed(3),f:+(Math.random()*.6+.3).toFixed(3)}))};
const P0=["🎯 $SOL alpha: momentum. Vol +34%. 👀","Whales loaded 2M $BONK.","POV: Sold $WIF at $0.80 💀","📊 Solana DeFi TVL $8B.","🐋 500K $SOL moved.","🚀 $CLAW 120K mcap. DYOR 👀","CT grief: Buying more 🫡"].map((c,i)=>({id:`t${i}`,tp:["POST","REPLY","QUOTE","POST"][i%4],ct:c,lk:~~(Math.random()*300+20),rt:~~(Math.random()*80),tm:`${12+i}:${String(i*7%60).padStart(2,"0")}`,st:ST[i%ST.length]}));
const SK0=[
  {id:"s1",nm:"Market Analysis",on:true,bi:true,ic:"📊",ct:"analysis",ds:"Token price/volume analysis"},
  {id:"s2",nm:"Alpha Generator",on:true,bi:true,ic:"🎯",ct:"content",ds:"Market insight posts"},
  {id:"s3",nm:"Shill Generator",on:true,bi:true,ic:"📣",ct:"content",ds:"Promotional content"},
  {id:"s4",nm:"On-Chain Narrator",on:true,bi:true,ic:"⛓️",ct:"content",ds:"Blockchain narratives"},
  {id:"s5",nm:"Auto Image Gen",on:true,bi:true,ic:"🖼️",ct:"media",ds:"AI memes & alpha cards"},
  {id:"s6",nm:"Whale Detector",on:true,bi:false,ic:"🐋",ct:"analysis",ds:"Large wallet alerts"},
  {id:"s7",nm:"Sentiment Scanner",on:false,bi:false,ic:"🧠",ct:"analysis",ds:"CT sentiment NLP"},
  {id:"s8",nm:"Meme Forge",on:false,bi:false,ic:"😂",ct:"content",ds:"Meme templates"},
  {id:"s9",nm:"Thread Weaver",on:false,bi:false,ic:"🧵",ct:"content",ds:"Multi-tweet threads"},
  {id:"s10",nm:"Raid Coordinator",on:false,bi:false,ic:"⚔️",ct:"engagement",ds:"Strategic replies"},
];
const TK0=[{sym:"SOL",mint:"So11...112",pr:187.42,ch:4.2},{sym:"BONK",mint:"DezX...263",pr:0.0000234,ch:-2.1},{sym:"WIF",mint:"EKpQ...jm",pr:1.87,ch:12.4}];
const AC0=[{id:"a1",nm:"ClawAgent",hd:"@ClawAgentAI",av:"🦀",on:true},{id:"a2",nm:"MoltBot Alpha",hd:"@MoltBotAlpha",av:"🧬",on:false}];
const normAc=(a={})=>({
  id:a.id||`a${Date.now()}`,
  nm:a.nm??a.name??"",
  hd:a.hd??a.handle??"",
  av:a.av??a.avatar??"🤖",
  on:typeof a.on==="boolean"?a.on:!!a.isActive,
});

export default function ClawDashboard() {
  const ws = useAgentSocket();
  const live = ws.connected;

  const [ag,sAg]=useState({run:false,cy:247,pt:18,rt:34,fl:2847,fd:42,er:3.72,gn:14});
  const [eD]=useState(mkE),[vD]=useState(mkV),[wt]=useState(mkW);
  const [ps,sPs]=useState(P0),[tk,sTk]=useState(TK0),[sk,sSk]=useState(SK0),[ac,sAc]=useState(AC0);
  const [tab,sTab]=useState("overview");
  const [dr,sDr]=useState(""),[pT,sPT]=useState("POST"),[pOk,sPOk]=useState(false),[rTo,sRTo]=useState("");
  const [mP,sMP]=useState([]),[showAI,sShowAI]=useState(false),[aiPr,sAiPr]=useState(""),[aiSt,sAiSt]=useState("meme"),[gn,sGn]=useState(false);
  const fR=useRef(null);
  const [pe,sPe]=useState({tone:"hybrid",hm:.7,ag:.3,td:.6,ed:.4,sl:.6,cp:["wagmi","gm","stay clawed in"],tp:["solana","defi","memecoins","ai-agents"],av:["politics"],_c:"",_t:"",_a:""});
  const [sv,sSv]=useState(false);
  const [nM,sNM]=useState(""),[nS,sNS]=useState("");
  const [sAA,sSAA]=useState(false),[nAc,sNAc]=useState({nm:"",hd:"",ak:"",as:"",at:"",ats:"",bt:""});
  const [sF,sSF]=useState("all"),[csn,sCsn]=useState("");
  const [sched,setSched]=useState({postsPerHour:3,maxPostsPerDay:50,replyDelay:30,quietStart:4,quietEnd:8,autoImage:true,evoInterval:60});
  const [lg,sLg]=useState([{t:"14:32",m:"🔄 Cycle 247",k:"i"},{t:"14:32",m:"📝 Posted $SOL alpha",k:"o"},{t:"14:31",m:"⛓️ Whale: 500K SOL",k:"w"},{t:"14:30",m:"🧬 MoltBot Gen 14",k:"i"}]);
  const [cmdToast,sCmdToast]=useState("");
  const nw=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const lg_=(m,k="i")=>sLg(p=>[{t:nw(),m,k},...p.slice(0,60)]);
  const cmd_=(m)=>{sCmdToast(m);setTimeout(()=>sCmdToast(""),2200)};

  // ── WS event listeners ──
  useEffect(()=>{
    const u=[
      ws.on("init",d=>{
        sAg(s=>({
          ...s,
          ...(d.agentState||{}),
          run: typeof d.isRunning === "boolean" ? d.isRunning : !!d.agentState?.isRunning,
        }));
        if(d.accounts){const aa=d.activeAccountId;sAc(d.accounts.map(x=>{const n=normAc(x);return {...n,on:aa?n.id===aa:n.on}}))}
        lg_("🔌 Connected","o")
      }),
      ws.on("agent:state",d=>sAg(s=>({...s,...d}))),
      ws.on("agent:started",d=>{sAg(s=>({...s,run:true,...d}));cmd_("Ack agent:started");lg_("▶ Agent started","o")}),
      ws.on("agent:stopped",()=>{sAg(s=>({...s,run:false}));cmd_("Ack agent:stopped");lg_("⏹ Stopped","w")}),
      ws.on("agent:cycle",d=>{sAg(s=>({...s,cy:d.cycle||s.cy+1}));lg_(`🔄 Cycle ${d.cycle}`)}),
      ws.on("agent:post",d=>{sPs(p=>[{id:`ws${Date.now()}`,tp:d.type||"POST",ct:d.content,lk:0,rt:0,tm:nw(),st:d.strategy||"auto"},...p]);lg_(`📝 ${d.content?.slice(0,45)}...`,"o")}),
      ws.on("agent:reply",d=>{sPs(p=>[{id:`ws${Date.now()}`,tp:"REPLY",ct:d.content,lk:0,rt:0,tm:nw(),st:"auto"},...p]);lg_(`💬 ${d.content?.slice(0,40)}...`,"o")}),
      ws.on("agent:evolution",d=>lg_(`🧬 ${d.message||"Evolution complete"}`)),
      ws.on("agent:onchain",d=>lg_(`⛓️ ${d.summary||d.type}`,"w")),
      ws.on("agent:image",d=>lg_(`🖼️ AutoImg: ${d.style}`,"o")),
      ws.on("agent:error",d=>lg_(`❌ ${d.message}`,"w")),
      ws.on("agent:metrics",d=>{if(d.engagement)sAg(s=>({...s,er:d.engagement}));if(d.followers)sAg(s=>({...s,fl:d.followers}))}),
      ws.on("post:sent",d=>lg_(`✅ Delivered`,"o")),
      ws.on("post:queued",()=>lg_("📋 Queued","o")),
      ws.on("personality:updated",()=>lg_("🎭 Personality synced","o")),
      ws.on("skill:toggled",d=>lg_(`🔧 ${d.enabled?"ON":"OFF"}: ${d.skillId}`,d.enabled?"o":"w")),
      ws.on("token:added",d=>{sTk(p=>[...p,{sym:d.symbol||"???",mint:d.mint,pr:0,ch:0}]);lg_(`📌 +$${d.symbol}`,"o")}),
      ws.on("token:removed",d=>{sTk(p=>p.filter(t=>t.mint!==d.mint));lg_("🗑️ Token removed","w")}),
      ws.on("account:switched",d=>{sAc(p=>p.map(a=>({...normAc(a),on:a.id===d.accountId})));cmd_("Ack account:switched");lg_("🔄 Account switched","o")}),
      ws.on("account:added",d=>{const na=normAc(d);sAc(p=>[...p,na]);lg_(`➕ ${na.nm||na.hd||"Account"}`,"o")}),
      ws.on("account:removed",d=>{sAc(p=>p.filter(a=>a.id!==d.accountId));lg_("🗑️ Account removed","w")}),
      ws.on("image:generated",d=>{sMP(p=>[...p,{t:"image",url:d.url}].slice(0,4));lg_("🖼️ Generated","o");sGn(false)}),
      ws.on("image:error",d=>{lg_(`❌ ImgGen: ${d.message}`,"w");sGn(false)}),
      ws.on("config:updated",()=>lg_("⚙️ Config synced","o")),
    ];
    return ()=>u.forEach(fn=>fn?.());
  },[ws.on]);

  // Demo tick — only when NOT connected
  useEffect(()=>{if(live)return;const iv=setInterval(()=>{sAg(s=>({...s,cy:s.cy+1,er:+Math.max(.5,Math.min(8,s.er+(Math.random()-.48)*.08)).toFixed(2)}));sTk(p=>p.map(t=>({...t,pr:+(t.pr*(1+(Math.random()-.5)*.004)).toPrecision(6),ch:+(t.ch+(Math.random()-.5)*.3).toFixed(1)})))},5e3);return()=>clearInterval(iv)},[live]);

  // ── Actions (all wired to WS when live, local fallback in demo) ──
  const hF=e=>{const f=Array.from(e.target.files||[]).slice(0,4-mP.length).map(f=>({t:f.type.startsWith("video/")?"video":"image",url:URL.createObjectURL(f),file:f}));sMP(p=>[...p,...f].slice(0,4))};

  const genAI=async()=>{if(!aiPr.trim())return;sGn(true);lg_(`🖼️ Generating ${aiSt}...`);
    if(live){ws.send("image:generate",{prompt:aiPr,style:aiSt});sAiPr("");return}
    await new Promise(r=>setTimeout(r,1200));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#101118" width="200" height="200"/><rect fill="#ff3d0022" x="10" y="10" width="180" height="180" rx="8"/><text fill="#ff3d00" font-family="monospace" font-size="11" x="50%" y="45%" text-anchor="middle">AI Generated</text><text fill="#5f6280" font-family="monospace" font-size="9" x="50%" y="58%" text-anchor="middle">${aiSt}</text></svg>`;
    sMP(p=>[...p,{t:"image",url:`data:image/svg+xml,${encodeURIComponent(svg)}`}].slice(0,4));lg_(`🖼️ Done (${aiSt})`,"o");sGn(false);sAiPr("")};

  const sendP=async()=>{if(!dr.trim()||dr.length>280)return;
    let mediaIds=[];
    if(mP.length>0&&live){
      try{const fd=new FormData();mP.forEach(m=>{if(m.file)fd.append("files",m.file)});
        const r=await fetch(`${API_URL}/api/media/upload`,{method:"POST",body:fd});
        const d=await r.json();mediaIds=d.files?.map(f=>f.id)||[];
      }catch(e){lg_(`❌ Upload: ${e}`,"w")}
    }
    if(live){ws.send("post:send",{content:dr,type:pT,replyToId:rTo||undefined,mediaIds})}
    sPs(p=>[{id:`m${Date.now()}`,tp:pT,ct:dr,lk:0,rt:0,tm:nw(),st:"manual",md:mP.length?mP.map(m=>({t:m.t})):null},...p]);
    lg_(`📤 ${pT}${rTo?` → ${rTo.slice(0,12)}...`:""}${mP.length?` +${mP.length}📷`:""}: ${dr.slice(0,40)}...`,"o");
    sAg(s=>({...s,pt:s.pt+1}));sDr("");sRTo("");sMP([]);sPOk(true);setTimeout(()=>sPOk(false),3e3)};

  const toggleAgent=()=>{
    if(live){
      const cmd = ag.run?"agent:stop":"agent:start";
      const ok = ws.send(cmd);
      cmd_(ok?`Sent ${cmd}`:`Failed ${cmd}`);
      lg_(ok?(ag.run?"⏹ Stopping...":"▶ Starting..."):"⚠️ Not connected to backend","w");
      return;
    }
    sAg(s=>({...s,run:!s.run}));
    lg_(ag.run?"⏹ Stopping...":"▶ Starting...");
  };

  const savePe=()=>{
    if(live){ws.send("personality:update",{tone:pe.tone,humor:pe.hm,aggression:pe.ag,techDepth:pe.td,emojiDensity:pe.ed,slangLevel:pe.sl,catchphrases:pe.cp,topics:pe.tp,avoidTopics:pe.av})}
    sSv(true);setTimeout(()=>sSv(false),3e3);lg_(`🎭 Saved: ${pe.tone}`,"o");
  };

  const togSk=(s)=>{
    sSk(p=>p.map(x=>x.id===s.id?{...x,on:!x.on}:x));
    if(live){ws.send("skill:toggle",{skillId:s.id,enabled:!s.on})}
    lg_(`🔧 ${s.on?"OFF":"ON"}: ${s.nm}`,s.on?"w":"o");
  };

  const addTk=()=>{if(!nM.trim())return;
    const sym=nS||nM.slice(0,4).toUpperCase();
    if(live){ws.send("token:add",{mint:nM,symbol:sym})}
    else{sTk(p=>[...p,{sym,mint:nM,pr:0,ch:0}])}
    lg_(`📌 +$${sym}`,"o");sNM("");sNS("")};

  const rmTk=(t)=>{
    if(live){ws.send("token:remove",{mint:t.mint})}
    else{sTk(p=>p.filter(x=>x.mint!==t.mint))}
    lg_(`🗑️ -$${t.sym}`,"w")};

  const swAc=(a)=>{
    if(live){
      const ok = ws.send("account:switch",{accountId:a.id});
      cmd_(ok?"Sent account:switch":"Failed account:switch");
    }
    else{sAc(p=>p.map(x=>({...x,on:x.id===a.id})))}
    lg_(`🔄 → ${a.nm}`,"o")};

  const addAc=()=>{if(!nAc.nm||!nAc.hd)return;
    if(live){ws.send("account:add",{name:nAc.nm,handle:nAc.hd,apiKey:nAc.ak,apiSecret:nAc.as,accessToken:nAc.at,accessTokenSecret:nAc.ats,bearerToken:nAc.bt})}
    else{sAc(p=>[...p,{id:`a${Date.now()}`,nm:nAc.nm,hd:nAc.hd,av:"🤖",on:false}])}
    lg_(`➕ ${nAc.nm}`,"o");sNAc({nm:"",hd:"",ak:"",as:"",at:"",ats:"",bt:""});sSAA(false)};

  const rmAc=(a)=>{
    if(live){ws.send("account:remove",{accountId:a.id})}
    else{sAc(p=>p.filter(x=>x.id!==a.id))}
    lg_("🗑️ Removed","w")};

  const addSk=()=>{if(!csn.trim())return;
    const sk={id:`c${Date.now()}`,nm:csn,on:true,bi:false,ic:"🔌",ct:"custom",ds:"Custom"};
    if(live){ws.send("skill:register",{name:csn,description:"Custom skill"})}
    sSk(p=>[...p,sk]);lg_(`🔧 +${csn}`,"o");sCsn("")};

  const cc=dr.length,co=cc>280;
  const rd=[{s:"Humor",v:pe.hm},{s:"Tech",v:pe.td},{s:"Aggro",v:pe.ag},{s:"Emoji",v:pe.ed},{s:"Slang",v:pe.sl}];
  const aA=ac.find(a=>a.on);
  const fSk=sF==="all"?sk:sk.filter(s=>s.ct===sF);
  const TABS=[{id:"overview",i:"📊"},{id:"compose",i:"✏️"},{id:"personality",i:"🎭"},{id:"skills",i:"🔧"},{id:"tokens",i:"💰"},{id:"accounts",i:"👤"},{id:"settings",i:"⚙️"},{id:"evolution",i:"🧬"},{id:"feed",i:"📡"}];

  return (
    <div style={{background:X.b,color:X.t,minHeight:"100vh",fontFamily:"'JetBrains Mono','Fira Code',monospace"}}>
      {cmdToast&&<div style={{position:"fixed",top:10,right:12,zIndex:1000,padding:"6px 10px",borderRadius:4,background:X.s,border:`1px solid ${X.a}66`,color:X.a,fontSize:10,fontWeight:700,letterSpacing:.5}}>{cmdToast}</div>}
      <header style={{position:"sticky",top:0,zIndex:50,background:`${X.b}f0`,borderBottom:`1px solid ${X.bd}`,backdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:1480,margin:"0 auto",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:24,fontWeight:900,background:`linear-gradient(135deg,${X.a},${X.as})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🦀 CLAW</span>
            <span style={{fontSize:8,color:X.d,letterSpacing:4}}>COMMAND CENTER</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {aA&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:4,background:X.s,border:`1px solid ${X.bd}`,fontSize:9}}><span>{aA.av}</span><span style={{fontWeight:700}}>{aA.nm}</span><span style={{color:X.d}}>{aA.hd}</span></div>}
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:3,background:live?X.gd:X.yd}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:live?X.g:X.y}}/>
              <span style={{fontSize:8,color:live?X.g:X.y,fontWeight:700}}>{live?"LIVE":"DEMO"}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:3,background:ag.run?X.gd:X.rd}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:ag.run?X.g:X.r}}/>
              <span style={{fontSize:8,color:ag.run?X.g:X.r,fontWeight:700}}>{ag.run?"ON":"OFF"}</span>
            </div>
            <Bt on={toggleAgent} c={ag.run?X.r:X.g} sm>{ag.run?"⏹":"▶"}</Bt>
          </div>
        </div>
        <div style={{maxWidth:1480,margin:"0 auto",padding:"0 20px",display:"flex",overflowX:"auto"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>sTab(t.id)} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap",background:tab===t.id?X.ag:"transparent",color:tab===t.id?X.a:X.d,borderBottom:tab===t.id?`2px solid ${X.a}`:"2px solid transparent"}}>{t.i} {t.id}</button>)}
        </div>
      </header>

      <main style={{maxWidth:1480,margin:"0 auto",padding:"14px 20px 50px"}}>

        {tab==="overview"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:8}}>
            {[{l:"Cycle",v:ag.cy,i:"🔄"},{l:"Posts",v:ag.pt,i:"📝"},{l:"Replies",v:ag.rt,i:"💬"},{l:"Followers",v:ag.fl.toLocaleString(),i:"👥",sub:`+${ag.fd}`,sc:X.g},{l:"Engage",v:`${ag.er}%`,i:"📈"},{l:"Gen",v:`G${ag.gn}`,i:"🧬"}].map((s,i)=><Cd key={i}><div style={{fontSize:8,color:X.d,letterSpacing:2,marginBottom:3}}>{s.i} {s.l}</div><div style={{fontSize:21,fontWeight:800}}>{s.v}{s.sub&&<span style={{fontSize:11,color:s.sc,marginLeft:5}}>{s.sub}</span>}</div></Cd>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"5fr 2fr",gap:10}}>
            <Cd ti="ENGAGEMENT 24H"><ResponsiveContainer width="100%" height={165}><AreaChart data={eD}><defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={X.a} stopOpacity={.25}/><stop offset="100%" stopColor={X.a} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="h" tick={{fill:X.d,fontSize:7}} tickLine={false} axisLine={false} interval={3}/><YAxis tick={{fill:X.d,fontSize:7}} tickLine={false} axisLine={false} width={25}/><Tooltip contentStyle={{background:X.s,border:`1px solid ${X.bd}`,borderRadius:4,fontSize:9}}/><Area type="monotone" dataKey="lk" stroke={X.a} fill="url(#gl)" strokeWidth={2}/><Area type="monotone" dataKey="rt" stroke={X.c} fill="none" strokeWidth={1.5}/></AreaChart></ResponsiveContainer></Cd>
            <Cd ti="STRATEGY"><ResponsiveContainer width="100%" height={165}><PieChart><Pie data={wt} dataKey="v" nameKey="nm" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} strokeWidth={0}>{wt.map((_,i)=><Cell key={i} fill={SC[i]}/>)}</Pie></PieChart></ResponsiveContainer></Cd>
          </div>
          <Cd ti="TOKENS"><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{tk.map((t,i)=><div key={i} style={{padding:"10px",borderRadius:5,background:X.b,border:`1px solid ${X.bd}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:800}}>${t.sym}</span><Tg c={t.ch>=0?X.g:X.r} bg={t.ch>=0?X.gd:X.rd}>{t.ch>=0?"+":""}{t.ch}%</Tg></div><div style={{fontSize:15,fontWeight:700}}>${t.pr<.01?(+t.pr).toFixed(7):(+t.pr).toFixed(2)}</div></div>)}</div></Cd>
        </div>}

        {tab==="compose"&&<div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Cd ti="✏️ COMPOSE">
              <div style={{display:"flex",gap:5,marginBottom:10}}>{["POST","REPLY","QUOTE"].map(t=><button key={t} onClick={()=>sPT(t)} style={{padding:"6px 13px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600,background:pT===t?X.a:X.b,color:pT===t?"#fff":X.d}}>{t}</button>)}</div>
              {pT!=="POST"&&<div style={{marginBottom:8}}><div style={{fontSize:8,color:X.a,letterSpacing:1,marginBottom:3}}>{pT==="REPLY"?"💬 REPLY TO TWEET ID":"🔁 QUOTE TWEET ID"}</div><input value={rTo} onChange={e=>sRTo(e.target.value)} placeholder={pT==="REPLY"?"Paste tweet ID to reply to...":"Paste tweet ID to quote..."} style={{...IS,border:`1px solid ${rTo?X.a:X.bd}`}}/><div style={{fontSize:7,color:X.m,marginTop:3}}>Find tweet ID in the URL: twitter.com/user/status/<span style={{color:X.t}}>1234567890</span></div></div>}
              <div style={{position:"relative"}}><textarea value={dr} onChange={e=>sDr(e.target.value)} placeholder="What's happening..." rows={4} style={{width:"100%",padding:11,borderRadius:5,background:X.b,border:`1px solid ${co?X.r:dr?X.a:X.bd}`,color:X.t,fontFamily:"inherit",fontSize:12,lineHeight:1.6,resize:"vertical",outline:"none",boxSizing:"border-box"}}/><span style={{position:"absolute",bottom:8,right:10,fontSize:9,fontWeight:600,color:co?X.r:cc>240?X.y:X.d}}>{cc}/280</span></div>
              {mP.length>0&&<div style={{display:"flex",gap:6,marginTop:6}}>{mP.map((m,i)=><div key={i} style={{position:"relative",width:64,height:64,borderRadius:5,overflow:"hidden",border:`1px solid ${X.bd}`}}>{m.t==="video"?<div style={{width:"100%",height:"100%",background:X.s,display:"flex",alignItems:"center",justifyContent:"center"}}>🎬</div>:<img src={m.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}<button onClick={()=>sMP(p=>p.filter((_,j)=>j!==i))} style={{position:"absolute",top:1,right:1,width:14,height:14,borderRadius:"50%",border:"none",background:X.r,color:"#fff",fontSize:7,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>)}</div>}
              <div style={{display:"flex",gap:5,marginTop:6,alignItems:"center"}}><input ref={fR} type="file" multiple accept="image/*,video/*" onChange={hF} style={{display:"none"}}/><Mb on={()=>fR.current?.click()}>📷 Media</Mb><Mb on={()=>sShowAI(s=>!s)}>🖼️ AI {showAI?"▾":"▸"}</Mb><span style={{fontSize:7,color:X.d}}>{mP.length}/4</span></div>
              {showAI&&<div style={{marginTop:6,padding:10,borderRadius:5,background:X.b,border:`1px solid ${X.bd}`}}><div style={{display:"flex",gap:3,marginBottom:6,flexWrap:"wrap"}}>{["meme","alpha-card","chart","degen-art"].map(s=><button key={s} onClick={()=>sAiSt(s)} style={{padding:"3px 8px",borderRadius:3,border:`1px solid ${aiSt===s?X.a:X.bd}`,background:aiSt===s?X.ag:"transparent",color:aiSt===s?X.a:X.d,fontFamily:"inherit",fontSize:8,cursor:"pointer"}}>{s}</button>)}</div><div style={{display:"flex",gap:5}}><input value={aiPr} onChange={e=>sAiPr(e.target.value)} onKeyDown={e=>e.key==="Enter"&&genAI()} placeholder="Describe..." style={{flex:1,padding:"6px 8px",borderRadius:3,background:X.s,border:`1px solid ${X.bd}`,color:X.t,fontFamily:"inherit",fontSize:10,outline:"none"}}/><Bt on={genAI} dis={!aiPr.trim()||gn} c={X.p} sm>{gn?"⏳":"✨"}</Bt></div></div>}
              <div style={{display:"flex",gap:6,marginTop:8}}><Bt on={sendP} dis={!dr.trim()||co||(pT!=="POST"&&!rTo.trim())} c={X.a}>🚀 SEND {pT}</Bt><Bt on={()=>{if(!dr.trim())return;if(live)ws.send("post:queue",{content:dr,type:pT,replyToId:rTo||undefined});lg_("📋 Queued");sDr("");sRTo("")}} dis={!dr.trim()||co} gh>📋</Bt></div>
              {pT!=="POST"&&!rTo.trim()&&<div style={{marginTop:4,fontSize:8,color:X.y}}>⚠️ Enter a tweet ID to {pT.toLowerCase()}</div>}
              {pOk&&<div style={{marginTop:6,padding:"5px 10px",borderRadius:3,background:X.gd,color:X.g,fontSize:10,fontWeight:600}}>✅ Sent!</div>}
            </Cd>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Cd ti="PREVIEW"><div style={{padding:10,borderRadius:6,background:"#15202b",border:"1px solid #38444d",minHeight:80}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${X.a},${X.as})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{aA?.av||"🦀"}</div><div><div style={{fontWeight:700,fontSize:10,color:"#e7e9ea"}}>{aA?.nm||"Agent"}</div><div style={{fontSize:8,color:"#71767b"}}>{aA?.hd} · now</div></div></div><div style={{fontSize:10,color:"#e7e9ea",lineHeight:1.5,whiteSpace:"pre-wrap",fontFamily:"sans-serif"}}>{dr||<span style={{color:"#71767b"}}>Preview...</span>}</div>{mP.length>0&&<div style={{display:"flex",gap:3,marginTop:6}}>{mP.map((m,i)=><div key={i} style={{width:50,height:50,borderRadius:5,background:X.s,overflow:"hidden"}}>{m.t==="video"?<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>🎬</div>:<img src={m.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</div>)}</div>}</div></Cd>
            <Cd ti="PERSONALITY"><ResponsiveContainer width="100%" height={120}><RadarChart data={rd}><PolarGrid stroke={X.bd}/><PolarAngleAxis dataKey="s" tick={{fill:X.d,fontSize:7}}/><PolarRadiusAxis tick={false} domain={[0,1]} axisLine={false}/><Radar dataKey="v" stroke={X.a} fill={X.a} fillOpacity={.15} strokeWidth={2}/></RadarChart></ResponsiveContainer></Cd>
          </div>
        </div>}

        {tab==="personality"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Cd ti="🎭 PERSONALITY">
            <div style={{marginBottom:14}}><div style={{fontSize:8,color:X.d,letterSpacing:1.5,marginBottom:6}}>TONE</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["degen","analyst","meme-lord","alpha-hunter","hybrid"].map(t=><button key={t} onClick={()=>sPe(p=>({...p,tone:t}))} style={{padding:"6px 12px",borderRadius:4,border:`1px solid ${pe.tone===t?X.a:X.bd}`,background:pe.tone===t?X.ag:X.b,color:pe.tone===t?X.a:X.d,fontFamily:"inherit",fontSize:9,fontWeight:700,cursor:"pointer",textTransform:"uppercase"}}>{t}</button>)}</div></div>
            {[{l:"Humor",k:"hm",c:X.y},{l:"Aggression",k:"ag",c:X.r},{l:"Tech Depth",k:"td",c:X.c},{l:"Emoji",k:"ed",c:X.p},{l:"Slang",k:"sl",c:X.as}].map(s=><div key={s.k} style={{marginBottom:12}}><div style={{fontSize:8,color:X.d,letterSpacing:1.5,marginBottom:6}}>{s.l}</div><Sl v={pe[s.k]} set={v=>sPe(p=>({...p,[s.k]:v}))} c={s.c}/></div>)}
            <div style={{display:"flex",gap:6}}><Bt on={savePe} c={X.a}>💾 SAVE</Bt>{sv&&<span style={{fontSize:9,color:X.g,fontWeight:600,alignSelf:"center"}}>✅</span>}</div>
          </Cd>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Cd ti="RADAR"><ResponsiveContainer width="100%" height={180}><RadarChart data={rd}><PolarGrid stroke={X.bd}/><PolarAngleAxis dataKey="s" tick={{fill:X.d,fontSize:8}}/><PolarRadiusAxis tick={false} domain={[0,1]} axisLine={false}/><Radar dataKey="v" stroke={X.a} fill={X.a} fillOpacity={.18} strokeWidth={2.5} dot={{fill:X.a,r:3}}/></RadarChart></ResponsiveContainer></Cd>
            {[{ti:"💬 CATCHPHRASES",items:pe.cp,c:X.a,rk:"cp",ik:"_c"},{ti:"📌 TOPICS",items:pe.tp,c:X.c,rk:"tp",ik:"_t"},{ti:"🚫 AVOID",items:pe.av,c:X.r,rk:"av",ik:"_a"}].map(sec=><Cd key={sec.ti} ti={sec.ti}><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{sec.items.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:4,background:sec.c+"18",border:`1px solid ${sec.c}33`,fontSize:9,color:sec.c,fontWeight:600}}>{c}<span onClick={()=>sPe(p=>({...p,[sec.rk]:p[sec.rk].filter((_,j)=>j!==i)}))} style={{cursor:"pointer",opacity:.6,fontSize:8}}>✕</span></div>)}</div><div style={{display:"flex",gap:4}}><input value={pe[sec.ik]} onChange={e=>sPe(p=>({...p,[sec.ik]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"&&pe[sec.ik].trim())sPe(p=>({...p,[sec.rk]:[...p[sec.rk],p[sec.ik].trim()],[sec.ik]:""}))}} placeholder="Add..." style={{flex:1,padding:"5px 8px",borderRadius:3,background:X.b,border:`1px solid ${X.bd}`,color:X.t,fontFamily:"inherit",fontSize:9,outline:"none"}}/><Mb on={()=>{if(pe[sec.ik].trim())sPe(p=>({...p,[sec.rk]:[...p[sec.rk],p[sec.ik].trim()],[sec.ik]:""}))}}> +</Mb></div></Cd>)}
          </div>
        </div>}

        {tab==="skills"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}><Cd><div style={{fontSize:7,color:X.d,marginBottom:2}}>🔧 TOTAL</div><div style={{fontSize:24,fontWeight:800}}>{sk.length}</div></Cd><Cd><div style={{fontSize:7,color:X.d,marginBottom:2}}>✅ ON</div><div style={{fontSize:24,fontWeight:800,color:X.g}}>{sk.filter(s=>s.on).length}</div></Cd><Cd><div style={{fontSize:7,color:X.d,marginBottom:2}}>⏸ OFF</div><div style={{fontSize:24,fontWeight:800,color:X.d}}>{sk.filter(s=>!s.on).length}</div></Cd></div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["all","analysis","content","media","engagement","custom"].map(f=><button key={f} onClick={()=>sSF(f)} style={{padding:"3px 10px",borderRadius:3,border:`1px solid ${sF===f?X.a:X.bd}`,background:sF===f?X.ag:"transparent",color:sF===f?X.a:X.d,fontFamily:"inherit",fontSize:8,fontWeight:600,cursor:"pointer",textTransform:"uppercase"}}>{f}</button>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>{fSk.map(s=><div key={s.id} style={{background:X.s,border:`1px solid ${s.on?X.a+"33":X.bd}`,borderRadius:7,padding:"12px 14px",opacity:s.on?1:.5}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18}}>{s.ic}</span><div><div style={{fontSize:11,fontWeight:700}}>{s.nm}</div><div style={{display:"flex",gap:3,marginTop:2}}>{s.bi&&<Tg c={X.c} bg={X.cd}>CORE</Tg>}<Tg c={X.d} bg={X.b}>{s.ct}</Tg></div></div></div><Tog on={s.on} ck={()=>togSk(s)}/></div><div style={{fontSize:9,color:X.d,lineHeight:1.5}}>{s.ds}</div></div>)}</div>
          <Cd ti="🔌 ADD SKILL"><div style={{display:"flex",gap:6,alignItems:"end"}}><div style={{flex:1}}><div style={{fontSize:7,color:X.d,marginBottom:2}}>NAME</div><input value={csn} onChange={e=>sCsn(e.target.value)} placeholder="my-skill" style={IS}/></div><Bt on={addSk} dis={!csn.trim()} c={X.a} sm>+ Add</Bt></div></Cd>
        </div>}

        {tab==="tokens"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Cd ti="💰 TOKENS">{tk.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:5,background:X.b,border:`1px solid ${X.bd}`,marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontWeight:800,fontSize:14,minWidth:55}}>${t.sym}</span><span style={{fontSize:8,color:X.d}}>{t.mint}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:700}}>${t.pr<.01?(+t.pr).toFixed(7):(+t.pr).toFixed(2)}</span><Tg c={t.ch>=0?X.g:X.r} bg={t.ch>=0?X.gd:X.rd}>{t.ch>=0?"+":""}{t.ch}%</Tg><button onClick={()=>rmTk(t)} style={{padding:"3px 6px",borderRadius:2,border:`1px solid ${X.r}44`,background:X.rd,color:X.r,fontSize:8,cursor:"pointer",fontWeight:700}}>✕</button></div></div>)}</Cd>
          <Cd ti="➕ ADD"><div style={{display:"flex",gap:8,alignItems:"end"}}><div style={{width:100}}><div style={{fontSize:7,color:X.d,marginBottom:2}}>SYMBOL</div><input value={nS} onChange={e=>sNS(e.target.value)} placeholder="SOL" style={IS}/></div><div style={{flex:1}}><div style={{fontSize:7,color:X.d,marginBottom:2}}>MINT</div><input value={nM} onChange={e=>sNM(e.target.value)} placeholder="Paste mint..." style={IS}/></div><Bt on={addTk} dis={!nM.trim()} c={X.a}>+ Add</Bt></div></Cd>
        </div>}

        {tab==="accounts"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Cd ti="👤 ACCOUNTS">{ac.map(a=>{const A=normAc(a);return <div key={A.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:7,background:A.on?X.ag:X.b,border:`1px solid ${A.on?X.a+"55":X.bd}`,marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:"50%",background:A.on?`linear-gradient(135deg,${X.a},${X.as})`:X.s,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:`2px solid ${A.on?X.a:X.bd}`}}>{A.av}</div><div><div style={{fontSize:13,fontWeight:700}}>{A.nm||"Unnamed account"}</div><div style={{fontSize:10,color:X.d}}>{A.hd||"@unknown"}</div></div>{A.on&&<Tg c={X.g} bg={X.gd}>ACTIVE</Tg>}</div><div style={{display:"flex",gap:5}}>{!A.on&&<Bt on={()=>swAc(A)} c={X.a} sm>Switch</Bt>}<button onClick={()=>rmAc(A)} style={{padding:"4px 8px",borderRadius:3,border:`1px solid ${X.r}44`,background:X.rd,color:X.r,fontSize:8,cursor:"pointer",fontWeight:700}}>Remove</button></div></div>})}</Cd>
          {!sAA?<div onClick={()=>sSAA(true)} style={{padding:12,borderRadius:7,border:`1px dashed ${X.bd}`,textAlign:"center",color:X.d,fontSize:11,cursor:"pointer"}}>+ Add Agent Account</div>
          :<Cd ti="➕ NEW ACCOUNT"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><div style={{fontSize:7,color:X.d,marginBottom:2}}>AGENT NAME</div><input value={nAc.nm} onChange={e=>sNAc(p=>({...p,nm:e.target.value}))} placeholder="MyAgent" style={IS}/></div>
            <div><div style={{fontSize:7,color:X.d,marginBottom:2}}>X HANDLE</div><input value={nAc.hd} onChange={e=>sNAc(p=>({...p,hd:e.target.value}))} placeholder="@handle" style={IS}/></div>
            <div><div style={{fontSize:7,color:X.a,marginBottom:2}}>API KEY</div><input value={nAc.ak} onChange={e=>sNAc(p=>({...p,ak:e.target.value}))} type="password" placeholder="Twitter API Key" style={IS}/></div>
            <div><div style={{fontSize:7,color:X.a,marginBottom:2}}>API SECRET</div><input value={nAc.as} onChange={e=>sNAc(p=>({...p,as:e.target.value}))} type="password" placeholder="Twitter API Secret" style={IS}/></div>
            <div><div style={{fontSize:7,color:X.a,marginBottom:2}}>ACCESS TOKEN</div><input value={nAc.at} onChange={e=>sNAc(p=>({...p,at:e.target.value}))} type="password" placeholder="Access Token" style={IS}/></div>
            <div><div style={{fontSize:7,color:X.a,marginBottom:2}}>ACCESS TOKEN SECRET</div><input value={nAc.ats} onChange={e=>sNAc(p=>({...p,ats:e.target.value}))} type="password" placeholder="Access Token Secret" style={IS}/></div>
            <div style={{gridColumn:"1/-1"}}><div style={{fontSize:7,color:X.a,marginBottom:2}}>BEARER TOKEN</div><input value={nAc.bt} onChange={e=>sNAc(p=>({...p,bt:e.target.value}))} type="password" placeholder="Bearer Token" style={IS}/></div>
          </div><div style={{marginTop:8,padding:"8px 12px",borderRadius:5,background:X.b,border:`1px solid ${X.bd}`,fontSize:8,color:X.d,lineHeight:1.6}}>💡 Get keys from <span style={{color:X.c,fontWeight:700}}>developer.twitter.com</span> → Create App → Keys & Tokens. Need <span style={{color:X.t}}>Read+Write</span>.</div><div style={{display:"flex",gap:6,marginTop:10}}><Bt on={addAc} dis={!nAc.nm||!nAc.hd||!nAc.ak||!nAc.as||!nAc.at||!nAc.ats||!nAc.bt} c={X.g}>✓ Create</Bt><Bt on={()=>sSAA(false)} gh>Cancel</Bt></div></Cd>}
        </div>}

        {tab==="settings"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Cd ti="⚙️ POST SCHEDULE">
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:9,color:X.d,letterSpacing:1}}>POSTS PER HOUR</span><span style={{fontSize:18,fontWeight:800,color:X.a}}>{sched.postsPerHour}</span></div>
              <input type="range" min={1} max={12} value={sched.postsPerHour} onChange={e=>setSched(s=>({...s,postsPerHour:+e.target.value}))} style={{width:"100%",accentColor:X.a}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:X.m}}><span>1/hr (conservative)</span><span>12/hr (aggressive)</span></div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:9,color:X.d,letterSpacing:1}}>MAX POSTS PER DAY</span><span style={{fontSize:18,fontWeight:800,color:X.c}}>{sched.maxPostsPerDay}</span></div>
              <input type="range" min={5} max={200} step={5} value={sched.maxPostsPerDay} onChange={e=>setSched(s=>({...s,maxPostsPerDay:+e.target.value}))} style={{width:"100%",accentColor:X.c}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:X.m}}><span>5/day</span><span>200/day</span></div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:9,color:X.d,letterSpacing:1}}>REPLY DELAY (seconds)</span><span style={{fontSize:18,fontWeight:800,color:X.y}}>{sched.replyDelay}s</span></div>
              <input type="range" min={5} max={120} step={5} value={sched.replyDelay} onChange={e=>setSched(s=>({...s,replyDelay:+e.target.value}))} style={{width:"100%",accentColor:X.y}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:X.m}}><span>5s (fast)</span><span>120s (natural)</span></div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:9,color:X.d,letterSpacing:1,marginBottom:8}}>QUIET HOURS (UTC) — Agent sleeps</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{flex:1}}><div style={{fontSize:7,color:X.m,marginBottom:3}}>START</div><input type="number" min={0} max={23} value={sched.quietStart} onChange={e=>setSched(s=>({...s,quietStart:+e.target.value}))} style={{...IS,textAlign:"center",fontSize:16,fontWeight:800}}/></div>
                <span style={{fontSize:14,color:X.d,marginTop:14}}>→</span>
                <div style={{flex:1}}><div style={{fontSize:7,color:X.m,marginBottom:3}}>END</div><input type="number" min={0} max={23} value={sched.quietEnd} onChange={e=>setSched(s=>({...s,quietEnd:+e.target.value}))} style={{...IS,textAlign:"center",fontSize:16,fontWeight:800}}/></div>
              </div>
            </div>
            <div style={{padding:"10px 12px",borderRadius:5,background:X.b,border:`1px solid ${X.bd}`,fontSize:9,color:X.d,lineHeight:1.8}}>
              📊 At <span style={{color:X.a,fontWeight:700}}>{sched.postsPerHour}/hr</span> with quiet hours {sched.quietStart}:00–{sched.quietEnd}:00 UTC:<br/>
              ≈ <span style={{color:X.t,fontWeight:700}}>{Math.min(sched.maxPostsPerDay, sched.postsPerHour * (24 - (sched.quietEnd - sched.quietStart)))} posts/day</span> (capped at {sched.maxPostsPerDay})
            </div>
          </Cd>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Cd ti="🖼️ IMAGE GENERATION">
              <div style={{fontSize:9,color:X.d,marginBottom:10}}>Provider auto-detects from your API keys. Set in <span style={{color:X.c}}>.env</span></div>
              {[{name:"OpenAI DALL-E 3",env:"OPENAI_API_KEY",c:"#10a37f",desc:"Best quality, $0.04/img"},{name:"Stability AI",env:"STABILITY_API_KEY",c:"#8b5cf6",desc:"Fast, open models"},{name:"Replicate FLUX",env:"REPLICATE_API_TOKEN",c:"#f97316",desc:"Flexible, pay-per-use"}].map(p=>(
                <div key={p.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:5,background:X.b,border:`1px solid ${X.bd}`,marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:p.c}}/>
                    <div><div style={{fontSize:10,fontWeight:700}}>{p.name}</div><div style={{fontSize:7,color:X.d}}>{p.desc}</div></div>
                  </div>
                  <div style={{fontSize:8,color:X.d}}>via <span style={{color:X.t,fontWeight:600}}>{p.env}</span></div>
                </div>
              ))}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}}>
                <span style={{fontSize:9,color:X.d}}>Auto-attach images to posts</span>
                <Tog on={sched.autoImage} ck={()=>setSched(s=>({...s,autoImage:!s.autoImage}))}/>
              </div>
              <div style={{fontSize:7,color:X.m,marginTop:4}}>When ON, MoltBot decides when images improve engagement</div>
            </Cd>
            <Cd ti="🧬 EVOLUTION SETTINGS">
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:9,color:X.d}}>EVOLUTION INTERVAL</span><span style={{fontSize:14,fontWeight:800,color:X.g}}>{sched.evoInterval}m</span></div>
                <input type="range" min={15} max={360} step={15} value={sched.evoInterval} onChange={e=>setSched(s=>({...s,evoInterval:+e.target.value}))} style={{width:"100%",accentColor:X.g}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:X.m}}><span>15min (fast adapt)</span><span>6hr (stable)</span></div>
              </div>
            </Cd>
            <Cd ti="💾 APPLY">
              <Bt on={()=>{
                if(live){ws.send("config:update",{schedule:{postsPerHour:sched.postsPerHour,maxPostsPerDay:sched.maxPostsPerDay,replyDelayMs:sched.replyDelay*1000,quietHoursUTC:[sched.quietStart,sched.quietEnd]},moltBot:{evolutionInterval:sched.evoInterval*60000},autoImage:sched.autoImage})}
                lg_(`⚙️ Config: ${sched.postsPerHour}/hr, max ${sched.maxPostsPerDay}/day, quiet ${sched.quietStart}-${sched.quietEnd} UTC`,"o");
              }} c={X.a}>💾 SAVE SETTINGS</Bt>
              <div style={{marginTop:8,fontSize:8,color:X.d}}>Settings sync to agent in real-time via WebSocket</div>
            </Cd>
          </div>
        </div>}

        {tab==="evolution"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Cd ti="🧬 STRATEGY FITNESS"><ResponsiveContainer width="100%" height={220}><AreaChart data={vD}><XAxis dataKey="g" tick={{fill:X.d,fontSize:8}} tickLine={false} axisLine={false}/><YAxis tick={{fill:X.d,fontSize:8}} tickLine={false} axisLine={false} domain={[0,1]} width={25}/><Tooltip contentStyle={{background:X.s,border:`1px solid ${X.bd}`,borderRadius:4,fontSize:9}}/>{ST.map((s,i)=><Area key={s} type="monotone" dataKey={s} stroke={SC[i]} fill="none" strokeWidth={2} dot={false}/>)}</AreaChart></ResponsiveContainer><div style={{display:"flex",justifyContent:"center",gap:12,marginTop:3}}>{ST.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center",gap:3,fontSize:7,color:X.d}}><div style={{width:10,height:3,borderRadius:2,background:SC[i]}}/>{s}</div>)}</div></Cd>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>{wt.map((s,i)=><Cd key={i}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:SC[i]}}/><span style={{fontSize:10,fontWeight:700}}>{s.nm}</span></div><Tg c={s.f>.6?X.g:s.f>.35?X.y:X.r} bg={s.f>.6?X.gd:s.f>.35?X.yd:X.rd}>{s.f}</Tg></div><div style={{height:3,borderRadius:2,background:X.b}}><div style={{height:"100%",borderRadius:2,background:SC[i],width:`${s.f*100}%`}}/></div></Cd>)}</div>
        </div>}

        {tab==="feed"&&<div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:12}}>
          <Cd ti="📡 FEED"><div style={{display:"flex",flexDirection:"column",gap:5}}>{ps.map(p=><div key={p.id} style={{padding:"8px 10px",borderRadius:4,background:X.b,border:`1px solid ${X.bd}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><Tg c={p.st==="manual"?X.y:X.a} bg={(p.st==="manual"?X.y:X.a)+"18"}>{p.st==="manual"?"MANUAL":p.tp}</Tg><span style={{fontSize:6,color:X.m}}>{p.tm}</span></div><div style={{fontSize:9,color:X.t,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{p.ct}</div>{p.md&&<div style={{display:"flex",gap:3,marginTop:4}}>{p.md.map((m,i)=><div key={i} style={{width:24,height:24,borderRadius:3,background:X.s,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,border:`1px solid ${X.bd}`}}>{m.t==="video"?"🎬":"📷"}</div>)}</div>}<div style={{display:"flex",gap:10,marginTop:4,fontSize:7,color:X.d}}>❤️ {p.lk} 🔁 {p.rt}</div></div>)}</div></Cd>
          <Cd ti="LOG"><div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:500,overflowY:"auto",fontSize:7}}>{lg.map((e,i)=><div key={i} style={{padding:"3px 5px",borderRadius:2,background:e.k==="o"?X.gd:e.k==="w"?X.yd:"transparent",color:e.k==="o"?X.g:e.k==="w"?X.y:X.d,borderLeft:`2px solid ${e.k==="o"?X.g:e.k==="w"?X.y:X.bd}`}}><span style={{color:X.m,marginRight:3}}>{e.t}</span>{e.m}</div>)}</div></Cd>
        </div>}
      </main>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#08090d}::-webkit-scrollbar-thumb{background:#1c1e30;border-radius:2px}textarea::placeholder,input::placeholder{color:#33354a}`}</style>
    </div>
  );
}
