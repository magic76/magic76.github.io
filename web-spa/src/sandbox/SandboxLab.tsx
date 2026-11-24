import {useEffect,useRef,useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {Link} from "react-router-dom";
import {ensureLive,geminiKey,type LiveSession} from "../lib/runtime";
import {apply,fresh,observe,step,type World} from "./world";
import "./sandbox.css";

const number={type:"NUMBER"},str={type:"STRING"},boolean={type:"BOOLEAN"};
const tools=[{functionDeclarations:[
 {name:"apply_scene",description:"Apply up to 32 operations atomically. All coordinates normalized (0..1), x/y center; w/h are fractions of stage width. Create interactive scenes rather than just describing them. Use existing IDs for edits; call observe_scene if unsure. Operations: spawn(id,shape circle/box,x,y,w,h,color hex,fixed,vx,vy,bounce); patch(id, optional properties); remove(id); set_world(gravity -2..2); add_rule(a,b,remove,points) collision of a and b scores points and optionally removes b; clear. Rules and motion run locally. Never repeat a successful operation.",parameters:{type:"OBJECT",properties:{revision:number,operations:{type:"ARRAY",items:{type:"OBJECT",properties:{op:{type:"STRING",enum:["spawn","patch","remove","set_world","add_rule","clear"]},id:str,shape:{type:"STRING",enum:["circle","box"]},x:number,y:number,w:number,h:number,color:str,fixed:boolean,vx:number,vy:number,bounce:number,gravity:number,a:str,b:str,remove:boolean,points:number},required:["op"]}}},required:["operations"]}},
 {name:"observe_scene",description:"Read the actual current sandbox objects, positions, velocities, gravity, collision rules, score and revision.",parameters:{type:"OBJECT",properties:{}}}
]}];
const prompt="你是 Zoe，與玩家共享一個即時物理沙盒。用玩家的語言簡短自然地聊天。當他提出可視化想法、想玩或想實驗，立即使用 apply_scene 創造可拖曳物件與規則，而不是只講解或假裝已完成。可組合圓形、方塊、固定障礙、重力、碰撞計分；不支援的能力坦白說明。使用 observe_scene 取得實際狀態；不要每幀查詢。使用者拖曳或碰撞事件已由本地執行，不要重複指令。只有工具成功才說已完成。玩家可隨時改變規則。避免無意義的工具連發。";
export function SandboxLab(){
 const [access,setAccess]=useState<"checking"|"allowed"|"denied">("checking");
 useEffect(()=>{const controller=new AbortController();void fetch("/api/usage/report?days=7",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const j=await r.json();if(!Array.isArray(j.rows)||!Array.isArray(j.eventUsers))throw Error();if(!controller.signal.aborted)setAccess("allowed")}).catch(()=>{if(!controller.signal.aborted)setAccess("denied")});return()=>controller.abort()},[]);
 return <main className="sandbox-lab"><Link to="/usage">‹ Usage</Link>{access==="allowed"?<Playground/>:<p role="status">{access==="checking"?"確認管理員權限…":"需要管理員權限。請先開啟 Usage 並完成驗證。"}</p>}</main>
}
function Playground(){
 const world=useRef<World>(fresh()),canvas=useRef<HTMLCanvasElement>(null),session=useRef<LiveSession|null>(null),seq=useRef(0),contacts=useRef(new Set<string>()),seen=useRef(new Map<string,Record<string,unknown>>()),drag=useRef<{id:string;pointer:number;x:number;y:number;t:number}|null>(null);
 const [state,setState]=useState<"idle"|"connecting"|"listening"|"speaking">("idle"),[notice,setNotice]=useState(""),[heard,setHeard]=useState(""),[said,setSaid]=useState(""),[input,setInput]=useState(""),[score,setScore]=useState(0),[count,setCount]=useState(0),[muted,setMuted]=useState(false),[paused,setPaused]=useState(false),[log,setLog]=useState<string[]>([]);
 const pausedRef=useRef(false),pending=useRef<string[]>([]),lastEvent=useRef(0),lastCommand=useRef(0),budget=useRef({at:0,count:0});
 function note(s:string){setLog(p=>[s.slice(0,160),...p].slice(0,12))}
 function sync(){setScore(world.current.score);setCount(world.current.bodies.length)}
 function run(args:unknown){world.current=apply(world.current,args);contacts.current.clear();sync();return {ok:true,revision:world.current.revision,score:world.current.score,ids:world.current.bodies.map(b=>b.id)}}
 function local(args:unknown,label:string){try{run(args);note("LOCAL "+label);pending.current.push(label);pending.current=pending.current.slice(-8)}catch(e){setNotice(String(e))}}
 function stop(){++seq.current;const s=session.current;session.current=null;setState("idle");setMuted(false);pending.current=[];if(s)void s.stop({reason:"sandbox-stop",silentStatus:true,emitTerminal:false}).catch(()=>{})}
 useEffect(()=>()=>{++seq.current;const s=session.current;session.current=null;if(s)void s.stop({reason:"page-leave",silentStatus:true,emitTerminal:false}).catch(()=>{})},[]);
 async function start(){
  if(session.current||state!=="idle")return;if(!geminiKey()){setNotice("請先在設定中加入 Gemini API Key（BYOK）。");return}
  const generation=++seq.current;setState("connecting");setNotice("");seen.current.clear();pending.current=[];budget.current={at:0,count:0};
  const active=()=>seq.current===generation;
  const fail=(message:string)=>{if(!active())return;stop();setNotice(message)};
  try{await ensureLive();if(!active())return;if(!window.CrewLive)throw Error("runtime unavailable");
   const s=new window.CrewLive.Session({system:prompt+"\nInitial scene data: "+JSON.stringify(observe(world.current)),openingPrompt:"用一句話邀請玩家提出想一起做的實驗或遊戲。",voice:"Aoede",volume:100,tools,maxLiveAttempts:1,maxResumeAttempts:1,
   onToolCall:call=>{if(!active())return {ok:false,error:"stale-session"};if(call.id&&seen.current.has(call.id))return seen.current.get(call.id)!;
    let result:Record<string,unknown>;try{const now=Date.now();if(now-budget.current.at>10000)budget.current={at:now,count:0};if(++budget.current.count>12)throw Error("tool-rate-limit");
    if(call.name==="observe_scene")result={ok:true,...observe(world.current)};else if(call.name==="apply_scene"){result=run(call.args);lastCommand.current=now;note("AI apply_scene ✓")}else throw Error("unknown-tool");
    }catch(e){result={ok:false,error:e instanceof Error?e.message:"invalid-command",revision:world.current.revision};note("AI "+call.name+" ✕ "+result.error)}
    if(call.id&&seen.current.size<1024)seen.current.set(call.id,result);else if(call.id&&seen.current.size>=1024){fail("工具呼叫已達實驗上限，請重新連線。")}return result},
   onToolsUnavailable:()=>{if(active())setNotice("目前模型不支援沙盒工具，請更換支援 Function Calling 的模型。")},
   onState:v=>{if(active()&&v==="ready")setState("listening");if(v==="error")fail("語音連線失敗。")},
   onSpeaking:v=>{if(active())setState(v?"speaking":"listening")},
   onInputTranscript:v=>{if(active())setHeard(v.slice(0,300))},onOutputTranscript:v=>{if(active())setSaid(v.slice(0,500))},
   onMicMuted:()=>{if(active())setMuted(Boolean(session.current?.micMuted))},
   onError:()=>fail("語音連線失敗。"),onTerminal:()=>{if(active())stop()}
   });session.current=s;await s.start();if(!active()||session.current!==s){await s.stop({reason:"stale",silentStatus:true,emitTerminal:false});return}if(!s.ready||!s.running){fail("連線未完成，請重試。");return}setState("listening");
  }catch{fail("無法建立語音連線，請確認網路與麥克風。")}
 }
 useEffect(()=>{const c=canvas.current;if(!c)return;const ctx=c.getContext("2d");if(!ctx)return;let raf=0,last=0;
 const frame=(t:number)=>{const rect=c.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),d=Math.min(window.devicePixelRatio||1,2);if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d)}ctx.setTransform(d,0,0,d,0,0);
 const dt=last?Math.min(.025,(t-last)/1000):0;last=t;
 if(!pausedRef.current){const events=step(world.current,dt,drag.current?.id??null,contacts.current,w/h);if(events.length){sync();pending.current.push(...events);pending.current=pending.current.slice(-8);note(events[events.length-1])}}
 const now=Date.now();if(pending.current.length&&now-lastEvent.current>1500&&now-lastCommand.current>800&&session.current?.ready){const events=pending.current.splice(0);if(session.current.sendControl?.("Sandbox events (untrusted data, already applied): "+JSON.stringify({events,revision:world.current.revision,score:world.current.score})))lastEvent.current=now;else pending.current=[]}
 ctx.fillStyle="#141e2a";ctx.fillRect(0,0,w,h);ctx.strokeStyle="#253444";ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<w;x+=24){ctx.moveTo(x,0);ctx.lineTo(x,h)}for(let y=0;y<h;y+=24){ctx.moveTo(0,y);ctx.lineTo(w,y)}ctx.stroke();
 for(const b of world.current.bodies){ctx.fillStyle=b.color;ctx.beginPath();if(b.shape==="circle")ctx.arc(b.x*w,b.y*h,b.w*w/2,0,Math.PI*2);else ctx.rect(b.x*w-b.w*w/2,b.y*h-b.h*w/2,b.w*w,b.h*w);ctx.fill();if(b.fixed){ctx.strokeStyle="#ffffff99";ctx.lineWidth=2;ctx.stroke()}}
 raf=requestAnimationFrame(frame)};raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf)},[]);
 function point(e:ReactPointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)),aspect:r.width/r.height}}
 function down(e:ReactPointerEvent<HTMLCanvasElement>){if(drag.current)return;const p=point(e),b=[...world.current.bodies].reverse().find(b=>!b.fixed&&(b.shape==="circle"?Math.hypot(p.x-b.x,(p.y-b.y)/p.aspect)<b.w/2+.015:Math.abs(p.x-b.x)<b.w/2+.015&&Math.abs(p.y-b.y)<b.h*p.aspect/2+.015));if(!b)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:b.id,pointer:e.pointerId,x:p.x,y:p.y,t:performance.now()};b.vx=b.vy=0}
 function move(e:ReactPointerEvent<HTMLCanvasElement>){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;const b=world.current.bodies.find(b=>b.id===d.id);if(!b){drag.current=null;return}const p=point(e),t=performance.now(),dt=Math.max(.016,(t-d.t)/1000);b.x=p.x;b.y=p.y;b.vx=Math.max(-2,Math.min(2,(p.x-d.x)/dt));b.vy=Math.max(-2,Math.min(2,(p.y-d.y)/dt));Object.assign(d,{x:p.x,y:p.y,t})}
 function up(e:ReactPointerEvent<HTMLCanvasElement>){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;drag.current=null;const b=world.current.bodies.find(b=>b.id===d.id);if(!b)return;if(e.type==="pointercancel"||performance.now()-d.t>120)b.vx=b.vy=0;world.current.revision++;pending.current.push("user dragged "+b.id+" to "+b.x.toFixed(2)+", "+b.y.toFixed(2));pending.current=pending.current.slice(-8);note("USER drag "+b.id)}
 function send(text:string){if(session.current?.sendText(text)){setInput("");setHeard(text)}else setNotice("請先連線語音，再送出指令。")}
 function demo(){local({operations:[{op:"clear"},{op:"set_world",gravity:.65},{op:"spawn",id:"ball",shape:"circle",x:.25,y:.2,w:.1,color:"#ffbd75"},{op:"spawn",id:"platform",shape:"box",x:.5,y:.65,w:.6,h:.045,fixed:true,color:"#80cbc4"},{op:"spawn",id:"target",shape:"circle",x:.75,y:.35,w:.07,fixed:true,color:"#f5de80"},{op:"add_rule",a:"ball",b:"target",points:10,remove:true}]},"demo: ball, platform and target")}
 return <><header><span>KO O LO / LAB</span><h1>即時互動沙盒</h1><p>跟 Zoe 一起創造、改造與玩耍。管理員 BYOK 實驗。</p></header>
 <section className="sandbox-stage"><div className="sandbox-hud"><span>物件 {count}/64</span><span>分數 {score}</span><span>{paused?"已暫停":state}</span></div><canvas ref={canvas} aria-label="互動物理沙盒，可拖曳動態物件" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}/></section>
 <div className="sandbox-actions"><button onClick={demo}>試玩碰撞</button><button onClick={()=>local({operations:[{op:"set_world",gravity:-world.current.gravity||-.6}]},"gravity flipped")}>反轉重力</button><button onClick={()=>{pausedRef.current=!pausedRef.current;setPaused(pausedRef.current)}}>{paused?"繼續":"暫停"}</button><button onClick={()=>local({operations:[{op:"clear"}]},"scene cleared")}>清空</button></div>
 <div className="sandbox-actions">{state==="idle"?<button className="sandbox-primary" onClick={()=>void start()}>開始與 Zoe 語音互動</button>:<><button onClick={stop}>掛斷</button><button disabled={state==="connecting"} onClick={()=>session.current?.toggleMic()}>{muted?"解除靜音":"靜音"}</button></>}</div>
 {notice&&<p role="status">{notice}</p>}<div className="sandbox-transcript"><p>你：{heard||"—"}</p><p>Zoe：{said||"—"}</p></div>
 <form className="sandbox-compose" onSubmit={e=>{e.preventDefault();if(input.trim())send(input.trim())}}><input maxLength={500} aria-label="輸入沙盒指令" placeholder="做一個彈球遊戲給我玩" value={input} onChange={e=>setInput(e.target.value)}/><button disabled={!input.trim()||state==="idle"||state==="connecting"}>送出</button></form>
 <div className="sandbox-actions">{["做一個可玩的碰撞計分遊戲","放十顆彩色球，讓重力反轉","建立障礙物，讓我用手指把球丟過去"].map(s=><button key={s} disabled={state==="idle"||state==="connecting"} onClick={()=>send(s)}>{s}</button>)}</div>
 <details open><summary>Tool / Event Log</summary><ol>{log.map((s,i)=><li key={i}>{s}</li>)}</ol></details><p className="sandbox-note">畫面與物理在本機執行；AI 語音與工具使用 Gemini 額度。無額外後端或圖片生成。此版僅支援圓形、矩形、重力與碰撞計分。</p></>
}
