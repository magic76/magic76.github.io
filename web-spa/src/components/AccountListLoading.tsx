import "./accountListLoading.css";

export function AccountListLoading({label}:{label:string}){
 return <div className="koolo-account-loading" role="status" aria-label={label}>
  <span aria-hidden="true"/><span aria-hidden="true"/>
 </div>;
}
