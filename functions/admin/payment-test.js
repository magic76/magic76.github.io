import {verifyAccess} from "../api/usage/report";
import {liveTestPage,liveTestPost} from "../../server/koolo-ecpay-live-test.mjs";
export const onRequestGet=context=>liveTestPage({...context,verifyAdmin:verifyAccess});
export const onRequestPost=context=>liveTestPost({...context,verifyAdmin:verifyAccess});
