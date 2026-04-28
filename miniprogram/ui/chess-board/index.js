const { parseFen, squareToIndex, indexToSquare } = require('../../services/chess/board.js');

const PIECE_SYMBOLS = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const PIECE_ASSETS = {
  K: 'wK', Q: 'wQ', R: 'wR', B: 'wB', N: 'wN', P: 'wP',
  k: 'bK', q: 'bQ', r: 'bR', b: 'bB', n: 'bN', p: 'bP',
};

const pieceImages = {};
let preloadStarted = false;

const HIGHLIGHT_COLORS = {
  selected: 'rgba(246, 206, 84, 0.68)',
  legalTarget: 'rgba(20, 20, 20, 0.18)',
  lastMove: 'rgba(205, 210, 106, 0.66)',
  expected: 'rgba(80, 180, 120, 0.68)',
  wrong: 'rgba(230, 78, 78, 0.72)',
  check: 'rgba(214, 65, 65, 0.55)',
};

function fileOf(square) {
  return square.charCodeAt(0) - 97;
}

function rankOf(square) {
  return Number(square[1]) - 1;
}

function squareToDisplay(square, orientation) {
  const file = fileOf(square);
  const rank = rankOf(square);
  if (orientation === 'black') {
    return { col: 7 - file, row: rank };
  }
  return { col: file, row: 7 - rank };
}

function displayToSquare(col, row, orientation) {
  const file = orientation === 'black' ? 7 - col : col;
  const rank = orientation === 'black' ? row : 7 - row;
  return indexToSquare(rank * 8 + file);
}

function drawRoundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function normalizeHighlights(options) {
  const highlights = options.highlights || {};
  const lastMove = [];
  if (options.lastMoveFrom) lastMove.push(options.lastMoveFrom);
  if (options.lastMoveTo) lastMove.push(options.lastMoveTo);
  return {
    selected: options.selectedSquare,
    legalTargets: options.legalTargets || [],
    lastMove,
    expected: highlights.expected || [],
    wrong: highlights.wrong || [],
    check: highlights.check || [],
  };
}

function preloadPieces(onReady) {
  if (preloadStarted || typeof wx === 'undefined' || !wx.createImage) return;
  preloadStarted = true;
  Object.keys(PIECE_ASSETS).forEach((piece) => {
    const image = wx.createImage();
    image.onload = () => {
      image.loaded = true;
      if (typeof onReady === 'function') onReady();
    };
    image.onerror = () => {
      image.failed = true;
    };
    image.src = `assets/pieces/cburnett-png/${PIECE_ASSETS[piece]}.png`;
    pieceImages[piece] = image;
  });
}

function drawPieceFallback(ctx, piece, cx, cy, cell) {
  ctx.font = `${Math.floor(cell * 0.72)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = piece === piece.toUpperCase() ? '#fffdf7' : '#1f1b16';
  ctx.strokeStyle = piece === piece.toUpperCase() ? 'rgba(32, 28, 22, 0.55)' : 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = Math.max(1, cell * 0.025);
  ctx.strokeText(PIECE_SYMBOLS[piece], cx, cy + cell * 0.02);
  ctx.fillText(PIECE_SYMBOLS[piece], cx, cy + cell * 0.02);
}

function fillSquare(ctx, bounds, square, orientation, color) {
  if (!square) return;
  const pos = squareToDisplay(square, orientation);
  const cell = bounds.size / 8;
  ctx.fillStyle = color;
  ctx.fillRect(bounds.x + pos.col * cell, bounds.y + pos.row * cell, cell, cell);
}

function drawLegalDot(ctx, bounds, square, orientation) {
  const pos = squareToDisplay(square, orientation);
  const cell = bounds.size / 8;
  ctx.fillStyle = HIGHLIGHT_COLORS.legalTarget;
  ctx.beginPath();
  ctx.arc(bounds.x + pos.col * cell + cell / 2, bounds.y + pos.row * cell + cell / 2, cell * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawBoard(ctx, options) {
  const bounds = options.bounds;
  const orientation = options.orientation === 'black' ? 'black' : 'white';
  const position = parseFen(options.fen);
  const cell = bounds.size / 8;
  const theme = options.theme || {};
  const highlights = normalizeHighlights(options);

  drawRoundRectPath(ctx, bounds.x, bounds.y, bounds.size, bounds.size, 18);
  ctx.save();
  ctx.clip();

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.boardLight || '#f0d9b5' : theme.boardDark || '#b58863';
      ctx.fillRect(bounds.x + col * cell, bounds.y + row * cell, cell, cell);
    }
  }

  highlights.lastMove.forEach((square) => fillSquare(ctx, bounds, square, orientation, HIGHLIGHT_COLORS.lastMove));
  if (highlights.selected) fillSquare(ctx, bounds, highlights.selected, orientation, HIGHLIGHT_COLORS.selected);
  highlights.expected.forEach((square) => fillSquare(ctx, bounds, square, orientation, HIGHLIGHT_COLORS.expected));
  highlights.wrong.forEach((square) => fillSquare(ctx, bounds, square, orientation, HIGHLIGHT_COLORS.wrong));
  highlights.check.forEach((square) => fillSquare(ctx, bounds, square, orientation, HIGHLIGHT_COLORS.check));
  highlights.legalTargets.forEach((square) => drawLegalDot(ctx, bounds, square, orientation));

  position.board.forEach((piece, index) => {
    if (!piece) return;
    const square = indexToSquare(index);
    const pos = squareToDisplay(square, orientation);
    const cx = bounds.x + pos.col * cell + cell / 2;
    const cy = bounds.y + pos.row * cell + cell / 2;
    const image = pieceImages[piece];
    if (image && image.loaded) {
      const imageSize = cell * 0.92;
      ctx.drawImage(image, cx - imageSize / 2, cy - imageSize / 2, imageSize, imageSize);
    } else {
      drawPieceFallback(ctx, piece, cx, cy, cell);
    }
  });

  ctx.restore();
  ctx.strokeStyle = 'rgba(44, 36, 24, 0.22)';
  ctx.lineWidth = 2;
  drawRoundRectPath(ctx, bounds.x, bounds.y, bounds.size, bounds.size, 18);
  ctx.stroke();
}

function getSquareBounds(bounds, square, orientation) {
  const pos = squareToDisplay(square, orientation === 'black' ? 'black' : 'white');
  const cell = bounds.size / 8;
  return {
    x: bounds.x + pos.col * cell,
    y: bounds.y + pos.row * cell,
    size: cell,
  };
}

function hitTest(point, bounds, orientation) {
  if (!bounds) return null;
  if (point.x < bounds.x || point.x > bounds.x + bounds.size || point.y < bounds.y || point.y > bounds.y + bounds.size) {
    return null;
  }
  const cell = bounds.size / 8;
  const col = Math.floor((point.x - bounds.x) / cell);
  const row = Math.floor((point.y - bounds.y) / cell);
  return displayToSquare(col, row, orientation === 'black' ? 'black' : 'white');
}

function pieceAt(fen, square) {
  const position = parseFen(fen);
  return position.board[squareToIndex(square)] || null;
}

module.exports = {
  preloadPieces,
  drawBoard,
  getSquareBounds,
  hitTest,
  pieceAt,
};
