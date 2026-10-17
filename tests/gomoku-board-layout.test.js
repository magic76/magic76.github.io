const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const page=fs.readFileSync(path.join(root,"web-spa/src/games/FriendGomokuPage.tsx"),"utf8");
const styles=fs.readFileSync(path.join(root,"web-spa/src/games/games.css"),"utf8");

test("Gomoku stones and drawn intersections share the same 15x15 cell centers",()=>{
  assert.match(page,/viewBox="0 0 15 15"/);
  assert.match(page,/x1="0\.5" x2="14\.5" y1=\{index\+0\.5\} y2=\{index\+0\.5\}/);
  assert.match(page,/y1="0\.5" y2="14\.5" x1=\{index\+0\.5\} x2=\{index\+0\.5\}/);
  assert.match(styles,/grid-template-columns:repeat\(15,minmax\(0,1fr\)\)/);
  assert.match(styles,/grid-template-rows:repeat\(15,minmax\(0,1fr\)\)/);
  const board=styles.match(/(?:^|\n)\.friend-gomoku-board\{([^}]*)\}/)?.[1]||"";
  assert.match(board,/padding:0/);
  assert.doesNotMatch(board,/background-(image|size|position)/);
  assert.match(styles,/\.friend-gomoku-grid-lines\{[^}]*position:absolute/);
});

test("Starting a board is independent of voice and preserves temporary game cues",()=>{
  const start=page.slice(page.indexOf("const startGame="),page.indexOf("const playAt="));
  assert.match(start,/new window\.GomokuEngine\(15\)/);
  assert.doesNotMatch(start,/live\.start\(/);
  assert.match(page,/\["requesting-mic","connecting","listening","speaking"\]/);
  assert.match(page,/pendingCueRef\.current/);
  assert.match(page,/persistHistory:false/);
  assert.doesNotMatch(page,/conversationFlow:"friend"/);
});

test("Gomoku labels each of the 15 columns and rows using spoken move coordinates",()=>{
  assert.match(page,/className="friend-gomoku-coordinate-shell"/);
  assert.match(page,/className="friend-gomoku-axis-top"/);
  assert.match(page,/className="friend-gomoku-axis-left"/);
  assert.match(page,/String\.fromCharCode\(65\+x\)/);
  assert.match(page,/\{y\+1\}<\/span>/);
  assert.match(page,/data-coordinate=\{coordinate\(\{x,y\}\)\}/);
  assert.match(page,/const lastCoordinate=engine\?\.lastMove\?coordinate\(engine\.lastMove\):null/);
  assert.match(styles,/\.friend-gomoku-axis-top\{[^}]*grid-template-columns:repeat\(15,minmax\(0,1fr\)\)/);
  assert.match(styles,/\.friend-gomoku-axis-left\{[^}]*grid-template-rows:repeat\(15,minmax\(0,1fr\)\)/);
  assert.match(styles,/\.friend-gomoku-coordinate-shell \.friend-gomoku-board\{[^}]*width:100%/);
});
