import type {ShortPost} from "./shortsFeed";

/** Use the opening thought of the actual post, with natural clause boundaries. */
export function shortPreviewTitle(post:ShortPost,locale:string){
 const text=locale.startsWith("zh")&&post.translationZh?post.translationZh:post.caption;
 const firstSentence=text.match(/^[^。！？.!?]+[。！？.!?]?/u)?.[0]?.trim()||text.trim();
 const firstClause=firstSentence.split(/[，；：,;:]\s*/u)[0].trim();
 return firstSentence.length>28&&firstClause.length>=5?firstClause:firstSentence;
}
