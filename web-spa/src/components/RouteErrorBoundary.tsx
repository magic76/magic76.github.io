import {Component,type ReactNode} from "react";
import {recordGameRouteAssetError,recordRouteAssetError} from "../analytics/gameRouteDiagnostics";
import {trackUsageEvent} from "../analytics/usage";
import {currentBuild} from "../runtime/buildUpdates";
import {prepareChunkRecoveryWorker,retryFailedChunkOnce} from "../runtime/chunkRecovery";

// A browser caches a rejected import() in its module map. An HTML SPA fallback
// returned with MIME text/html is also a chunk failure, not a runtime exception.
function isAssetLoadError(error:unknown){
 const message=String(error instanceof Error?error.message:error);
 return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to load module script|expected a javascript-or-wasm module script|mime type[^\n]*text\/html|chunkloaderror|loading chunk [^ ]+ failed|unable to preload css/i.test(message);
}

const RETRY_KEY="crew_route_asset_recovery_v1";
const RETRY_WINDOW_MS=60_000;
const RETRY_QUERY="__crew_reload";
// Inline recovery copy: i18n chunks may be precisely the assets that failed.
const copy={
 "zh-TW":["正在重新載入頁面…","頁面暫時無法載入","新版頁面檔案載入失敗。請重新載入取得最新版本。","此頁面的程式執行發生錯誤，不一定是網路問題。請重新載入或返回首頁。","重新載入","返回首頁"],
 en:["Restoring page…","This page couldn't load","The latest page files failed to load. Reload to try the newest version.","This page encountered a software error. Reload or return home.","Reload","Back to home"],
 ja:["ページを復元しています…","ページを読み込めません","最新のページファイルを読み込めませんでした。再読み込みしてください。","ページでエラーが発生しました。再読み込みするかホームに戻ってください。","再読み込み","ホームに戻る"],
 ko:["페이지를 복원하는 중…","페이지를 불러올 수 없습니다","최신 페이지 파일을 불러오지 못했습니다. 다시 불러와 주세요.","페이지에서 오류가 발생했습니다. 다시 불러오거나 홈으로 돌아가세요.","새로고침","홈으로"],
 es:["Restaurando la página…","No se pudo cargar la página","No se cargaron los archivos nuevos. Vuelve a cargar la página.","Se produjo un error. Vuelve a cargar o regresa al inicio.","Volver a cargar","Ir al inicio"],
 fr:["Restauration de la page…","Impossible de charger la page","Les nouveaux fichiers n'ont pas pu être chargés. Actualisez la page.","Une erreur s'est produite. Actualisez ou revenez à l'accueil.","Actualiser","Accueil"],
 de:["Seite wird wiederhergestellt…","Seite konnte nicht geladen werden","Die aktuellen Seitendateien konnten nicht geladen werden. Bitte neu laden.","Ein Fehler ist aufgetreten. Bitte neu laden oder zur Startseite zurückkehren.","Neu laden","Zur Startseite"],
 id:["Memulihkan halaman…","Halaman tidak dapat dimuat","File halaman terbaru gagal dimuat. Muat ulang halaman.","Terjadi kesalahan. Muat ulang atau kembali ke beranda.","Muat ulang","Ke beranda"],
 "pt-BR":["Restaurando a página…","Não foi possível carregar a página","Falha ao carregar os arquivos novos. Recarregue a página.","Ocorreu um erro. Recarregue ou volte ao início.","Recarregar","Voltar ao início"],
 th:["กำลังกู้คืนหน้า…","ไม่สามารถโหลดหน้านี้ได้","โหลดไฟล์หน้าเวอร์ชันใหม่ไม่สำเร็จ โปรดลองโหลดอีกครั้ง","เกิดข้อผิดพลาด โปรดลองโหลดอีกครั้งหรือกลับหน้าหลัก","โหลดอีกครั้ง","กลับหน้าหลัก"],
 vi:["Đang khôi phục trang…","Không thể tải trang","Không tải được tệp trang mới nhất. Hãy tải lại trang.","Trang gặp lỗi. Hãy tải lại hoặc về trang chủ.","Tải lại","Về trang chủ"]
} as const;
type Locale=keyof typeof copy;
function recoveryLocale():Locale{
 const segment=window.location.pathname.split("/")[1];
 if(segment in copy)return segment as Locale;
 try{
  const saved=localStorage.getItem("crew_ui_locale_v1");
  if(saved&&saved in copy)return saved as Locale;
 }catch{/* Storage might be blocked. */}
 const browser=document.documentElement.lang||navigator.language||"";
 const normalized=browser.toLowerCase()==="pt-br"?"pt-BR":browser.split("-")[0].toLowerCase();
 return normalized in copy?normalized as Locale:"zh-TW";
}
function reloadLatest(){
 const url=new URL(window.location.href);
 url.searchParams.set(RETRY_QUERY,Date.now().toString(36));
 try{
  if("serviceWorker" in navigator)void navigator.serviceWorker.getRegistration()
   .then(registration=>registration?.update()).catch(()=>{});
 }catch{/* Service Worker refresh is best effort. */}
 window.location.replace(url.toString());
}
function recoveryPath(){
 const params=new URLSearchParams(window.location.search);
 params.delete(RETRY_QUERY);
 const query=params.toString();
 return window.location.pathname+(query?"?"+query:"");
}

type Props={children:ReactNode};
type State={error:unknown|null;recovering:boolean};
export class RouteErrorBoundary extends Component<Props,State>{
 state:State={error:null,recovering:false};
 static getDerivedStateFromError(error:unknown):State{
  return {error,recovering:isAssetLoadError(error)};
 }
 componentDidCatch(error:unknown){
  const asset=isAssetLoadError(error);
  let alreadyRetried=false;
  if(asset){
   try{
    const now=Date.now();
    const path=recoveryPath();
    const previous=JSON.parse(sessionStorage.getItem(RETRY_KEY)||"null") as {path?:string;at?:number}|null;
    alreadyRetried=previous?.path===path&&typeof previous.at==="number"&&
     now>=previous.at&&now-previous.at<RETRY_WINDOW_MS;
    if(!alreadyRetried){
     // Persist before asynchronous work so a second failure cannot loop.
     sessionStorage.setItem(RETRY_KEY,JSON.stringify({path,at:now}));
    }
   }catch{
    // Storage disabled: fail closed, never navigate automatically in a loop.
    this.setState({recovering:false});
    return;
   }
  }
  // The automatic reload of the same failed route does not count twice.
  if(!alreadyRetried){
   try{trackUsageEvent("route_load_error",isAssetLoadError(error)?"asset":"runtime");}catch{/* Best effort. */}
   if(asset){recordGameRouteAssetError(window.location.pathname);recordRouteAssetError(window.location.pathname);}
  }
  if(!asset)return;
  if(alreadyRetried){this.setState({recovering:false});return;}
  void this.recoverAsset(error);
 }
 private async recoverAsset(error:unknown){
  // A query on the failed top-level import can miss a poisoned edge entry;
  // its STATIC imports retain their original URLs. The worker repairs those
  // during the subsequent document navigation, including on first visits.
  const nonce=(currentBuild.buildId||"build")+"-"+Date.now().toString(36);
  try{
   await Promise.all([
    Promise.race([retryFailedChunkOnce(error,nonce),new Promise(resolve=>setTimeout(resolve,2500))]),
    prepareChunkRecoveryWorker()
   ]);
  }catch{/* A failed probe must not prevent the guarded full navigation. */}
  try{
   reloadLatest();
   // If navigation is blocked or stalls, do not leave an endless spinner.
   setTimeout(()=>this.setState({recovering:false}),4000);
  }catch{this.setState({recovering:false});}
 }
 render(){
  if(this.state.error===null)return this.props.children;
  const locale=recoveryLocale(),messages=copy[locale];
  if(this.state.recovering)return <main className="shell page spa-loading" role="status" aria-live="polite">{messages[0]}</main>;
  const home=locale==="zh-TW"?"/":`/${locale}/`;
  return <main className="shell page" role="alert" style={{minHeight:"45vh",display:"grid",placeItems:"center",padding:"40px 20px"}}>
   <section style={{width:"min(100%,480px)",textAlign:"center",padding:"28px 22px",background:"#fff",color:"#1b2937",border:"1px solid #a5b0bd",borderRadius:20}}>
    <h1 style={{fontSize:23,margin:"0 0 12px"}}>{messages[1]}</h1>
    <p style={{fontSize:14,lineHeight:1.7,color:"#374151"}}>{isAssetLoadError(this.state.error)?messages[2]:messages[3]}</p>
    <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap",marginTop:22}}>
     <button type="button" onClick={reloadLatest} style={{minHeight:44,minWidth:110,padding:"10px 18px",fontSize:14,color:"#fff",background:"#155c80",border:"1px solid #155c80",borderRadius:12,cursor:"pointer"}}>{messages[4]}</button>
     <a href={home} style={{minHeight:44,minWidth:110,padding:"10px 18px",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#16476a",background:"#eef7ff",border:"1px solid #9ac2db",borderRadius:12}}>{messages[5]}</a>
    </div>
   </section>
  </main>;
 }
}
