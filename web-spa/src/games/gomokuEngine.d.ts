export {};

declare global {
  interface GomokuMove {
    x: number;
    y: number;
    color: "black" | "white";
  }

  interface GomokuEngine {
    size: number;
    board: Array<Array<"black" | "white" | null>>;
    turn: "black" | "white";
    winner: "black" | "white" | "draw" | null;
    winningLine: Array<{ x: number; y: number }> | null;
    lastMove: GomokuMove | null;
    moveHistory: GomokuMove[];
    reset(): void;
    isValidMove(x: number, y: number): boolean;
    makeMove(x: number, y: number): boolean;
    getAIMove(color: "black" | "white"): { x: number; y: number };
  }

  interface Window {
    GomokuEngine?: new (size?: number) => GomokuEngine;
  }
}
