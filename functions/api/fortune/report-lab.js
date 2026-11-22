import {verifyAccess} from "../usage/report";
import {labGet,labPost} from "../../../server/koolo-fortune-report-lab.mjs";
// Authorization is checked server-side for every report read and AI generation.
export const onRequestGet=context=>labGet({...context,verifyAdmin:verifyAccess});
export const onRequestPost=context=>labPost({...context,verifyAdmin:verifyAccess});
