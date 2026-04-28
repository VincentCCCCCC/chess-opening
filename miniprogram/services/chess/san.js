const { parseFen, indexToSquare, pieceColor } = require('./board.js');
const { generateLegalMoves, applyMove, isInCheck } = require('./move-generator.js');

const PIECE_NAMES = {
  p: '',
  n: 'N',
  b: 'B',
  r: 'R',
  q: 'Q',
  k: 'K',
};

function disambiguation(position, move) {
  const pieceType = move.piece.toLowerCase();
  if (pieceType === 'p' || pieceType === 'k') return '';
  const candidates = generateLegalMoves(position).filter((candidate) => (
    candidate.to === move.to &&
    candidate.from !== move.from &&
    candidate.piece.toLowerCase() === pieceType &&
    pieceColor(candidate.piece) === pieceColor(move.piece)
  ));
  if (!candidates.length) return '';

  const from = indexToSquare(move.from);
  const sameFile = candidates.some((candidate) => indexToSquare(candidate.from)[0] === from[0]);
  const sameRank = candidates.some((candidate) => indexToSquare(candidate.from)[1] === from[1]);
  if (!sameFile) return from[0];
  if (!sameRank) return from[1];
  return from;
}

function moveToSan(position, move) {
  if (move.castle === 'king') return withCheckSuffix(position, move, 'O-O');
  if (move.castle === 'queen') return withCheckSuffix(position, move, 'O-O-O');

  const pieceType = move.piece.toLowerCase();
  const pieceName = PIECE_NAMES[pieceType];
  const from = indexToSquare(move.from);
  const to = indexToSquare(move.to);
  const capture = Boolean(move.captured);
  let san = pieceName;

  if (pieceType === 'p') {
    if (capture) san += from[0];
  } else {
    san += disambiguation(position, move);
  }

  if (capture) san += 'x';
  san += to;
  if (move.promotion) san += `=${move.promotion.toUpperCase()}`;
  return withCheckSuffix(position, move, san);
}

function withCheckSuffix(position, move, san) {
  const next = applyMove(position, move);
  const checkedColor = next.turn;
  if (!isInCheck(next, checkedColor)) return san;
  const replies = generateLegalMoves(next);
  return `${san}${replies.length ? '+' : '#'}`;
}

function findSanMove(fen, san) {
  const position = parseFen(fen);
  return generateLegalMoves(position).find((move) => moveToSan(position, move) === san) || null;
}

module.exports = {
  moveToSan,
  findSanMove,
};
