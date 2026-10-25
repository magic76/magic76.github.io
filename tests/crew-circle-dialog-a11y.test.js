const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/books/BooksPage.tsx"),"utf8");

test("circle posting dialog supports keyboard focus management and scroll lock",()=>{
 assert.match(source,/dialogRef=useRef<HTMLElement\|null>\(null\)/);
 assert.match(source,/dialog\?\.querySelector<HTMLElement>\("form select, form input, form textarea, form button"\)\?\.focus\(\)/);
 assert.match(source,/document\.body\.style\.overflow="hidden"/);
 assert.match(source,/document\.body\.style\.overflow=previousOverflow/);
 assert.match(source,/event\.key==="Escape"/);
 assert.match(source,/event\.key!=="Tab"/);
 assert.match(source,/restoreFocusRef\.current\?\.focus\(\)/);
 assert.match(source,/ref=\{dialogRef\} tabIndex=\{-1\}/);
});
test("circle filters and posting choices convey selection to assistive technologies",()=>{
 assert.match(source,/aria-pressed=\{filter===item\.key\}/);
 assert.match(source,/aria-pressed=\{categoryFilter===item\.key\}/);
 assert.match(source,/aria-pressed=\{form\.kind===k\.key\}/);
 assert.match(source,/aria-controls=\{expanded\?"books-comments-"\+post\.id:undefined\}/);
 assert.match(source,/id=\{"books-comments-"\+post\.id\}/);
});

test("empty filtered circle results offer a reset instead of forcing a new post",()=>{
 assert.match(source,/filter!=="all"\|\|categoryFilter!=="all"\|\|query\.trim\(\)/);
 assert.match(source,/清除篩選，顯示全部/);
 assert.match(source,/setFilter\("all"\);setCategoryFilter\("all"\);setQuery\(""\)/);
});
