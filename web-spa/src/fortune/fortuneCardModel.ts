import type {FortuneMode} from "./types";
import type {FortuneIdentity} from "./identity";
import {buildFortuneIdentity} from "./identity";
import {identityArtworkUrl} from "./identityArtwork";
import {fortuneCopy,fortuneLocale,fortuneModeLabel,fortuneTrait,type Trait} from "./fortuneJourneyI18n";

/** Every pair comes from the published archetype's title/core, not random chips or warnings.
 * Optional chart-dependent modifiers are intentionally NOT exposed in public invites.
 */
export const FORTUNE_ARCHETYPE_TRAITS:Readonly<Record<string,readonly [Trait,Trait]>>={
 "bazi-甲":["growth","lead"],"bazi-乙":["adapt","care"],
 "bazi-丙":["warmth","lead"],"bazi-丁":["insight","warmth"],
 "bazi-戊":["stability","care"],"bazi-己":["patience","care"],
 "bazi-庚":["decisive","renewal"],"bazi-辛":["detail","insight"],
 "bazi-壬":["explore","vision"],"bazi-癸":["observe","insight"],
 "tarot-1":["create","decisive"],"tarot-2":["intuition","observe"],
 "tarot-3":["care","create"],"tarot-4":["stability","lead"],
 "tarot-5":["wisdom","stability"],"tarot-6":["connection","care"],
 "tarot-7":["focus","lead"],"tarot-8":["courage","patience"],
 "tarot-9":["observe","wisdom"],"tarot-10":["adapt","renewal"],
 "tarot-11":["fairness","balance"],"tarot-12":["insight","patience"],
 "tarot-13":["renewal","courage"],"tarot-14":["balance","patience"],
 "tarot-15":["insight","observe"],"tarot-16":["renewal","decisive"],
 "tarot-17":["vision","warmth"],"tarot-18":["intuition","insight"],
 "tarot-19":["warmth","create"],"tarot-20":["renewal","wisdom"],
 "tarot-21":["focus","balance"],"tarot-22":["freedom","explore"],
 "vedic-aries":["courage","decisive"],"vedic-taurus":["stability","patience"],
 "vedic-gemini":["connection","curiosity"],"vedic-cancer":["care","intuition"],
 "vedic-leo":["lead","warmth"],"vedic-virgo":["detail","insight"],
 "vedic-libra":["balance","fairness"],"vedic-scorpio":["insight","focus"],
 "vedic-sagittarius":["explore","vision"],"vedic-capricorn":["patience","stability"],
 "vedic-aquarius":["renewal","vision"],"vedic-pisces":["intuition","care"]
};
export type FortuneCardModel={
 mode:FortuneMode;id:string|null;title:string;tagline:string;chips:string[];
 artSrc:string|null;modeLabel:string;cta:string;symbol:string;identity:FortuneIdentity|null;
};
function safeOneLine(text:string):string{
 const value=text.trim();
 // The fallback never republishes chart reports, dates, times, names, paths or identifiers.
 if(value.length<8||value.length>150||/[\d]{2}[-/:年][\d]{1,2}|出生|birth|姓名|name:|token|key|https?:|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/i.test(value))return "";
 return value;
}
export function buildFortuneCardModel(
 mode:FortuneMode,result:unknown,locale="zh-TW",oneLine="",overrideIdentity?:FortuneIdentity|null
):FortuneCardModel{
 const identity=overrideIdentity===undefined?buildFortuneIdentity(mode,result,locale):overrideIdentity;
 const copy=fortuneCopy(locale),traits=identity?FORTUNE_ARCHETYPE_TRAITS[identity.id]:undefined;
 const chips=traits?traits.map(key=>fortuneTrait(locale,key)):[];
 const coreLocalized=fortuneLocale(locale)==="zh-TW"||fortuneLocale(locale)==="en";
 const title=identity?(coreLocalized?identity.title:chips.join(" · ")):fortuneModeLabel(locale,mode);
 const tagline=identity?(coreLocalized?identity.core:copy.symbolic):(safeOneLine(oneLine)||copy.fallback);
 return {mode,id:identity?.id||null,title,tagline,chips,
  artSrc:identity?identityArtworkUrl(identity.id):null,modeLabel:fortuneModeLabel(locale,mode),
  cta:copy.question+" 3sssi.com/fortune",symbol:"✦",identity:identity||null};
}
