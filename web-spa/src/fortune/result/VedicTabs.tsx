import{useTranslation}from"react-i18next";import{useState}from"react";import type{ResultTabProps}from"../types";import{Evidence,Fact,ResultTabs,YearEvidence}from"./Common";import{formatVedicTerm}from"../fortuneTerminology";



export function VedicTabs({result:r,ai}:ResultTabProps){
 const{t,i18n}=useTranslation("fortune");
 const display=(value:unknown)=>formatVedicTerm(value,i18n.resolvedLanguage||i18n.language);
 const lord=(value:unknown)=>display(value||"—");
 const[tab,setTab]=useState("overview"),[selectedPlanet,setSelectedPlanet]=useState<string|null>(null),
 [selectedHouse,setSelectedHouse]=useState<number|null>(null),md=r.currentMahadasha||{},ad=r.currentAntardasha||{};
 const chosenPlanet=(r.planets||[]).find((p:any)=>p.name===selectedPlanet);
 const activeHouse=chosenPlanet?Number(chosenPlanet.house):selectedHouse;
 const houseData=(r.houses||[]).find((h:any)=>Number(h.house)===activeHouse);
 return <><ResultTabs items={[["overview",t("reading.tab.key")],["topics",t("reading.tab.life")],["details",t("reading.tab.details")]]} active={tab} onChange={setTab}/>
 {tab==="overview"&&<div className="fortune-result-stack">
  <section className="fortune-result-card"><span className="kicker">你現在走到哪一段</span><h2>{lord(md.lord)}主週期 · {lord(ad.lord)}次週期</h2><p className="meta">主週期可以理解成目前人生的大章節，次週期則是這段時間更容易被碰到的重心。</p><div className="fortune-facts"><Fact label="目前大章節">{lord(md.lord)} · {md.startDate||"—"}–{md.endDate||"—"}</Fact><Fact label="目前小段落">{lord(ad.lord)} · {ad.startDate||"—"}–{ad.endDate||"—"}</Fact></div></section>
  <section className="fortune-result-card"><h3>接下來先看什麼</h3><p className="meta">先從上面的時間重點與「生活主題」理解方向；出生星宿、行星、宮位與完整週期都保留在「詳細資料」。</p></section>
 </div>}
 {tab==="topics"&&<div className="fortune-topic-grid"><Evidence title="個性與優勢" mode="vedic" result={r} chapter="personality" profile={r.personalityProfile}/><Evidence title="工作與職涯" mode="vedic" result={r} chapter="career" profile={r.careerProfile}/><Evidence title="財務與資源" mode="vedic" result={r} chapter="wealth" profile={r.wealthProfile}/><Evidence title="感情與關係" mode="vedic" result={r} chapter="relationships" profile={r.relationshipProfile}/><Evidence title="家庭與子女" mode="vedic" result={r} chapter="family" profile={r.familyChildrenProfile}/></div>}
 {tab==="details"&&<div className="fortune-result-stack">
  <section className="fortune-result-card"><h3>出生底盤</h3><div className="fortune-facts"><Fact label="上升星宿">{r.lagnaNakshatra} · Pada {r.lagnaPada}</Fact><Fact label="月亮星宿">{r.moonNakshatra} · Pada {r.moonPada}</Fact></div></section>
  <section className="fortune-result-card"><h3>人生週期</h3><div className="fortune-timeline">{(r.mahadashaTimeline||[]).map((x:any,i:number)=><YearEvidence mode="vedic" item={x} key={i}/>)}</div></section>
  <section className="fortune-result-card"><h3>行星位置</h3><p className="meta">點選行星，可查看它所在的宮位與相互對應。</p><div className="fortune-planets">{(r.planets||[]).map((x:any)=><button type="button" className="fortune-planet fortune-selectable" key={display(x.name)} aria-pressed={selectedPlanet===x.name} data-highlighted={activeHouse!==null&&activeHouse===Number(x.house)?"true":"false"} onClick={()=>{setSelectedPlanet(String(x.name));setSelectedHouse(Number(x.house))}}><strong>{display(x.name)}</strong><span>{display(x.sign)} · 第 {x.house} 宮{x.retrograde?" · Rx":""}</span><small>{display(x.nakshatra)} · Pada {x.pada} · {x.dignity||"neutral"}</small></button>)}</div></section>
  <section className="fortune-result-card"><h3>12 宮</h3><p className="meta">點選宮位，即可對照上方行星資料。</p><div className="fortune-house-grid">{(r.houses||[]).map((h:any)=><button type="button" className="fortune-selectable" key={h.house} aria-pressed={activeHouse===Number(h.house)} data-highlighted={activeHouse===Number(h.house)?"true":"false"} onClick={()=>{setSelectedPlanet(null);setSelectedHouse(Number(h.house))}}><strong>第 {h.house} 宮 · {display(h.sign)}</strong><span>宮主 {display(h.lord)}</span><small>{(h.planets||[]).length?"宮內 "+h.planets.join("、"):"宮內無行星"}</small></button>)}</div>
  {activeHouse!==null&&<div className="fortune-astro-selection" role="status"><strong>第 {activeHouse} 宮{houseData?.sign?" · "+houseData.sign:""}</strong><span>{houseData?.lord?"宮主 "+houseData.lord+" · ":""}{(houseData?.planets||[]).length?"宮內行星："+houseData.planets.join("、"):"宮內無行星"}</span>{chosenPlanet&&<span>目前選取：{display(chosenPlanet.name)} · {display(chosenPlanet.sign)} · {display(chosenPlanet.nakshatra||"—")}</span>}<button type="button" className="btn secondary small" onClick={()=>{setSelectedPlanet(null);setSelectedHouse(null)}}>取消選取</button></div>}</section>
  <section className="fortune-result-card"><h3>目前行運 · {r.currentTransitDate}</h3><div className="fortune-planets">{(r.currentTransits||[]).map((x:any)=><div className="fortune-planet" key={display(x.name)}><strong>{display(x.name)}</strong><span>{display(x.sign)} · 本命 第 {x.natalHouse} 宮</span><small>{x.retrograde?"Rx · ":""}{x.dignity||""}</small></div>)}</div></section>
  <section className="fortune-result-card"><h3>接下來 3 年的重要變化</h3><div className="fortune-timeline">{(r.majorTransitTimeline||[]).map((x:any,i:number)=><YearEvidence mode="vedic" item={x} key={i}/>)}</div></section>
 </div>}
</>
}
