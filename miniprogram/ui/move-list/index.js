function formatMoves(moves) {
  const chunks = [];
  for (let index = 0; index < moves.length; index += 2) {
    const moveNo = Math.floor(index / 2) + 1;
    const white = moves[index] ? moves[index].san : '';
    const black = moves[index + 1] ? ` ${moves[index + 1].san}` : '';
    chunks.push(`${moveNo}. ${white}${black}`);
  }
  return chunks.join('  ');
}

function draw(ctx, moves, x, y, maxWidth, theme) {
  ctx.fillStyle = theme.colorMuted;
  ctx.font = '400 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const text = moves.length ? formatMoves(moves) : '尚未走棋：点击棋子开始。';
  let line = '';
  let currentY = y;
  Array.from(text).forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      currentY += 22;
      line = char;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, x, currentY);
  return currentY + 22;
}

module.exports = {
  formatMoves,
  draw,
};
