const OPTIONS = [
  { piece: 'q', white: '♕', black: '♛' },
  { piece: 'r', white: '♖', black: '♜' },
  { piece: 'b', white: '♗', black: '♝' },
  { piece: 'n', white: '♘', black: '♞' },
];

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

function draw(ctx, bounds, theme, side) {
  const cell = bounds.size / 2;
  const isWhite = side !== 'black';

  ctx.save();
  ctx.shadowColor = 'rgba(28, 22, 14, 0.24)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(255, 250, 240, 0.98)';
  drawRoundRectPath(ctx, bounds.x, bounds.y, bounds.size, bounds.size, 14);
  ctx.fill();
  ctx.restore();

  OPTIONS.forEach((option, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = bounds.x + col * cell;
    const y = bounds.y + row * cell;
    ctx.fillStyle = index === 0 ? theme.colorPrimaryWeak || '#dcebdd' : '#fffaf0';
    ctx.fillRect(x, y, cell, cell);
    ctx.strokeStyle = theme.colorBorder || '#e2d3bd';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cell, cell);

    ctx.font = `${Math.floor(cell * 0.62)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWhite ? '#fffdf7' : '#1f1b16';
    ctx.strokeStyle = isWhite ? 'rgba(32, 28, 22, 0.55)' : 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = Math.max(1, cell * 0.025);
    const symbol = isWhite ? option.white : option.black;
    ctx.strokeText(symbol, x + cell / 2, y + cell / 2 + cell * 0.02);
    ctx.fillText(symbol, x + cell / 2, y + cell / 2 + cell * 0.02);
  });

  ctx.strokeStyle = theme.colorPrimary || '#2f6f4e';
  ctx.lineWidth = 2;
  drawRoundRectPath(ctx, bounds.x, bounds.y, bounds.size, bounds.size, 14);
  ctx.stroke();
}

function hitTest(point, bounds) {
  if (!bounds || point.x < bounds.x || point.x > bounds.x + bounds.size || point.y < bounds.y || point.y > bounds.y + bounds.size) {
    return null;
  }
  const cell = bounds.size / 2;
  const col = Math.floor((point.x - bounds.x) / cell);
  const row = Math.floor((point.y - bounds.y) / cell);
  const index = row * 2 + col;
  return OPTIONS[index] ? OPTIONS[index].piece : null;
}

module.exports = {
  OPTIONS,
  draw,
  hitTest,
};
