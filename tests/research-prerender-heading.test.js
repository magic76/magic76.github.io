const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");

// React 19 text-node escaping (fixture requires no React, dist or network).
const reactText=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[c]));
const renderArticle=(title,attrs="")=>'<article class="briefing briefing-detail"><header><h1'+attrs+'>'+reactText(title)+'</h1></header></article>';

test("React-escaped public article headings validate against original titles",async()=>{
 const {hasArticleHeading,articleHeadingText}=await import("../scripts/research-seo.mjs");
 const actual=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../crew-app/briefings/2026-10-27.json"),"utf8"))
  .items.find(item=>item.id==="93af44a64968d818").title;
 const titles=[actual,"Agent's memory and context","RAG <b>benchmarks</b> & retrieval","研究：代理人記憶與可靠性"];
 for(const title of titles){
  const html=renderArticle(title);
  assert.equal(hasArticleHeading(html,title),true,title);
  assert.equal(articleHeadingText(html),title);
 }
 assert.match(renderArticle(actual),/&quot;Usage credits required for 1M context&quot;/);
 assert.match(renderArticle(titles[1]),/&#x27;/);
 assert.match(renderArticle(titles[2]),/&lt;b&gt;.*&amp;/);
 assert.equal(hasArticleHeading(renderArticle(titles[1],' class="headline"'),titles[1]),true,"h1 attributes are supported");
 assert.equal(hasArticleHeading('<article id="x" class="briefing-detail briefing"><h1>'+reactText(titles[3])+'</h1></article>',titles[3]),true,"article class order may vary");
 assert.equal(articleHeadingText('<h1>Wrong</h1>'+renderArticle(titles[3])),titles[3],"ignore headings outside the article");
 assert.equal(hasArticleHeading('<h1>'+reactText(titles[3])+'</h1>',titles[3]),false,"the heading must be inside the article");
});

test("missing, blank and incorrect article headings are rejected",async()=>{
 const {hasArticleHeading,articleHeadingText}=await import("../scripts/research-seo.mjs");
 const wrap=inner=>'<article class="briefing briefing-detail"><header>'+inner+'</header></article>';
 for(const html of [wrap(""),wrap("<h2>Other heading</h2>"),wrap("<h1></h1>"),wrap("<h1>  </h1>"),wrap("<h1>Wrong title</h1>")]){
  assert.equal(hasArticleHeading(html,"Expected title"),false);
 }
 assert.equal(articleHeadingText(wrap("<p>No heading</p>")),null);
 assert.equal(hasArticleHeading(renderArticle("Expected title"),""),false);
 assert.equal(hasArticleHeading(renderArticle("Expected title"),null),false);
});

test("HTML text decoding recognizes React entities and only decodes one layer",async()=>{
 const {decodeHtmlText}=await import("../scripts/research-seo.mjs");
 assert.equal(decodeHtmlText("&#x27; &#39; &quot; &amp; &lt; &gt;"),"' ' \" & < >");
 assert.equal(decodeHtmlText("&#65; &#x4e2d; &#X27;"),"A 中 '");
 assert.equal(decodeHtmlText("&amp;lt;"),"&lt;","entities must not be recursively decoded");
 assert.equal(decodeHtmlText("&#99999999999999999; &unknown;"),"&#99999999999999999; &unknown;");
});

test("published Research loader rejects missing and whitespace-only titles",async()=>{
 const {readPublishedResearch}=await import("../scripts/research-seo.mjs");
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"crew-research-heading-"));
 const folder=path.join(root,"crew-app","briefings"),date="2026-10-27",id="fixture-article";
 try{
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,"index.json"),JSON.stringify({days:[date]}));
  const item={id,title:"Valid article",summary:"Summary",sources:[],actions:[]};
  const filename=path.join(folder,date+".json");
  const write=title=>fs.writeFileSync(filename,JSON.stringify({date,edition:"public",items:[{...item,title}]}));
  write("Valid article");
  assert.equal(readPublishedResearch(root).days.get(date).items[0].title,"Valid article");
  for(const title of ["", "  ", "\n\t"]){
   write(title);
   assert.throws(()=>readPublishedResearch(root),/Invalid public article: 2026-10-27 fixture-article/);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
