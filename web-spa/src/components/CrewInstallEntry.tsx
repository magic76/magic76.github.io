import {useEffect,useState,useSyncExternalStore} from "react";
import {useTranslation} from "react-i18next";
import {
 canOfferCrewInstall,emptyCrewInstallPrompt,getCrewInstallPrompt,
 isCrewIosSafari,requestCrewInstall,subscribeCrewInstall
} from "../runtime/pwa";
import "./crewInstallEntry.css";

const copies:Record<string,[string,string,string,string]>={
 "zh-TW":["安裝 Crew","加入主畫面","在 Safari 點選「分享」，再選「加入主畫面」。","關閉說明"],
 en:["Install Crew","Add to Home Screen","In Safari, tap Share, then Add to Home Screen.","Close guide"],
 ja:["Crew をインストール","ホーム画面に追加","Safari の共有から「ホーム画面に追加」を選択。","説明を閉じる"],
 ko:["Crew 설치","홈 화면에 추가","Safari에서 공유한 다음 홈 화면에 추가를 선택하세요.","안내 닫기"],
 de:["Crew installieren","Zum Home-Bildschirm","In Safari Teilen und dann Zum Home-Bildschirm wählen.","Hinweis schließen"],
 fr:["Installer Crew","Ajouter à l’écran d’accueil","Dans Safari, touchez Partager, puis Sur l’écran d’accueil.","Fermer l’aide"],
 es:["Instalar Crew","Añadir a inicio","En Safari, pulsa Compartir y Añadir a pantalla de inicio.","Cerrar guía"],
 id:["Instal Crew","Tambahkan ke layar utama","Di Safari, ketuk Bagikan lalu Tambahkan ke Layar Utama.","Tutup petunjuk"],
 "pt-BR":["Instalar Crew","Adicionar à Tela de Início","No Safari, toque em Compartilhar e Adicionar à Tela de Início.","Fechar ajuda"],
 th:["ติดตั้ง Crew","เพิ่มไปยังหน้าจอโฮม","ใน Safari แตะแชร์ แล้วเลือกเพิ่มไปยังหน้าจอโฮม","ปิดคำแนะนำ"],
 vi:["Cài đặt Crew","Thêm vào màn hình chính","Trong Safari, chọn Chia sẻ rồi Thêm vào màn hình chính.","Đóng hướng dẫn"]
};

/** User-initiated install action in the footer: no initial-page modal or live interruption. */
export function CrewInstallEntry(){
 const {i18n}=useTranslation();
 const prompt=useSyncExternalStore(subscribeCrewInstall,getCrewInstallPrompt,emptyCrewInstallPrompt);
 const [ios,setIos]=useState(false);
 const [guide,setGuide]=useState(false);
 const [supported,setSupported]=useState(false);
 useEffect(()=>{
  setSupported(canOfferCrewInstall());
  setIos(isCrewIosSafari());
 },[]);
 if(!supported||(!prompt&&!ios))return null;
 const copy=copies[i18n.resolvedLanguage||""]||copies[i18n.language]||copies.en;
 return <div className="crew-install-entry">
  <button type="button" className="crew-install-action" onClick={()=>{
   if(prompt){void requestCrewInstall();return;}
   setGuide(open=>!open);
  }}>{ios&&!prompt?copy[1]:copy[0]}</button>
  {guide&&ios&&<div className="crew-install-guide" role="status"><span>{copy[2]}</span>
   <button type="button" aria-label={copy[3]} onClick={()=>setGuide(false)}>×</button>
  </div>}
 </div>;
}
