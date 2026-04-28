const {
  START_FEN,
  parseFen,
  toFen,
  squareToIndex,
  indexToSquare,
  pieceColor,
  colorName,
} = require('./board.js');
const { generateLegalMoves, applyMove, isInCheck } = require('./move-generator.js');
const { moveToSan } = require('./san.js');
const { ChessError } = require('./errors.js');

function normalizePromotion(promotion) {
  if (!promotion) return null;
  const value = String(promotion).toLowerCase();
  return ['q', 'r', 'b', 'n'].includes(value) ? value : null;
}

function createPosition(fen) {
  return parseFen(fen || START_FEN);
}

function getLegalMoves(fen) {
  const position = createPosition(fen);
  return generateLegalMoves(position).map((move) => ({
    from: indexToSquare(move.from),
    to: indexToSquare(move.to),
    promotion: move.promotion || null,
    piece: move.piece,
    captured: move.captured,
    san: moveToSan(position, move),
  }));
}

function calculatePly(position) {
  return ((position.fullmove || 1) - 1) * 2 + (position.turn === 'w' ? 1 : 2);
}

function tryMove(input) {
  const position = createPosition(input && input.fen);
  const from = squareToIndex(input && input.from);
  const to = squareToIndex(input && input.to);
  const promotion = normalizePromotion(input && input.promotion);

  if (from < 0 || to < 0) return { ok: false, reason: 'illegal_move' };
  const piece = position.board[from];
  if (!piece) return { ok: false, reason: 'illegal_move' };
  if (pieceColor(piece) !== position.turn) return { ok: false, reason: 'wrong_turn' };

  const legalMoves = generateLegalMoves(position).filter((move) => move.from === from && move.to === to);
  if (!legalMoves.length) return { ok: false, reason: 'illegal_move' };

  const promotionMoves = legalMoves.filter((move) => move.promotion);
  if (promotionMoves.length && !promotion) return { ok: false, reason: 'promotion_required' };
  const selected = legalMoves.find((move) => (move.promotion || null) === (promotion || null));
  if (!selected) return { ok: false, reason: 'illegal_move' };

  const san = moveToSan(position, selected);
  const next = applyMove(position, selected);
  const fenAfter = toFen(next);
  const recordedMove = {
    ply: calculatePly(position),
    side: colorName(position.turn),
    from: input.from,
    to: input.to,
    san,
    fenAfter,
  };
  if (selected.promotion) recordedMove.promotion = selected.promotion;

  return {
    ok: true,
    move: recordedMove,
    fenAfter,
    san,
    check: isInCheck(next, next.turn),
  };
}

function replayVariation(initialFen, moves) {
  let fen = initialFen || START_FEN;
  const positions = [fen];
  const recordedMoves = [];

  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index];
    const result = tryMove({
      fen,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: result.reason,
        failedIndex: index,
        failedMove: move,
        positions,
        moves: recordedMoves,
      };
    }
    if (move.fenAfter && move.fenAfter !== result.fenAfter) {
      return {
        ok: false,
        reason: 'fen_mismatch',
        failedIndex: index,
        failedMove: move,
        expectedFen: move.fenAfter,
        actualFen: result.fenAfter,
        positions,
        moves: recordedMoves,
      };
    }
    fen = result.fenAfter;
    positions.push(fen);
    recordedMoves.push(result.move);
  }

  return {
    ok: true,
    finalFen: fen,
    positions,
    moves: recordedMoves,
  };
}

function assertLegalVariation(initialFen, moves) {
  const result = replayVariation(initialFen, moves);
  if (!result.ok) {
    throw new ChessError('invalid_variation', `Invalid variation at move ${result.failedIndex + 1}`, result);
  }
  return result;
}

function runChessSmokeTest() {
  const first = tryMove({ fen: START_FEN, from: 'e2', to: 'e4' });
  if (!first.ok || first.san !== 'e4') return { ok: false, step: 'e2-e4', result: first };
  const second = tryMove({ fen: first.fenAfter, from: 'e7', to: 'e5' });
  if (!second.ok || second.san !== 'e5') return { ok: false, step: 'e7-e5', result: second };
  const third = tryMove({ fen: second.fenAfter, from: 'g1', to: 'f3' });
  if (!third.ok || third.san !== 'Nf3') return { ok: false, step: 'g1-f3', result: third };
  const illegal = tryMove({ fen: START_FEN, from: 'e2', to: 'e5' });
  if (illegal.ok || illegal.reason !== 'illegal_move') return { ok: false, step: 'illegal', result: illegal };
  const replay = replayVariation(START_FEN, [first.move, second.move, third.move]);
  if (!replay.ok) return { ok: false, step: 'replay', result: replay };
  return {
    ok: true,
    sans: [first.san, second.san, third.san],
    finalFen: replay.finalFen,
  };
}

module.exports = {
  START_FEN,
  createPosition,
  getLegalMoves,
  tryMove,
  replayVariation,
  assertLegalVariation,
  runChessSmokeTest,
};
