const FILES = 'abcdefgh';
const RANKS = '12345678';
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function isWhitePiece(piece) {
  return piece >= 'A' && piece <= 'Z';
}

function pieceColor(piece) {
  if (!piece) return null;
  return isWhitePiece(piece) ? 'w' : 'b';
}

function opposite(color) {
  return color === 'w' ? 'b' : 'w';
}

function colorName(color) {
  return color === 'w' ? 'white' : 'black';
}

function sideCode(side) {
  return side === 'white' ? 'w' : side === 'black' ? 'b' : side;
}

function squareToIndex(square) {
  if (typeof square !== 'string' || square.length !== 2) return -1;
  const file = FILES.indexOf(square[0]);
  const rank = RANKS.indexOf(square[1]);
  if (file < 0 || rank < 0) return -1;
  return rank * 8 + file;
}

function indexToSquare(index) {
  const file = index % 8;
  const rank = Math.floor(index / 8);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}`;
}

function parseFen(fen) {
  const parts = String(fen || '').trim().split(/\s+/);
  if (parts.length < 4) throw new Error('Invalid FEN: expected at least 4 fields');
  const board = new Array(64).fill(null);
  const rows = parts[0].split('/');
  if (rows.length !== 8) throw new Error('Invalid FEN: expected 8 ranks');

  rows.forEach((row, rowIndex) => {
    let file = 0;
    const rank = 7 - rowIndex;
    Array.from(row).forEach((char) => {
      if (/^[1-8]$/.test(char)) {
        file += Number(char);
        return;
      }
      if (!/^[prnbqkPRNBQK]$/.test(char)) throw new Error(`Invalid FEN piece: ${char}`);
      if (file > 7) throw new Error('Invalid FEN: too many files in rank');
      board[rank * 8 + file] = char;
      file += 1;
    });
    if (file !== 8) throw new Error('Invalid FEN: rank does not contain 8 files');
  });

  if (parts[1] !== 'w' && parts[1] !== 'b') throw new Error('Invalid FEN side to move');
  return {
    board,
    turn: parts[1],
    castling: parts[2] === '-' ? '' : parts[2],
    enPassant: parts[3],
    halfmove: Number(parts[4] || 0),
    fullmove: Number(parts[5] || 1),
  };
}

function boardToFen(board) {
  const rows = [];
  for (let rank = 7; rank >= 0; rank -= 1) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank * 8 + file];
      if (!piece) {
        empty += 1;
      } else {
        if (empty) row += String(empty);
        empty = 0;
        row += piece;
      }
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return rows.join('/');
}

function toFen(position) {
  return [
    boardToFen(position.board),
    position.turn,
    position.castling || '-',
    position.enPassant || '-',
    String(position.halfmove || 0),
    String(position.fullmove || 1),
  ].join(' ');
}

function clonePosition(position) {
  return {
    board: position.board.slice(),
    turn: position.turn,
    castling: position.castling,
    enPassant: position.enPassant,
    halfmove: position.halfmove,
    fullmove: position.fullmove,
  };
}

function removeCastling(castling, chars) {
  let next = castling || '';
  chars.forEach((char) => {
    next = next.replace(char, '');
  });
  return next;
}

module.exports = {
  FILES,
  START_FEN,
  isWhitePiece,
  pieceColor,
  opposite,
  colorName,
  sideCode,
  squareToIndex,
  indexToSquare,
  parseFen,
  toFen,
  clonePosition,
  removeCastling,
};
