export {};
declare global {
  type CrewDisc="player"|"computer"|null;
  interface CrewConnect4State {
    cells:CrewDisc[];turn:"player"|"computer";winner:"player"|"computer"|"draw"|null;
    winningLine:number[];moves:number;lastMove:number|null;
  }
  interface CrewReversiMove{x:number;y:number;flips:number[]}
  interface CrewReversiState {
    cells:("black"|"white"|null)[];
    turn:"black"|"white";winner:"black"|"white"|"draw"|null;
    moves:number;lastMove:number|null;flipped:number[];
  }
  interface Window {
    CrewPlayEngine?:{
      connect4New():CrewConnect4State;
      connect4Drop(s:CrewConnect4State,col:number,color:"player"|"computer"):CrewConnect4State|null;
      connect4AI(s:CrewConnect4State):number|null;
      reversiNew():CrewReversiState;
      reversiMoves(s:CrewReversiState,color:"black"|"white"):CrewReversiMove[];
      reversiCount(cells:CrewReversiState["cells"]):{black:number;white:number};
      reversiPlace(s:CrewReversiState,x:number,y:number,color:"black"|"white"):CrewReversiState|null;
      reversiAI(s:CrewReversiState):CrewReversiMove|null;
    };
  }
}