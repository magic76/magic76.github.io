import {verifyAccess} from "../api/usage/report";
import {labPage} from "../../server/koolo-fortune-report-lab.mjs";
// The public /usage dashboard and this private page share one admin check.
export const onRequestGet=context=>labPage({...context,verifyAdmin:verifyAccess});
