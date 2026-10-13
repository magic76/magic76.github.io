/**
 * Progressive first paint for Cloudflare Pages.
 * JavaScript users see a subdued Crew shell until React commits, never the
 * standalone SEO marketing page. Without JavaScript, the full visible static
 * introduction remains available for users and non-JS crawlers.
 */
export function seoBootHead(){
 const css=[
  ".crew-bootstrap-shell{display:none}",
  "html.crew-js .seo-fallback{display:none!important}",
  "html.crew-js.crew-boot-failed .seo-fallback{display:block!important}",
  "html.crew-js:not(.crew-boot-failed) body{background:#f7f7f4!important}",
  "html.crew-js:not(.crew-boot-failed) .crew-bootstrap-shell{display:block;min-height:100dvh;color:#202124;background:#f7f7f4;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;opacity:0;animation:crew-boot-appear .18s .14s forwards}",
  "html.crew-js.crew-boot-failed .crew-bootstrap-shell{display:none!important}",
  ".crew-bootstrap-top{height:72px;border-bottom:1px solid #e8e7e2;display:flex;align-items:center;padding:0 max(24px,calc((100% - 1120px)/2));gap:12px;background:#f7f7f4}",
  ".crew-bootstrap-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#202124;color:#fff;font-size:19px}",
  ".crew-bootstrap-top strong{font-size:18px;letter-spacing:-.04em}",
  ".crew-bootstrap-main{width:min(1040px,calc(100% - 40px));margin:44px auto 0;display:grid;gap:16px}",
  ".crew-bootstrap-label{font-size:12px;color:#767676;letter-spacing:.05em}",
  ".crew-bootstrap-placeholder{height:24px;width:min(440px,72%);border-radius:9px;background:#e9e9e6}",
  ".crew-bootstrap-placeholder.short{width:min(240px,48%);height:14px;background:#eeedea}",
  ".crew-bootstrap-blocks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:20px}",
  ".crew-bootstrap-blocks span{min-height:138px;border:1px solid #e8e7e2;border-radius:18px;background:#fff}",
  "@media(max-width:640px){.crew-bootstrap-top{height:64px;padding:0 20px}.crew-bootstrap-main{margin-top:30px}.crew-bootstrap-blocks{grid-template-columns:1fr}.crew-bootstrap-blocks span{min-height:108px}.crew-bootstrap-blocks span:nth-child(n+3){display:none}}",
  "@keyframes crew-boot-appear{to{opacity:1}}",
  "@media(prefers-reduced-motion:reduce){html.crew-js:not(.crew-boot-failed) .crew-bootstrap-shell{animation:none;opacity:1}}"
 ].join("");
 // The inline script executes in <head> before the browser paints the body.
 // If the module fails (offline, CSP, JS error), reveal the complete SEO page.
 const js=`(function(){var html=document.documentElement;html.classList.add("crew-js");var timer=setTimeout(function(){html.classList.add("crew-boot-failed")},8000);window.addEventListener("crew:mounted",function(){clearTimeout(timer);html.classList.remove("crew-js","crew-boot-failed")},{once:true})})();`;
 return '<style data-crew-bootstrap>'+css+'</style>'+String.fromCharCode(10)+'  <script data-crew-bootstrap>'+js+'</script>';
}
export function seoBootShell({locale,product}){
 const labels=locale==="en"
  ?{home:"Crew",teacher:"Crew Teacher",story:"Crew Story",fortune:"Crew Fortune",research:"Crew Research"}
  :{home:"Crew",teacher:"Crew Teacher",story:"Crew Story",fortune:"Crew Fortune",research:"每日研發情報"};
 const title=labels[product]||labels.home;
 const loading=locale==="en"?"Loading":"正在載入";
 return '<div class="crew-bootstrap-shell" role="status" aria-label="'+loading+' '+title+'">'
  +'<header class="crew-bootstrap-top"><span class="crew-bootstrap-mark" aria-hidden="true">✳</span><strong>'+title+'</strong></header>'
  +'<div class="crew-bootstrap-main" aria-hidden="true">'
  +'<span class="crew-bootstrap-label">CREW</span><span class="crew-bootstrap-placeholder"></span>'
  +'<span class="crew-bootstrap-placeholder short"></span>'
  +'<div class="crew-bootstrap-blocks"><span></span><span></span><span></span></div></div></div>';
}
