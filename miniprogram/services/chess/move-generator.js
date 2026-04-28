const {
  pieceColor,
  opposite,
  indexToSquare,
  squareToIndex,
  clonePosition,
  removeCastling,
} = require('./board.js');

const KNIGHT_DELTAS = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_DELTAS = [
  [1, 1], [1, 0], [1, -1], [0, 1],
  [0, -1], [-1, 1], [-1, 0], [-1, -1],
];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const QUEEN_DIRS = BISHOP_DIRS.concat(ROOK_DIRS);
const PROMOTIONS = ['q', 'r', 'b', 'n'];

function fileOf(index) {
  return index % 8;
}

function rankOf(index) {
  return Math.floor(index / 8);
}

function inBounds(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function indexOf(file, rank) {
  return rank * 8 + file;
}

function makeMove(position, from, to, options) {
  const piece = position.board[from];
  const captured = options && options.captured ? options.captured : position.board[to];
  return Object.assign({
    from,
    to,
    piece,
    captured: captured || null,
    promotion: null,
    castle: null,
    enPassant: false,
    doublePawn: false,
  }, options || {});
}

function addPawnMove(position, moves, from, to, options) {
  const piece = position.board[from];
  const targetRank = rankOf(to);
  const shouldPromote = piece.toLowerCase() === 'p' && (targetRank === 0 || targetRank === 7);
  if (shouldPromote) {
    PROMOTIONS.forEach((promotion) => {
      moves.push(makeMove(position, from, to, Object.assign({}, options || {}, { promotion })));
    });
    return;
  }
  moves.push(makeMove(position, from, to, options));
}

function generatePawnMoves(position, moves, from) {
  const piece = position.board[from];
  const color = pieceColor(piece);
  const direction = color === 'w' ? 1 : -1;
  const startRank = color === 'w' ? 1 : 6;
  const file = fileOf(from);
  const rank = rankOf(from);
  const oneRank = rank + direction;

  if (inBounds(file, oneRank)) {
    const one = indexOf(file, oneRank);
    if (!position.board[one]) {
      addPawnMove(position, moves, from, one);
      const twoRank = rank + direction * 2;
      if (rank === startRank && inBounds(file, twoRank)) {
        const two = indexOf(file, twoRank);
        if (!position.board[two]) moves.push(makeMove(position, from, two, { doublePawn: true }));
      }
    }
  }

  [-1, 1].forEach((df) => {
    const targetFile = file + df;
    const targetRank = rank + direction;
    if (!inBounds(targetFile, targetRank)) return;
    const to = indexOf(targetFile, targetRank);
    const target = position.board[to];
    if (target && pieceColor(target) === opposite(color)) {
      addPawnMove(position, moves, from, to, { captured: target });
      return;
    }
    if (position.enPassant && position.enPassant !== '-' && squareToIndex(position.enPassant) === to) {
      const capturedIndex = indexOf(targetFile, rank);
      const captured = position.board[capturedIndex];
      if (captured && captured.toLowerCase() === 'p' && pieceColor(captured) === opposite(color)) {
        addPawnMove(position, moves, from, to, { captured, enPassant: true });
      }
    }
  });
}

function generateStepMoves(position, moves, from, deltas) {
  const color = pieceColor(position.board[from]);
  const file = fileOf(from);
  const rank = rankOf(from);
  deltas.forEach(([df, dr]) => {
    const targetFile = file + df;
    const targetRank = rank + dr;
    if (!inBounds(targetFile, targetRank)) return;
    const to = indexOf(targetFile, targetRank);
    const target = position.board[to];
    if (!target || pieceColor(target) !== color) moves.push(makeMove(position, from, to));
  });
}

function generateSlidingMoves(position, moves, from, dirs) {
  const color = pieceColor(position.board[from]);
  const file = fileOf(from);
  const rank = rankOf(from);
  dirs.forEach(([df, dr]) => {
    let targetFile = file + df;
    let targetRank = rank + dr;
    while (inBounds(targetFile, targetRank)) {
      const to = indexOf(targetFile, targetRank);
      const target = position.board[to];
      if (!target) {
        moves.push(makeMove(position, from, to));
      } else {
        if (pieceColor(target) !== color) moves.push(makeMove(position, from, to));
        break;
      }
      targetFile += df;
      targetRank += dr;
    }
  });
}

function canCastleKingSide(position, color) {
  if (color === 'w') {
    return position.castling.includes('K') && position.board[squareToIndex('e1')] === 'K' &&
      position.board[squareToIndex('h1')] === 'R' && !position.board[squareToIndex('f1')] &&
      !position.board[squareToIndex('g1')] && !isSquareAttacked(position, squareToIndex('e1'), 'b') &&
      !isSquareAttacked(position, squareToIndex('f1'), 'b') && !isSquareAttacked(position, squareToIndex('g1'), 'b');
  }
  return position.castling.includes('k') && position.board[squareToIndex('e8')] === 'k' &&
    position.board[squareToIndex('h8')] === 'r' && !position.board[squareToIndex('f8')] &&
    !position.board[squareToIndex('g8')] && !isSquareAttacked(position, squareToIndex('e8'), 'w') &&
    !isSquareAttacked(position, squareToIndex('f8'), 'w') && !isSquareAttacked(position, squareToIndex('g8'), 'w');
}

function canCastleQueenSide(position, color) {
  if (color === 'w') {
    return position.castling.includes('Q') && position.board[squareToIndex('e1')] === 'K' &&
      position.board[squareToIndex('a1')] === 'R' && !position.board[squareToIndex('d1')] &&
      !position.board[squareToIndex('c1')] && !position.board[squareToIndex('b1')] &&
      !isSquareAttacked(position, squareToIndex('e1'), 'b') && !isSquareAttacked(position, squareToIndex('d1'), 'b') &&
      !isSquareAttacked(position, squareToIndex('c1'), 'b');
  }
  return position.castling.includes('q') && position.board[squareToIndex('e8')] === 'k' &&
    position.board[squareToIndex('a8')] === 'r' && !position.board[squareToIndex('d8')] &&
    !position.board[squareToIndex('c8')] && !position.board[squareToIndex('b8')] &&
    !isSquareAttacked(position, squareToIndex('e8'), 'w') && !isSquareAttacked(position, squareToIndex('d8'), 'w') &&
    !isSquareAttacked(position, squareToIndex('c8'), 'w');
}

function generateKingMoves(position, moves, from) {
  generateStepMoves(position, moves, from, KING_DELTAS);
  const color = pieceColor(position.board[from]);
  if (canCastleKingSide(position, color)) {
    moves.push(makeMove(position, from, color === 'w' ? squareToIndex('g1') : squareToIndex('g8'), { castle: 'king' }));
  }
  if (canCastleQueenSide(position, color)) {
    moves.push(makeMove(position, from, color === 'w' ? squareToIndex('c1') : squareToIndex('c8'), { castle: 'queen' }));
  }
}

function generatePseudoMoves(position) {
  const moves = [];
  position.board.forEach((piece, from) => {
    if (!piece || pieceColor(piece) !== position.turn) return;
    switch (piece.toLowerCase()) {
      case 'p': generatePawnMoves(position, moves, from); break;
      case 'n': generateStepMoves(position, moves, from, KNIGHT_DELTAS); break;
      case 'b': generateSlidingMoves(position, moves, from, BISHOP_DIRS); break;
      case 'r': generateSlidingMoves(position, moves, from, ROOK_DIRS); break;
      case 'q': generateSlidingMoves(position, moves, from, QUEEN_DIRS); break;
      case 'k': generateKingMoves(position, moves, from); break;
      default: break;
    }
  });
  return moves;
}

function isSquareAttacked(position, square, byColor) {
  const file = fileOf(square);
  const rank = rankOf(square);
  const pawnDirection = byColor === 'w' ? 1 : -1;

  for (const df of [-1, 1]) {
    const fromFile = file - df;
    const fromRank = rank - pawnDirection;
    if (inBounds(fromFile, fromRank)) {
      const piece = position.board[indexOf(fromFile, fromRank)];
      if (piece && pieceColor(piece) === byColor && piece.toLowerCase() === 'p') return true;
    }
  }

  for (const [df, dr] of KNIGHT_DELTAS) {
    const f = file + df;
    const r = rank + dr;
    if (!inBounds(f, r)) continue;
    const piece = position.board[indexOf(f, r)];
    if (piece && pieceColor(piece) === byColor && piece.toLowerCase() === 'n') return true;
  }

  for (const [df, dr] of BISHOP_DIRS) {
    let f = file + df;
    let r = rank + dr;
    while (inBounds(f, r)) {
      const piece = position.board[indexOf(f, r)];
      if (piece) {
        if (pieceColor(piece) === byColor && ['b', 'q'].includes(piece.toLowerCase())) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  for (const [df, dr] of ROOK_DIRS) {
    let f = file + df;
    let r = rank + dr;
    while (inBounds(f, r)) {
      const piece = position.board[indexOf(f, r)];
      if (piece) {
        if (pieceColor(piece) === byColor && ['r', 'q'].includes(piece.toLowerCase())) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  for (const [df, dr] of KING_DELTAS) {
    const f = file + df;
    const r = rank + dr;
    if (!inBounds(f, r)) continue;
    const piece = position.board[indexOf(f, r)];
    if (piece && pieceColor(piece) === byColor && piece.toLowerCase() === 'k') return true;
  }

  return false;
}

function findKing(position, color) {
  const king = color === 'w' ? 'K' : 'k';
  return position.board.findIndex((piece) => piece === king);
}

function isInCheck(position, color) {
  const kingIndex = findKing(position, color);
  if (kingIndex < 0) return true;
  return isSquareAttacked(position, kingIndex, opposite(color));
}

function promotedPiece(color, promotion) {
  const piece = promotion || 'q';
  return color === 'w' ? piece.toUpperCase() : piece.toLowerCase();
}

function applyMove(position, move) {
  const next = clonePosition(position);
  const color = pieceColor(move.piece);
  const opponent = opposite(color);
  const fromSquare = indexToSquare(move.from);
  const toSquare = indexToSquare(move.to);

  next.board[move.from] = null;
  if (move.enPassant) {
    const capturedIndex = squareToIndex(`${toSquare[0]}${fromSquare[1]}`);
    next.board[capturedIndex] = null;
  }
  next.board[move.to] = move.promotion ? promotedPiece(color, move.promotion) : move.piece;

  if (move.castle === 'king') {
    const rookFrom = color === 'w' ? squareToIndex('h1') : squareToIndex('h8');
    const rookTo = color === 'w' ? squareToIndex('f1') : squareToIndex('f8');
    next.board[rookTo] = next.board[rookFrom];
    next.board[rookFrom] = null;
  }
  if (move.castle === 'queen') {
    const rookFrom = color === 'w' ? squareToIndex('a1') : squareToIndex('a8');
    const rookTo = color === 'w' ? squareToIndex('d1') : squareToIndex('d8');
    next.board[rookTo] = next.board[rookFrom];
    next.board[rookFrom] = null;
  }

  if (move.piece === 'K') next.castling = removeCastling(next.castling, ['K', 'Q']);
  if (move.piece === 'k') next.castling = removeCastling(next.castling, ['k', 'q']);
  if (fromSquare === 'a1' || toSquare === 'a1') next.castling = removeCastling(next.castling, ['Q']);
  if (fromSquare === 'h1' || toSquare === 'h1') next.castling = removeCastling(next.castling, ['K']);
  if (fromSquare === 'a8' || toSquare === 'a8') next.castling = removeCastling(next.castling, ['q']);
  if (fromSquare === 'h8' || toSquare === 'h8') next.castling = removeCastling(next.castling, ['k']);

  next.enPassant = '-';
  if (move.doublePawn) {
    const epRank = color === 'w' ? rankOf(move.from) + 1 : rankOf(move.from) - 1;
    next.enPassant = indexToSquare(indexOf(fileOf(move.from), epRank));
  }

  next.halfmove = move.piece.toLowerCase() === 'p' || move.captured ? 0 : (position.halfmove || 0) + 1;
  next.turn = opponent;
  next.fullmove = color === 'b' ? (position.fullmove || 1) + 1 : (position.fullmove || 1);
  return next;
}

function generateLegalMoves(position) {
  return generatePseudoMoves(position).filter((move) => {
    const next = applyMove(position, move);
    return !isInCheck(next, pieceColor(move.piece));
  });
}

module.exports = {
  generateLegalMoves,
  generatePseudoMoves,
  applyMove,
  isInCheck,
  isSquareAttacked,
};
