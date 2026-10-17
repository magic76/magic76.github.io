// Pure, local turn-based rules for Crew Play. No network, account, or AI call.
(function(root){
  "use strict";
  const C4_W=7,C4_H=6,SIZE=8,OPPOSITE={black:"white",white:"black"};
  const c4Index=(x,y)=>y*C4_W+x;
  const revIndex=(x,y)=>y*SIZE+x;
  const directions=[[1,0],[0,1],[1,1],[1,-1]];
  function connect4New(){return {cells:Array(C4_W*C4_H).fill(null),turn:"player",winner:null,winningLine:[],moves:0,lastMove:null};}
  function connect4Drop(state,column,color){
    if(state.winner||state.turn!==color||!Number.isInteger(column)||column<0||column>=C4_W)return null;
    let row=-1;
    for(let y=C4_H-1;y>=0;y--)if(state.cells[c4Index(column,y)]===null){row=y;break;}
    if(row<0)return null;
    const cells=state.cells.slice();cells[c4Index(column,row)]=color;
    let winningLine=[];
    for(const [dx,dy] of directions){
      const line=[c4Index(column,row)];
      for(const sign of [-1,1]){
        for(let step=1;step<4;step++){
          const x=column+dx*sign*step,y=row+dy*sign*step;
          if(x<0||x>=C4_W||y<0||y>=C4_H||cells[c4Index(x,y)]!==color)break;
          line.push(c4Index(x,y));
        }
      }
      if(line.length>=4){winningLine=line;break;}
    }
    const moves=state.moves+1;
    return {cells,turn:color==="player"?"computer":"player",winner:winningLine.length?color:moves===42?"draw":null,winningLine,moves,lastMove:c4Index(column,row)};
  }
  function connect4AI(state){
    if(state.turn!=="computer"||state.winner)return null;
    const legal=[3,2,4,1,5,0,6].filter(x=>state.cells[c4Index(x,0)]===null);
    for(const x of legal)if(connect4Drop(state,x,"computer").winner==="computer")return x;
    const fake={...state,turn:"player"};
    for(const x of legal)if(connect4Drop(fake,x,"player").winner==="player")return x;
    // Prefer central lanes while avoiding moves that allow an immediate opposing win.
    for(const x of legal){
      const after=connect4Drop(state,x,"computer");
      if(after.winner)return x;
      const opponentMoves=[0,1,2,3,4,5,6].filter(col=>after.cells[c4Index(col,0)]===null);
      if(!opponentMoves.some(col=>connect4Drop(after,col,"player")?.winner==="player"))return x;
    }
    return legal[0]??null;
  }
  function reversiNew(){
    const cells=Array(SIZE*SIZE).fill(null);
    cells[revIndex(3,3)]="white";cells[revIndex(4,4)]="white";
    cells[revIndex(4,3)]="black";cells[revIndex(3,4)]="black";
    return {cells,turn:"black",winner:null,moves:0,lastMove:null,flipped:[]};
  }
  function reversiFlips(cells,x,y,color){
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=SIZE||y>=SIZE||cells[revIndex(x,y)]!==null)return [];
    const flips=[],other=OPPOSITE[color];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;
      const candidates=[];let cx=x+dx,cy=y+dy;
      while(cx>=0&&cy>=0&&cx<SIZE&&cy<SIZE&&cells[revIndex(cx,cy)]===other){
        candidates.push(revIndex(cx,cy));cx+=dx;cy+=dy;
      }
      if(candidates.length&&cx>=0&&cy>=0&&cx<SIZE&&cy<SIZE&&cells[revIndex(cx,cy)]===color)flips.push(...candidates);
    }
    return flips;
  }
  function reversiMoves(state,color){
    if(state.winner||!(color==="black"||color==="white"))return [];
    const result=[];
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const flips=reversiFlips(state.cells,x,y,color);
      if(flips.length)result.push({x,y,flips});
    }
    return result;
  }
  function reversiCount(cells){return cells.reduce((total,c)=>{if(c==="black")total.black++;if(c==="white")total.white++;return total;},{black:0,white:0});}
  function reversiPlace(state,x,y,color){
    if(state.winner||state.turn!==color)return null;
    const flips=reversiFlips(state.cells,x,y,color);
    if(!flips.length)return null;
    const cells=state.cells.slice();cells[revIndex(x,y)]=color;
    for(const i of flips)cells[i]=color;
    const other=OPPOSITE[color],next={...state,cells,turn:other,moves:state.moves+1,lastMove:revIndex(x,y),flipped:flips};
    const opponentMoves=reversiMoves(next,other);
    if(!opponentMoves.length){
      next.turn=color;
      if(!reversiMoves(next,color).length){
        const score=reversiCount(cells);
        next.winner=score.black===score.white?"draw":score.black>score.white?"black":"white";
      }
    }
    return next;
  }
  function reversiAI(state){
    if(state.turn!=="white"||state.winner)return null;
    const legal=reversiMoves(state,"white");
    if(!legal.length)return null;
    // Corners and stable edges have priority; reduce the opponent's next legal options.
    const score=move=>{
      const index=revIndex(move.x,move.y);
      const next=reversiPlace(state,move.x,move.y,"white");
      const enemyMoves=next?.turn==="black"?reversiMoves(next,"black").length:0;
      const corner=[0,7,56,63].includes(index);
      const edge=move.x===0||move.x===7||move.y===0||move.y===7;
      const nextToCorner=(move.x<=1||move.x>=6)&&(move.y<=1||move.y>=6);
      return (corner?150:0)+(edge?16:0)-(nextToCorner&&!corner?35:0)+move.flips.length*2-enemyMoves*2;
    };
    return legal.reduce((best,m)=>score(m)>score(best)?m:best,legal[0]);
  }
  root.CrewPlayEngine={connect4New,connect4Drop,connect4AI,reversiNew,reversiFlips,reversiMoves,reversiCount,reversiPlace,reversiAI};
})(typeof window!=="undefined"?window:globalThis);
