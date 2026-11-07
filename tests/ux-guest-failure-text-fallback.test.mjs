import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../web-spa/src/live/GuestTrialExperience.tsx",import.meta.url),"utf8");

test("failed Friend Live guest session offers text chat without restarting grant",()=>{
 assert.match(source,/failed&&isFriend\?<Link[^>]+to=\{location\.pathname\+"\?"\+textParams\.toString\(\)\}/);
 assert.match(source,/textParams\.set\("chat","text"\)/);
 assert.match(source,/t\("voice:friendLive\.useText"\)/);
 assert.doesNotMatch(source,/live\.start\(|GUEST_TOKEN_ENDPOINT|onGrant/);
});
