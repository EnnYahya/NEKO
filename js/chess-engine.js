// ============================================================
// CHESS ENGINE — standard rules, local two-player pass-and-play
// ============================================================
// Simplifications: no castling, no en passant, pawns auto-promote
// to queen. Everything else (legal moves, check, checkmate,
// stalemate) is fully implemented.
//
// Board: 8x8 array of strings like "wP", "bK", or null.
// row 0 = black's back rank (top of board as displayed), row 7 = white's.
// ============================================================

function createInitialBoard() {
  const back = ["R","N","B","Q","K","B","N","R"];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = "b" + back[c];
    board[1][c] = "bP";
    board[6][c] = "wP";
    board[7][c] = "w" + back[c];
  }
  return board;
}

function cloneBoard(board) {
  return board.map(row => row.slice());
}

function pieceColor(piece) { return piece ? piece[0] : null; }
function pieceType(piece) { return piece ? piece[1] : null; }
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// ---------- PSEUDO-LEGAL MOVES (ignores whether it leaves own king in check) ----------
function pseudoLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = pieceColor(piece);
  const type = pieceType(piece);
  const moves = [];

  const addIfValid = (nr, nc) => {
    if (!inBounds(nr, nc)) return false;
    const target = board[nr][nc];
    if (!target) { moves.push({ r: nr, c: nc }); return true; }
    if (pieceColor(target) !== color) moves.push({ r: nr, c: nc });
    return false; // blocked either way after this
  };

  const slide = (dirs) => {
    dirs.forEach(([dr, dc]) => {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) { moves.push({ r: nr, c: nc }); }
        else { if (pieceColor(target) !== color) moves.push({ r: nr, c: nc }); break; }
        nr += dr; nc += dc;
      }
    });
  };

  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !board[r + 2*dir][c]) moves.push({ r: r + 2*dir, c });
    }
    [c - 1, c + 1].forEach(nc => {
      if (inBounds(r + dir, nc) && board[r + dir][nc] && pieceColor(board[r + dir][nc]) !== color) {
        moves.push({ r: r + dir, c: nc });
      }
    });
  } else if (type === "N") {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => addIfValid(r+dr, c+dc));
  } else if (type === "B") {
    slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (type === "R") {
    slide([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === "Q") {
    slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === "K") {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => addIfValid(r+dr, c+dc));
  }

  return moves;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === color + "K") return { r, c };
  return null;
}

function isSquareAttacked(board, r, c, byColor) {
  for (let sr = 0; sr < 8; sr++) {
    for (let sc = 0; sc < 8; sc++) {
      const piece = board[sr][sc];
      if (piece && pieceColor(piece) === byColor) {
        const moves = pseudoLegalMoves(board, sr, sc);
        if (moves.some(m => m.r === r && m.c === c)) return true;
      }
    }
  }
  return false;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  const opponent = color === "w" ? "b" : "w";
  return isSquareAttacked(board, king.r, king.c, opponent);
}

// ---------- LEGAL MOVES (filters out moves that leave own king in check) ----------
function legalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = pieceColor(piece);
  const pseudo = pseudoLegalMoves(board, r, c);
  return pseudo.filter(m => {
    const testBoard = cloneBoard(board);
    testBoard[m.r][m.c] = testBoard[r][c];
    testBoard[r][c] = null;
    return !isInCheck(testBoard, color);
  });
}

function applyMove(board, from, to) {
  const newBoard = cloneBoard(board);
  const piece = newBoard[from.r][from.c];
  newBoard[to.r][to.c] = piece;
  newBoard[from.r][from.c] = null;

  // Auto-promote pawns reaching the last rank
  if (pieceType(piece) === "P") {
    if ((pieceColor(piece) === "w" && to.r === 0) || (pieceColor(piece) === "b" && to.r === 7)) {
      newBoard[to.r][to.c] = pieceColor(piece) + "Q";
    }
  }
  return newBoard;
}

function hasAnyLegalMove(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && pieceColor(board[r][c]) === color) {
        if (legalMoves(board, r, c).length > 0) return true;
      }
    }
  }
  return false;
}

function getGameStatus(board, colorToMove) {
  const inCheck = isInCheck(board, colorToMove);
  const hasMoves = hasAnyLegalMove(board, colorToMove);
  if (inCheck && !hasMoves) return "checkmate";
  if (!inCheck && !hasMoves) return "stalemate";
  if (inCheck) return "check";
  return "normal";
}

const PIECE_SYMBOLS = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};
