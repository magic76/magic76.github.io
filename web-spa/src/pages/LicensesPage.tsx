import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Arrow} from "../components/Arrow";

type Notice={name:string;license:string;links:[string,string][];zh?:string;en?:string};
const models:Notice[]=[
 {name:"Paradee v1.3 INT8",license:"Apache-2.0",links:[["Model / license","https://huggingface.co/sahilmahendrakar/Paradee-8M-v1.3"],["Source","https://github.com/sahilmahendrakar/paradee"],["Kokoro upstream","https://huggingface.co/hexgrad/Kokoro-82M"]]},
 {name:"eeh-1",license:"Apache-2.0",links:[["Model / license","https://huggingface.co/ctrltokyo/eeh-1"],["Runtime revision","https://huggingface.co/ctrltokyo/eeh-1/tree/a42c72e45bc814946e645a69acb15a184325a9a2"]]},
 {name:"Kitten TTS 2 Mini / Pico",license:"Apache-2.0",links:[["Mini model / license","https://huggingface.co/KittenML/kitten-tts-2-mini"],["Pico model / license","https://huggingface.co/KittenML/kitten-tts-2-pico"]]},
];
const runtimes:Notice[]=[
 {name:"piper-phonemize / eSpeak NG (WASM)",license:"GPL-3.0-or-later",zh:"韓文音素轉換。瀏覽器自上游取得未修改的 WASM、JavaScript 與字典，使用下列固定版本。原始碼與建置說明見上游專案；二進位與完整對應原始碼的版本對照仍待核實。",en:"Korean phonemization. The browser retrieves the unmodified upstream WASM, JavaScript and dictionary at the pinned revision below. Upstream source and build instructions are linked; exact corresponding-source revision mapping remains to be verified.",links:[["GPL-3.0 full text","https://www.gnu.org/licenses/gpl-3.0.html"],["piper-phonemize source / build","https://github.com/csukuangfj/piper-phonemize"],["eSpeak NG source / license","https://github.com/espeak-ng/espeak-ng"],["Pinned WASM distribution","https://huggingface.co/spaces/csukuangfj/piper-phonemize/tree/29c4a1977913f70e282d8328e87f54100672bf17"]]},
 {name:"ONNX Runtime Web 1.24.3",license:"MIT",links:[["License","https://github.com/microsoft/onnxruntime/blob/main/LICENSE"],["Third-party notices","https://github.com/microsoft/onnxruntime/blob/main/ThirdPartyNotices.txt"],["Package","https://www.npmjs.com/package/onnxruntime-web/v/1.24.3"]]},
 {name:"uccharan 1.0.0",license:"Apache-2.0",zh:"含 CMU Pronouncing Dictionary、Misaki 與其他字典資料；各自授權見上游 NOTICE 與 DATA_LICENSES。",en:"Includes CMU Pronouncing Dictionary, Misaki and other language data; see upstream NOTICE and DATA_LICENSES for the respective terms.",links:[["Source / license","https://github.com/cB-Sigma/uccharan"],["NOTICE","https://docs.rs/crate/uccharan-data/1.0.0/source/NOTICE"],["Data licenses","https://docs.rs/crate/uccharan-data/1.0.0/source/DATA_LICENSES.md"]]},
 {name:"pako 2.1.0",license:"MIT / zlib",links:[["License","https://github.com/nodeca/pako/blob/2.1.0/LICENSE"]]},
];
const packages:Notice[]=[
 {name:"React / React DOM",license:"MIT",links:[["Source / license","https://github.com/facebook/react/blob/main/LICENSE"]]},
 {name:"React Router",license:"MIT",links:[["Source / license","https://github.com/remix-run/react-router/blob/main/LICENSE.md"]]},
 {name:"i18next / react-i18next",license:"MIT",links:[["i18next","https://github.com/i18next/i18next"],["react-i18next","https://github.com/i18next/react-i18next"]]},
 {name:"Zustand",license:"MIT",links:[["Source / license","https://github.com/pmndrs/zustand"]]},
 {name:"Three.js / React Three Fiber / Drei",license:"MIT",links:[["Three.js","https://github.com/mrdoob/three.js"],["Fiber","https://github.com/pmndrs/react-three-fiber"],["Drei","https://github.com/pmndrs/drei"]]},
 {name:"pinyin-pro",license:"MIT",links:[["Source / license","https://github.com/zh-lx/pinyin-pro"]]}
];
function Notices({items,en}:{items:Notice[];en:boolean}){
 return <div style={{display:"grid",gap:16}}>{items.map(item=><article key={item.name} style={{minWidth:0,overflowWrap:"anywhere"}}>
  <h3 style={{marginBottom:4}}>{item.name}</h3><p className="meta">{item.license}</p>
  {(item.zh||item.en)&&<p className="meta">{en?item.en:item.zh}</p>}
  <div style={{display:"flex",flexWrap:"wrap",gap:"8px 14px"}}>{item.links.map(([label,href])=><a key={href} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}</div>
 </article>)}</div>;
}
export function LicensesPage(){
 const {t,i18n}=useTranslation("settings"),en=!i18n.language.startsWith("zh");
 return <>
  <section className="hero"><span className="kicker">Koolo</span><h1>{t("about.licenses")}</h1><p>{en?"Credits, license texts and source links for third-party models and software.":"第三方模型、開源套件的授權資訊、作者與原始碼來源。"}</p></section>
  <section className="section panel"><div className="section-head"><h2>{en?"Learning voice models":"學習語音模型"}</h2></div><Notices items={models} en={en}/></section>
  <section className="section panel"><div className="section-head"><h2>{en?"Speech runtimes and dictionaries":"語音執行環境與字典"}</h2></div><Notices items={runtimes} en={en}/></section>
  <section className="section panel"><div className="section-head"><h2>{en?"Other direct open-source libraries":"其他直接使用的開源套件"}</h2></div><Notices items={packages} en={en}/><p className="meta">{en?"This list covers the listed direct libraries, not a complete audit of every transitive dependency. Upstream copyright and license notices remain applicable.":"此處列出主要直接依賴套件，並非所有間接依賴的完整授權稽核。各原作者的著作權與授權聲明仍適用。"}</p></section>
  <section className="section panel"><p className="meta">{en?"License or attribution questions:":"授權或署名相關問題："} <a href="mailto:cs@koolo.app">cs@koolo.app</a></p><p className="meta"><Link to="/privacy">{t("device.privacy")} <Arrow/></Link></p></section>
  <p className="meta"><Link to="/settings"><Arrow direction="left"/> {en?"Back to settings":"返回設定"}</Link></p>
 </>;
}
