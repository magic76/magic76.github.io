/** Use the same lightweight animated brand asset as the pre-React HTML shell. */
export function KooloLoader({label,inline=false}:{label:string;inline?:boolean}){
 return <div className={"spa-loading koolo-loader"+(inline?" koolo-loader--inline":"")} role="status">
  <div className="koolo-loader-content">
   <img src={import.meta.env.BASE_URL+"brand/koolo-loading.svg"} width={inline?72:120} height={inline?29:48} alt=""/>
   <span>{label}</span>
  </div>
 </div>;
}
