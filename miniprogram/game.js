const theme = require('./styles/theme.js');
const storage = require('./services/storage/index.js');
const chess = require('./services/chess/index.js');
const chessBoard = require('./ui/chess-board/index.js');
const promotionPicker = require('./ui/promotion-picker/index.js');
const moveList = require('./ui/move-list/index.js');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const OPENINGS_PER_PAGE = 3;
const AUTO_PLAY_DELAY_MS = 420;
const BUTTON_RADIUS = 10;
const MINI_BUTTON_RADIUS = 7;
const MENU_BUTTON_HEIGHT = 40;
const ACTION_BUTTON_HEIGHT = 32;

let dpr = 1;
let viewport = { width: 375, height: 667 };
let topSafeOffset = 0;
let currentScene = 'home';
let hitAreas = [];
let lastTouch = null;
let touchMoved = false;
let boardBounds = null;
let promotionBounds = null;
let appDataCache = null;
let openingPage = 0;
let detailScroll = 0;
let selectedOpeningId = null;
let selectedVariationId = null;
let detailVariationIndex = 0;
let boardState = createInitialBoardState('white');
let practiceState = null;
let renameTargetOpeningId = null;
let createOpeningDraftSide = 'white';
let variationViewStep = 0;
let statusText = '准备就绪';

function createInitialBoardState(orientation, initialFen) {
  const fen = initialFen || chess.START_FEN;
  return {
    fen,
    initialFen: fen,
    orientation: orientation || 'white',
    selectedSquare: null,
    legalTargets: [],
    lastMoveFrom: null,
    lastMoveTo: null,
    wrong: [],
    expected: [],
    check: [],
    moves: [],
    status: '点击棋子开始走棋。',
    pendingPromotion: null,
  };
}

function setupCanvas() {
  const info = wx.getSystemInfoSync();
  dpr = info.pixelRatio || 1;
  viewport = {
    width: info.windowWidth || 375,
    height: info.windowHeight || 667,
  };
  const safeTop = info.safeArea && typeof info.safeArea.top === 'number'
    ? info.safeArea.top
    : (info.statusBarHeight || 0);
  topSafeOffset = Math.max(0, Math.min(36, safeTop - 20));
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  if (ctx.setTransform) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else {
    ctx.scale(dpr, dpr);
  }
}

function topY(baseY) {
  return baseY + topSafeOffset;
}

function loadAppData() {
  try {
    appDataCache = storage.loadAppData();
    statusText = '数据已同步';
  } catch (error) {
    appDataCache = null;
    statusText = `数据异常：${error.code || error.message}`;
  }
  return appDataCache;
}

function getOpenings() {
  const data = appDataCache || loadAppData();
  return data ? data.openings : [];
}

function getSelectedOpening() {
  return getOpenings().find((opening) => opening.id === selectedOpeningId) || null;
}

function getVariationCount(openingId) {
  const data = appDataCache || loadAppData();
  if (!data) return 0;
  return data.variations.filter((variation) => variation.openingId === openingId).length;
}

function getVariations(openingId) {
  const data = appDataCache || loadAppData();
  if (!data) return [];
  return data.variations.filter((variation) => variation.openingId === openingId);
}

function getSelectedVariation() {
  return getVariations(selectedOpeningId).find((variation) => variation.id === selectedVariationId) || null;
}

function getDetailVariation(openingId) {
  const variations = getVariations(openingId);
  if (!variations.length) return null;
  detailVariationIndex = Math.max(0, Math.min(detailVariationIndex, variations.length - 1));
  return variations[detailVariationIndex];
}

function draw() {
  hitAreas = [];
  boardBounds = null;
  promotionBounds = null;
  drawBackground();

  if (currentScene === 'home') drawHome();
  if (currentScene === 'openingSelect') drawOpeningSelect();
  if (currentScene === 'openingCreate') drawOpeningCreate();
  if (currentScene === 'openingDetail') drawOpeningDetail();
  if (currentScene === 'variationEdit') drawVariationEdit();
  if (currentScene === 'variationView') drawVariationView();
  if (currentScene === 'practice') drawPractice();
  if (currentScene === 'settings') drawSettings();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
  gradient.addColorStop(0, '#f8f4eb');
  gradient.addColorStop(0.55, theme.colorBg);
  gradient.addColorStop(1, theme.colorBgDeep);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.fillStyle = 'rgba(47, 111, 78, 0.07)';
  ctx.beginPath();
  ctx.arc(viewport.width - 52, 90, 122, 0, Math.PI * 2);
  ctx.fill();
}

function drawHome() {
  const padding = 28;
  let y = 72;
  drawText('Chess Opening', padding, y, 14, theme.colorPrimary, '700');
  y += 46;
  drawText('开局练习', padding, y, 42, theme.colorText, '800');
  y += 42;
  y = drawWrappedText('用棋盘记录你的国际象棋开局，然后按白方或黑方反复练习。', padding, y, viewport.width - padding * 2, 18, 30, theme.colorMuted);

  const heroSize = Math.min(viewport.width - padding * 2, 292);
  y += 34;
  chessBoard.drawBoard(ctx, {
    bounds: { x: padding, y, size: heroSize },
    fen: chess.START_FEN,
    orientation: 'white',
    theme,
  });

  y += heroSize + 34;
  drawButton('开始游戏', padding, y, viewport.width - padding * 2, 58, goOpeningSelect, true);
  y += 72;
  drawButton('设置', padding, y, viewport.width - padding * 2, 54, goSettings);
}

function drawOpeningSelect() {
  loadAppData();
  const padding = 22;
  const openings = getOpenings();
  const pageCount = Math.max(1, Math.ceil(openings.length / OPENINGS_PER_PAGE));
  openingPage = Math.max(0, Math.min(openingPage, pageCount - 1));
  const visible = openings.slice(openingPage * OPENINGS_PER_PAGE, openingPage * OPENINGS_PER_PAGE + OPENINGS_PER_PAGE);
  let y = topY(34);

  drawButton('‹', padding, y, 42, 38, goHome);
  drawText('选择一个开局吧', padding + 56, y + 27, 26, theme.colorText, '800');
  y += 58;
  drawText(openings.length ? '点选棋盘缩略图进入开局。' : '还没有开局，先创建一个。', padding, y, 15, theme.colorMuted, '400');
  y += 28;

  if (!visible.length) {
    drawEmptyOpeningState(padding, y, viewport.width - padding * 2);
    y += 250;
  } else {
    visible.forEach((opening) => {
      drawOpeningCard(opening, padding, y, viewport.width - padding * 2);
      y += 128;
    });
  }

  const footerY = Math.max(y + 8, viewport.height - 118);
  drawButton('上一页', padding, footerY, 88, 44, prevOpeningPage, openingPage > 0);
  drawText(`${openingPage + 1} / ${pageCount}`, viewport.width / 2, footerY + 29, 15, theme.colorMuted, '600', 'center');
  drawButton('下一页', viewport.width - padding - 88, footerY, 88, 44, nextOpeningPage, openingPage < pageCount - 1);
  drawButton('创建开局', padding, footerY + 58, viewport.width - padding * 2, 50, createOpeningFlow, true);
}

function drawEmptyOpeningState(x, y, width) {
  drawRoundRect(x, y, width, 210, 22, 'rgba(255, 250, 240, 0.86)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(x, y, width, 210, 22);
  ctx.stroke();
  drawText('还没有开局', x + 22, y + 48, 24, theme.colorText, '800');
  drawWrappedText('创建第一个开局后，会在这里显示棋盘缩略图、开局名称和练习方。', x + 22, y + 76, width - 44, 15, 24, theme.colorMuted);
}

function drawOpeningCard(opening, x, y, width) {
  drawRoundRect(x, y, width, 112, 22, 'rgba(255, 250, 240, 0.91)');
  ctx.strokeStyle = theme.colorBorder;
  ctx.lineWidth = 1;
  drawRoundRectPath(x, y, width, 112, 22);
  ctx.stroke();

  const thumbSize = 82;
  chessBoard.drawBoard(ctx, {
    bounds: { x: x + 16, y: y + 15, size: thumbSize },
    fen: opening.initialFen || chess.START_FEN,
    orientation: opening.practiceSide,
    theme,
  });

  const textX = x + 114;
  drawText(opening.name, textX, y + 34, 21, theme.colorText, '800');
  drawText(opening.practiceSide === 'white' ? '白方开局' : '黑方开局', textX, y + 62, 15, theme.colorPrimary, '700');
  drawText(`${getVariationCount(opening.id)} 条变例`, textX, y + 88, 14, theme.colorMuted, '400');
  hitAreas.push({ x, y, width, height: 112, onTap: () => openOpeningDetail(opening.id) });
}

function drawOpeningDetail() {
  loadAppData();
  const opening = getSelectedOpening();
  if (!opening) {
    currentScene = 'openingSelect';
    drawOpeningSelect();
    return;
  }

  const padding = 18;
  let y = topY(26) - detailScroll;
  drawButton('‹', padding, y, 42, 38, goOpeningSelect);
  drawText(opening.name, padding + 54, y + 27, 24, theme.colorText, '800');
  drawText(opening.practiceSide === 'white' ? '白方开局' : '黑方开局', padding + 54, y + 52, 14, theme.colorPrimary, '700');
  y += 76;

  const sideBySide = viewport.width >= 430;
  const menuWidth = sideBySide ? 92 : viewport.width - padding * 2;
  const boardSize = sideBySide
    ? Math.min(viewport.width - padding * 2 - menuWidth - 12, viewport.height - y - 28)
    : Math.min(viewport.width - padding * 2, 340);
  boardBounds = { x: padding, y, size: boardSize };
  drawInteractiveBoard(boardBounds);

  if (sideBySide) {
    drawSideMenu(padding + boardSize + 12, y, menuWidth, boardSize, opening, true);
    y += boardSize + 16;
  } else {
    y += boardSize + 14;
    drawSideMenu(padding, y, menuWidth, 172, opening, false);
    y += 188;
  }

  drawDetailStatusPanel(padding, y, viewport.width - padding * 2, opening);
}

function drawOpeningCreate() {
  const padding = 18;
  let y = topY(26);
  drawButton('‹', padding, y, 42, 38, cancelOpeningCreate);
  drawText('设置起始状态', padding + 54, y + 27, 24, theme.colorText, '800');
  drawText(createOpeningDraftSide === 'white' ? '白方开局' : '黑方开局', padding + 54, y + 52, 14, theme.colorPrimary, '700');
  y += 76;

  const boardSize = Math.min(viewport.width - padding * 2, viewport.height - 236);
  boardBounds = { x: padding, y, size: boardSize };
  drawInteractiveBoard(boardBounds);
  y += boardSize + 14;

  drawRoundRect(padding, y, viewport.width - padding * 2, 148, 18, 'rgba(255, 250, 240, 0.9)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(padding, y, viewport.width - padding * 2, 148, 18);
  ctx.stroke();
  drawText('开局从这里开始', padding + 16, y + 26, 16, theme.colorText, '800');
  drawText(boardState.moves.length ? boardState.status : '可直接保存标准初始局面，或先在棋盘上走到目标局面。', padding + 16, y + 52, 13, theme.colorPrimary, '600');
  moveList.draw(ctx, boardState.moves, padding + 16, y + 76, viewport.width - padding * 2 - 32, theme);

  const buttonY = y + 104;
  const panelInnerWidth = viewport.width - padding * 2 - 20;
  const buttonGap = 9;
  const buttonWidth = (panelInnerWidth - buttonGap * 2) / 3;
  drawMiniMenuButton('撤销', padding + 10, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, undoOpeningCreateMove);
  drawMiniMenuButton('重置', padding + 10 + buttonWidth + buttonGap, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, resetOpeningCreateBoard);
  drawMiniMenuButton('创建', padding + 10 + (buttonWidth + buttonGap) * 2, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, saveOpeningCreate, true);
}

function drawInteractiveBoard(bounds) {
  chessBoard.drawBoard(ctx, {
    bounds,
    fen: boardState.fen,
    orientation: boardState.orientation,
    selectedSquare: boardState.selectedSquare,
    legalTargets: boardState.legalTargets,
    lastMoveFrom: boardState.lastMoveFrom,
    lastMoveTo: boardState.lastMoveTo,
    highlights: {
      wrong: boardState.wrong,
      expected: boardState.expected,
      check: boardState.check,
    },
    theme,
  });

  if (boardState.pendingPromotion) {
    promotionBounds = createPromotionBounds(bounds, boardState.pendingPromotion.to);
    promotionPicker.draw(ctx, promotionBounds, theme, boardState.pendingPromotion.side);
  }
}

function createPromotionBounds(bounds, targetSquare) {
  const target = chessBoard.getSquareBounds(bounds, targetSquare, boardState.orientation);
  const size = target.size * 2;
  const centeredX = target.x + target.size / 2 - size / 2;
  const centeredY = target.y + target.size / 2 - size / 2;
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.size - size, centeredX)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.size - size, centeredY)),
    size,
  };
}

function drawSideMenu(x, y, width, height, opening, vertical) {
  drawRoundRect(x, y, width, height, 20, 'rgba(255, 250, 240, 0.92)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(x, y, width, height, 20);
  ctx.stroke();

  const menuItems = [
    { label: '添加变例', onTap: startVariationEdit, primary: true },
    { label: '变例练习', onTap: startPracticeFlow },
    { label: '改名', onTap: renameOpeningFlow },
    { label: '切换方', onTap: toggleOpeningSide },
    { label: '删除', onTap: deleteOpeningFlow },
  ];

  if (vertical) {
    const innerPad = 12;
    const itemGap = Math.max(12, (height - innerPad * 2 - menuItems.length * MENU_BUTTON_HEIGHT) / (menuItems.length - 1));
    menuItems.forEach((item, index) => {
      drawMiniMenuButton(
        item.label,
        x + 10,
        y + innerPad + index * (MENU_BUTTON_HEIGHT + itemGap),
        width - 20,
        MENU_BUTTON_HEIGHT,
        item.onTap,
        item.primary
      );
    });
    return;
  }

  const gap = 8;
  const itemWidth = (width - 20 - gap) / 2;
  const innerPad = 12;
  const rowGap = (height - innerPad * 2 - MENU_BUTTON_HEIGHT * 3) / 2;
  const row1 = y + innerPad;
  const row2 = row1 + MENU_BUTTON_HEIGHT + rowGap;
  const row3 = row2 + MENU_BUTTON_HEIGHT + rowGap;
  drawMiniMenuButton(menuItems[0].label, x + 10, row1, itemWidth, MENU_BUTTON_HEIGHT, menuItems[0].onTap, true);
  drawMiniMenuButton(menuItems[1].label, x + 10 + itemWidth + gap, row1, itemWidth, MENU_BUTTON_HEIGHT, menuItems[1].onTap);
  drawMiniMenuButton(menuItems[2].label, x + 10, row2, itemWidth, MENU_BUTTON_HEIGHT, menuItems[2].onTap);
  drawMiniMenuButton(menuItems[3].label, x + 10 + itemWidth + gap, row2, itemWidth, MENU_BUTTON_HEIGHT, menuItems[3].onTap);
  drawMiniMenuButton(menuItems[4].label, x + 10, row3, itemWidth, MENU_BUTTON_HEIGHT, menuItems[4].onTap);
}

function drawMiniMenuButton(label, x, y, width, height, onTap, primary, danger) {
  drawRoundRect(x, y, width, height, MINI_BUTTON_RADIUS, primary ? theme.colorPrimary : '#fffaf0');
  ctx.strokeStyle = primary ? theme.colorPrimary : (danger ? theme.colorDanger : theme.colorBorder);
  drawRoundRectPath(x, y, width, height, MINI_BUTTON_RADIUS);
  ctx.stroke();
  drawText(label, x + width / 2, y + height / 2, 14, primary ? '#ffffff' : (danger ? theme.colorDanger : theme.colorText), '700', 'center', 'middle');
  hitAreas.push({ x, y, width, height, onTap });
}

function drawDetailStatusPanel(x, y, width, opening) {
  const variations = getVariations(opening.id);
  const panelHeight = variations.length ? 266 : 150;
  drawRoundRect(x, y, width, panelHeight, 18, 'rgba(255, 250, 240, 0.88)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(x, y, width, panelHeight, 18);
  ctx.stroke();
  drawText('当前棋盘', x + 16, y + 26, 16, theme.colorText, '800');
  drawText(boardState.status, x + 16, y + 52, 14, theme.colorPrimary, '600');
  moveList.draw(ctx, boardState.moves, x + 16, y + 78, width - 32, theme);
  drawText(`方向：${opening.practiceSide === 'white' ? '白方在底部' : '黑方在底部'}`, x + 16, y + 110, 13, theme.colorMuted, '400');

  drawText('变例', x + 16, y + 142, 16, theme.colorText, '800');
  if (!variations.length) {
    drawText('还没有变例，点击“添加变例”录入第一条。', x + 16, y + 168, 13, theme.colorMuted, '400');
    return;
  }

  const variation = getDetailVariation(opening.id);
  const navY = y + 154;
  drawMiniMenuButton('‹', x + 16, navY, 36, ACTION_BUTTON_HEIGHT, prevDetailVariation);
  drawText(`变例 ${detailVariationIndex + 1} / ${variations.length}`, x + width / 2, navY + 22, 14, theme.colorMuted, '700', 'center');
  drawMiniMenuButton('›', x + width - 52, navY, 36, ACTION_BUTTON_HEIGHT, nextDetailVariation);

  drawText(variation.name, x + 16, y + 208, 16, theme.colorText, '800');
  drawText(`${variation.plyCount} 手`, x + width - 58, y + 208, 13, theme.colorMuted, '400');

  const gap = 10;
  const buttonY = y + 222;
  const buttonWidth = (width - 32 - gap) / 2;
  drawMiniMenuButton('查看', x + 16, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, () => startVariationView(variation.id), true);
  drawMiniMenuButton('练习', x + 16 + buttonWidth + gap, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, () => startPractice(variation.id));
}

function drawVariationEdit() {
  const opening = getSelectedOpening();
  if (!opening) {
    currentScene = 'openingSelect';
    drawOpeningSelect();
    return;
  }

  const padding = 18;
  let y = topY(26);
  drawButton('‹', padding, y, 42, 38, cancelVariationEdit);
  drawText('添加变例', padding + 54, y + 27, 24, theme.colorText, '800');
  drawText(opening.name, padding + 54, y + 52, 14, theme.colorPrimary, '700');
  y += 76;

  const boardSize = Math.min(viewport.width - padding * 2, viewport.height - 236);
  boardBounds = { x: padding, y, size: boardSize };
  drawInteractiveBoard(boardBounds);
  y += boardSize + 14;

  drawRoundRect(padding, y, viewport.width - padding * 2, 148, 18, 'rgba(255, 250, 240, 0.9)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(padding, y, viewport.width - padding * 2, 148, 18);
  ctx.stroke();
  drawText('录入主线', padding + 16, y + 26, 16, theme.colorText, '800');
  drawText(boardState.status, padding + 16, y + 52, 14, theme.colorPrimary, '600');
  moveList.draw(ctx, boardState.moves, padding + 16, y + 78, viewport.width - padding * 2 - 32, theme);

  const buttonY = y + 104;
  const panelInnerWidth = viewport.width - padding * 2 - 20;
  const buttonGap = 9;
  const buttonWidth = (panelInnerWidth - buttonGap * 2) / 3;
  drawMiniMenuButton('撤销', padding + 10, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, undoVariationMove);
  drawMiniMenuButton('清空', padding + 10 + buttonWidth + buttonGap, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, resetVariationBoard);
  drawMiniMenuButton('保存', padding + 10 + (buttonWidth + buttonGap) * 2, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, saveVariationFlow, true);
}

function drawVariationView() {
  const opening = getSelectedOpening();
  const variation = getSelectedVariation();
  if (!opening || !variation) {
    currentScene = 'openingDetail';
    drawOpeningDetail();
    return;
  }

  const padding = 18;
  let y = topY(26);
  drawButton('‹', padding, y, 42, 38, exitVariationView);
  drawText('查看变例', padding + 54, y + 27, 24, theme.colorText, '800');
  drawText(`${opening.name} · ${variation.name}`, padding + 54, y + 52, 14, theme.colorPrimary, '700');
  y += 76;

  const boardSize = Math.min(viewport.width - padding * 2, viewport.height - 290);
  boardBounds = { x: padding, y, size: boardSize };
  drawInteractiveBoard(boardBounds);
  y += boardSize + 14;

  drawRoundRect(padding, y, viewport.width - padding * 2, 202, 18, 'rgba(255, 250, 240, 0.92)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(padding, y, viewport.width - padding * 2, 202, 18);
  ctx.stroke();
  drawText(`${variationViewStep} / ${variation.moves.length} 手`, padding + 16, y + 28, 16, theme.colorText, '800');
  drawText(boardState.status, padding + 16, y + 56, 14, theme.colorPrimary, '600');
  moveList.draw(ctx, boardState.moves, padding + 16, y + 82, viewport.width - padding * 2 - 32, theme);

  const gap = 8;
  const buttonY = y + 116;
  const buttonWidth = (viewport.width - padding * 2 - 20 - gap * 3) / 4;
  drawMiniMenuButton('开头', padding + 10, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, () => jumpVariationView(0));
  drawMiniMenuButton('上一步', padding + 10 + (buttonWidth + gap), buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, prevVariationStep);
  drawMiniMenuButton('下一步', padding + 10 + (buttonWidth + gap) * 2, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, nextVariationStep, true);
  drawMiniMenuButton('结尾', padding + 10 + (buttonWidth + gap) * 3, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT, () => jumpVariationView(variation.moves.length));
  drawMiniMenuButton('删除变例', padding + 10, y + 156, 112, ACTION_BUTTON_HEIGHT, deleteSelectedVariationFlow, false, true);
}

function drawPractice() {
  const opening = getSelectedOpening();
  const variation = getSelectedVariation();
  if (!opening || !variation || !practiceState) {
    currentScene = 'openingDetail';
    drawOpeningDetail();
    return;
  }

  const padding = 18;
  let y = topY(26);
  drawButton('‹', padding, y, 42, 38, exitPractice);
  drawText('变例练习', padding + 54, y + 27, 24, theme.colorText, '800');
  drawText(`${opening.name} · ${variation.name}`, padding + 54, y + 52, 14, theme.colorPrimary, '700');
  y += 76;

  const boardSize = Math.min(viewport.width - padding * 2, viewport.height - 246);
  boardBounds = { x: padding, y, size: boardSize };
  drawInteractiveBoard(boardBounds);
  y += boardSize + 14;

  const done = Math.min(practiceState.nextIndex, variation.moves.length);
  drawRoundRect(padding, y, viewport.width - padding * 2, 158, 18, 'rgba(255, 250, 240, 0.92)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(padding, y, viewport.width - padding * 2, 158, 18);
  ctx.stroke();
  drawText(`${done} / ${variation.moves.length} 手`, padding + 16, y + 28, 16, theme.colorText, '800');
  drawText(boardState.status, padding + 16, y + 56, 14, theme.colorPrimary, '600');
  moveList.draw(ctx, boardState.moves, padding + 16, y + 82, viewport.width - padding * 2 - 32, theme);

  if (practiceState.status === 'showing_error_feedback') {
    drawMiniMenuButton('再试一次', padding + 10, y + 112, 112, ACTION_BUTTON_HEIGHT, retryPracticeMove, true);
    drawMiniMenuButton('查看正确走法', padding + 132, y + 112, 132, ACTION_BUTTON_HEIGHT, showPracticeAnswer);
  } else if (practiceState.status === 'showing_answer') {
    drawMiniMenuButton('我知道了', padding + 10, y + 112, 112, ACTION_BUTTON_HEIGHT, resumePracticeAfterAnswer, true);
  } else if (practiceState.status === 'variation_completed') {
    drawMiniMenuButton('再练一次', padding + 10, y + 112, 112, ACTION_BUTTON_HEIGHT, () => startPractice(variation.id), true);
    drawMiniMenuButton('返回开局', padding + 132, y + 112, 112, ACTION_BUTTON_HEIGHT, exitPractice);
  } else {
    drawMiniMenuButton('退出练习', padding + 10, y + 112, 112, ACTION_BUTTON_HEIGHT, exitPractice);
  }
}

function drawSettings() {
  const padding = 24;
  let y = topY(34);
  drawButton('‹', padding, y, 42, 38, goHome);
  drawText('设置', padding + 56, y + 27, 28, theme.colorText, '800');
  y += 80;
  drawRoundRect(padding, y, viewport.width - padding * 2, 150, 22, 'rgba(255, 250, 240, 0.88)');
  ctx.strokeStyle = theme.colorBorder;
  drawRoundRectPath(padding, y, viewport.width - padding * 2, 150, 22);
  ctx.stroke();
  drawText('本地数据', padding + 18, y + 34, 18, theme.colorText, '800');
  drawText(statusText, padding + 18, y + 64, 14, theme.colorMuted, '400');
  drawButton('清空本地数据', padding + 18, y + 88, viewport.width - padding * 2 - 36, 42, resetDataWithConfirm);
}

function drawButton(label, x, y, width, height, onTap, primary) {
  drawRoundRect(x, y, width, height, BUTTON_RADIUS, primary ? theme.colorPrimary : theme.colorPanel);
  ctx.strokeStyle = primary ? theme.colorPrimary : theme.colorBorder;
  ctx.lineWidth = 1;
  drawRoundRectPath(x, y, width, height, BUTTON_RADIUS);
  ctx.stroke();
  drawText(label, x + width / 2, y + height / 2, 17, primary ? '#ffffff' : theme.colorText, '800', 'center', 'middle');
  hitAreas.push({ x, y, width, height, onTap });
}

function drawText(text, x, y, size, color, weight, align, baseline) {
  ctx.fillStyle = color;
  ctx.font = `${weight || '400'} ${size}px sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'alphabetic';
  ctx.fillText(text, x, y);
}

function drawWrappedText(text, x, y, maxWidth, size, lineHeight, color) {
  ctx.fillStyle = color;
  ctx.font = `400 ${size}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let line = '';
  let currentY = y;
  Array.from(text).forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawRoundRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  drawRoundRectPath(x, y, width, height, radius);
  ctx.fill();
}

function drawRoundRectPath(x, y, width, height, radius) {
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

function goHome() {
  currentScene = 'home';
  draw();
}

function goSettings() {
  loadAppData();
  currentScene = 'settings';
  draw();
}

function goOpeningSelect() {
  loadAppData();
  currentScene = 'openingSelect';
  draw();
}

function prevOpeningPage() {
  openingPage = Math.max(0, openingPage - 1);
  draw();
}

function nextOpeningPage() {
  const pageCount = Math.max(1, Math.ceil(getOpenings().length / OPENINGS_PER_PAGE));
  openingPage = Math.min(pageCount - 1, openingPage + 1);
  draw();
}

function createOpeningFlow() {
  const createWithSide = (side) => startOpeningCreate(side);

  if (wx.showActionSheet) {
    wx.showActionSheet({
      itemList: ['白方开局', '黑方开局'],
      success: (res) => createWithSide(res.tapIndex === 1 ? 'black' : 'white'),
      fail: () => {},
    });
    return;
  }
  createWithSide('white');
}

function startOpeningCreate(side) {
  createOpeningDraftSide = side === 'black' ? 'black' : 'white';
  boardState = createInitialBoardState(createOpeningDraftSide);
  boardState.status = '走到你想保存的起始局面，然后点创建。';
  currentScene = 'openingCreate';
  draw();
}

function cancelOpeningCreate() {
  boardState = createInitialBoardState('white');
  currentScene = 'openingSelect';
  draw();
}

function undoOpeningCreateMove() {
  if (currentScene !== 'openingCreate' || !boardState.moves.length) {
    showToast('还没有可撤销的走法');
    return;
  }
  const moves = boardState.moves.slice(0, -1);
  replayBoardMoves(moves);
  boardState.status = moves.length ? '已撤销一步，可继续设置。' : '已回到标准初始局面。';
  draw();
}

function resetOpeningCreateBoard() {
  boardState = createInitialBoardState(createOpeningDraftSide);
  boardState.status = '已重置为标准初始局面。';
  draw();
}

function saveOpeningCreate() {
  const openings = getOpenings();
  const opening = storage.createOpening({
    name: `${createOpeningDraftSide === 'white' ? '白方' : '黑方'}开局 ${openings.length + 1}`,
    practiceSide: createOpeningDraftSide,
    initialFen: boardState.fen,
    tags: [],
  });
  loadAppData();
  const pageCount = Math.max(1, Math.ceil(getOpenings().length / OPENINGS_PER_PAGE));
  openingPage = pageCount - 1;
  openOpeningDetail(opening.id);
}

function openOpeningDetail(openingId) {
  selectedOpeningId = openingId;
  selectedVariationId = null;
  detailVariationIndex = 0;
  practiceState = null;
  const opening = getOpenings().find((item) => item.id === openingId);
  boardState = createInitialBoardState(opening ? opening.practiceSide : 'white', opening && opening.initialFen);
  currentScene = 'openingDetail';
  detailScroll = 0;
  draw();
}

function toggleOpeningSide() {
  const opening = getSelectedOpening();
  if (!opening) return;
  const nextSide = opening.practiceSide === 'white' ? 'black' : 'white';
  storage.updateOpening(opening.id, { practiceSide: nextSide });
  loadAppData();
  boardState.orientation = nextSide;
  boardState.status = nextSide === 'white' ? '已切换为白方开局。' : '已切换为黑方开局。';
  draw();
}

function renameOpeningFlow() {
  const opening = getSelectedOpening();
  if (!opening) return;
  renameTargetOpeningId = opening.id;

  if (wx.showKeyboard) {
    wx.showKeyboard({
      defaultValue: opening.name,
      maxLength: 24,
      multiple: false,
      confirmType: 'done',
    });
    showToast('输入新名称后点完成');
    return;
  }

  showToast('当前环境不支持键盘改名');
}

function commitOpeningRename(value) {
  if (!renameTargetOpeningId) return;
  const name = String(value || '').trim();
  const openingId = renameTargetOpeningId;
  renameTargetOpeningId = null;

  if (!name) {
    showToast('名称不能为空');
    return;
  }

  const updated = storage.updateOpening(openingId, { name });
  if (!updated) {
    showToast('改名失败');
    return;
  }
  loadAppData();
  boardState.status = `已改名为「${name}」。`;
  draw();
}

function deleteOpeningFlow() {
  const opening = getSelectedOpening();
  if (!opening) return;
  const doDelete = () => {
    storage.deleteOpening(opening.id);
    selectedOpeningId = null;
    loadAppData();
    currentScene = 'openingSelect';
    draw();
  };

  if (wx.showModal) {
    wx.showModal({
      title: '删除开局？',
      content: `确认删除「${opening.name}」及其变例记录？`,
      confirmText: '删除',
      confirmColor: '#c94c43',
      success: (res) => {
        if (res.confirm) doDelete();
      },
      fail: () => {},
    });
    return;
  }
  doDelete();
}

function startVariationEdit() {
  const opening = getSelectedOpening();
  if (!opening) return;
  selectedVariationId = null;
  practiceState = null;
  boardState = createInitialBoardState(opening.practiceSide, opening.initialFen);
  boardState.status = '在棋盘上走出这条变例，保存后可用于练习。';
  currentScene = 'variationEdit';
  detailScroll = 0;
  draw();
}

function cancelVariationEdit() {
  const opening = getSelectedOpening();
  boardState = createInitialBoardState(opening ? opening.practiceSide : 'white', opening && opening.initialFen);
  currentScene = 'openingDetail';
  draw();
}

function prevDetailVariation() {
  const opening = getSelectedOpening();
  if (!opening) return;
  const variations = getVariations(opening.id);
  if (!variations.length) return;
  detailVariationIndex = (detailVariationIndex - 1 + variations.length) % variations.length;
  draw();
}

function nextDetailVariation() {
  const opening = getSelectedOpening();
  if (!opening) return;
  const variations = getVariations(opening.id);
  if (!variations.length) return;
  detailVariationIndex = (detailVariationIndex + 1) % variations.length;
  draw();
}

function startVariationView(variationId) {
  const opening = getSelectedOpening();
  const variation = getVariations(selectedOpeningId).find((item) => item.id === variationId);
  if (!opening || !variation) return;

  const replay = chess.replayVariation(variation.initialFen, variation.moves);
  if (!replay.ok) {
    showToast('这条变例数据异常，暂不能查看');
    return;
  }

  selectedVariationId = variation.id;
  practiceState = null;
  currentScene = 'variationView';
  setVariationViewStep(0);
  draw();
}

function exitVariationView() {
  const opening = getSelectedOpening();
  selectedVariationId = null;
  variationViewStep = 0;
  boardState = createInitialBoardState(opening ? opening.practiceSide : 'white', opening && opening.initialFen);
  currentScene = 'openingDetail';
  draw();
}

function setVariationViewStep(step) {
  const opening = getSelectedOpening();
  const variation = getSelectedVariation();
  if (!opening || !variation) return;

  const safeStep = Math.max(0, Math.min(step, variation.moves.length));
  variationViewStep = safeStep;
  boardState = createInitialBoardState(opening.practiceSide, variation.initialFen);
  if (safeStep > 0) {
    const visibleMoves = variation.moves.slice(0, safeStep);
    const lastMove = visibleMoves[visibleMoves.length - 1];
    boardState.fen = lastMove.fenAfter;
    boardState.moves = visibleMoves.slice();
    boardState.lastMoveFrom = lastMove.from;
    boardState.lastMoveTo = lastMove.to;
  }
  boardState.status = safeStep === 0
    ? '初始局面。点击下一步回放。'
    : `第 ${safeStep} 手：${variation.moves[safeStep - 1].san}`;
}

function jumpVariationView(step) {
  setVariationViewStep(step);
  draw();
}

function prevVariationStep() {
  jumpVariationView(variationViewStep - 1);
}

function nextVariationStep() {
  jumpVariationView(variationViewStep + 1);
}

function deleteSelectedVariationFlow() {
  const opening = getSelectedOpening();
  const variation = getSelectedVariation();
  if (!opening || !variation) return;

  const doDelete = () => {
    storage.deleteVariation(variation.id);
    selectedVariationId = null;
    variationViewStep = 0;
    loadAppData();
    detailVariationIndex = Math.max(0, Math.min(detailVariationIndex, getVariations(opening.id).length - 1));
    boardState = createInitialBoardState(opening.practiceSide, opening.initialFen);
    boardState.status = '变例已删除。';
    currentScene = 'openingDetail';
    draw();
  };

  if (wx.showModal) {
    wx.showModal({
      title: '删除变例？',
      content: `确认删除「${variation.name}」？`,
      confirmText: '删除',
      confirmColor: '#c94c43',
      success: (res) => {
        if (res.confirm) doDelete();
      },
      fail: () => {},
    });
    return;
  }
  doDelete();
}

function undoVariationMove() {
  if (currentScene !== 'variationEdit' || !boardState.moves.length) {
    showToast('还没有可撤销的走法');
    return;
  }
  const moves = boardState.moves.slice(0, -1);
  replayBoardMoves(moves);
  boardState.status = moves.length ? '已撤销一步，可继续录入。' : '已回到初始局面。';
  draw();
}

function resetVariationBoard() {
  const opening = getSelectedOpening();
  boardState = createInitialBoardState(opening ? opening.practiceSide : 'white', opening && opening.initialFen);
  boardState.status = '已清空，重新录入这条变例。';
  draw();
}

function saveVariationFlow() {
  const opening = getSelectedOpening();
  if (!opening || currentScene !== 'variationEdit') return;
  if (!boardState.moves.length) {
    showToast('至少走一步再保存变例');
    return;
  }

  const doSave = () => {
    let variation = null;
    try {
      variation = storage.createVariation({
        openingId: opening.id,
        initialFen: opening.initialFen,
        moves: boardState.moves,
      });
    } catch (error) {
      variation = null;
    }
    if (!variation) {
      showToast('保存失败，请重新录入');
      return;
    }
    loadAppData();
    detailVariationIndex = Math.max(0, getVariations(opening.id).length - 1);
    showToast('变例已保存');
    boardState = createInitialBoardState(opening.practiceSide, opening.initialFen);
    currentScene = 'openingDetail';
    draw();
  };

  if (wx.showModal) {
    wx.showModal({
      title: '保存变例？',
      content: `将保存 ${boardState.moves.length} 手为新的训练变例。`,
      confirmText: '保存',
      success: (res) => {
        if (res.confirm) doSave();
      },
    });
    return;
  }
  doSave();
}

function startPracticeFlow() {
  const opening = getSelectedOpening();
  if (!opening) return;
  const variations = getVariations(opening.id);
  if (!variations.length) {
    showToast('请先添加一条变例');
    return;
  }

  if (currentScene === 'openingDetail') {
    const variation = getDetailVariation(opening.id);
    if (variation) startPractice(variation.id);
    return;
  }

  if (variations.length === 1 || !wx.showActionSheet) {
    startPractice(variations[0].id);
    return;
  }

  const visible = variations.slice(0, 6);
  wx.showActionSheet({
    itemList: visible.map((variation) => variation.name),
    success: (res) => {
      const variation = visible[res.tapIndex];
      if (variation) startPractice(variation.id);
    },
    fail: () => {},
  });
}

function startPractice(variationId) {
  const opening = getSelectedOpening();
  const variation = getVariations(selectedOpeningId).find((item) => item.id === variationId);
  if (!opening || !variation) return;

  const replay = chess.replayVariation(variation.initialFen, variation.moves);
  if (!replay.ok) {
    showToast('这条变例数据异常，暂不能练习');
    return;
  }

  selectedVariationId = variation.id;
  boardState = createInitialBoardState(opening.practiceSide, variation.initialFen);
  boardState.status = '准备开始练习。';
  practiceState = {
    openingId: opening.id,
    variationId: variation.id,
    nextIndex: 0,
    status: 'loading',
    mistakeCount: 0,
    mistakes: [],
    startedAt: Date.now(),
    saved: false,
  };
  currentScene = 'practice';
  draw();
  advancePractice();
}

function exitPractice() {
  const opening = getSelectedOpening();
  practiceState = null;
  selectedVariationId = null;
  boardState = createInitialBoardState(opening ? opening.practiceSide : 'white', opening && opening.initialFen);
  currentScene = 'openingDetail';
  draw();
}

function resetDataWithConfirm() {
  const doReset = () => {
    storage.resetAppData();
    selectedOpeningId = null;
    openingPage = 0;
    loadAppData();
    showToast('本地数据已清空');
    draw();
  };

  if (wx.showModal) {
    wx.showModal({
      title: '清空本地数据？',
      content: '会删除所有开局、变例和练习记录。',
      confirmText: '清空',
      confirmColor: '#c94c43',
      success: (res) => {
        if (res.confirm) doReset();
      },
    });
    return;
  }
  doReset();
}

function showToast(title) {
  if (wx.showToast) {
    wx.showToast({ title, icon: 'none' });
  }
}

function clearBoardFeedback() {
  boardState.wrong = [];
  boardState.expected = [];
  boardState.check = [];
}

function isBoardScene() {
  return currentScene === 'openingDetail' || currentScene === 'openingCreate' || currentScene === 'variationEdit' || currentScene === 'practice';
}

function selectSquare(square) {
  const piece = chessBoard.pieceAt(boardState.fen, square);
  if (!piece) {
    boardState.selectedSquare = null;
    boardState.legalTargets = [];
    boardState.status = '请选择当前轮到的一方棋子。';
    return;
  }

  const legalMoves = chess.getLegalMoves(boardState.fen).filter((move) => move.from === square);
  if (!legalMoves.length) {
    boardState.selectedSquare = null;
    boardState.legalTargets = [];
    boardState.status = '这个棋子当前没有合法走法。';
    return;
  }

  boardState.selectedSquare = square;
  boardState.legalTargets = Array.from(new Set(legalMoves.map((move) => move.to)));
  boardState.status = `已选择 ${square}，请选择目标格。`;
}

function handleBoardTap(square) {
  if (!square || !isBoardScene()) return false;
  if (currentScene === 'practice' && (!practiceState || practiceState.status !== 'waiting_user_move')) {
    boardState.status = '请按当前提示操作。';
    return true;
  }
  clearBoardFeedback();

  if (boardState.pendingPromotion) {
    boardState.status = '请先选择升变棋子。';
    return true;
  }

  if (!boardState.selectedSquare) {
    selectSquare(square);
    return true;
  }

  if (square === boardState.selectedSquare) {
    boardState.selectedSquare = null;
    boardState.legalTargets = [];
    boardState.status = '已取消选择。';
    return true;
  }

  if (!boardState.legalTargets.includes(square)) {
    const piece = chessBoard.pieceAt(boardState.fen, square);
    if (piece) {
      selectSquare(square);
    } else if (currentScene === 'practice' && practiceState) {
      const variation = getSelectedVariation();
      const expected = variation && variation.moves[practiceState.nextIndex];
      markPracticeMistake(expected, boardState.selectedSquare, square);
    } else {
      boardState.wrong = [boardState.selectedSquare, square];
      boardState.status = '非法目标格，请重新选择。';
    }
    return true;
  }

  const result = chess.tryMove({
    fen: boardState.fen,
    from: boardState.selectedSquare,
    to: square,
  });

  if (!result.ok && result.reason === 'promotion_required') {
    const side = chess.createPosition(boardState.fen).turn === 'w' ? 'white' : 'black';
    boardState.pendingPromotion = { from: boardState.selectedSquare, to: square, side };
    boardState.expected = [boardState.selectedSquare, square];
    boardState.status = '在升变格上选择后、车、象或马。';
    return true;
  }

  applyMoveResultForScene(result, boardState.selectedSquare, square);
  return true;
}

function handlePromotionTap(point) {
  if (!isBoardScene() || !boardState.pendingPromotion || !promotionBounds) return false;
  const promotion = promotionPicker.hitTest(point, promotionBounds);
  if (!promotion) return false;
  const pending = boardState.pendingPromotion;
  const result = chess.tryMove({
    fen: boardState.fen,
    from: pending.from,
    to: pending.to,
    promotion,
  });
  boardState.pendingPromotion = null;
  boardState.expected = [];
  applyMoveResultForScene(result, pending.from, pending.to, promotion);
  return true;
}

function applyMoveResultForScene(result, from, to, promotion) {
  if (currentScene === 'practice') {
    applyPracticeAttempt(result, from, to, promotion);
    return;
  }
  applyMoveResult(result, from, to);
}

function applyMoveResult(result, from, to) {
  if (!result.ok) {
    boardState.wrong = [from, to];
    boardState.status = result.reason === 'wrong_turn' ? '还没轮到这个颜色走。' : '非法走法。';
    return;
  }

  boardState.fen = result.fenAfter;
  boardState.moves.push(result.move);
  boardState.selectedSquare = null;
  boardState.legalTargets = [];
  boardState.lastMoveFrom = from;
  boardState.lastMoveTo = to;
  boardState.wrong = [];
  boardState.expected = [];
  boardState.check = result.check ? [findKingSquare(result.fenAfter)] : [];
  boardState.status = `已走 ${result.san}，现在轮到${result.move.side === 'white' ? '黑方' : '白方'}。`;
}

function replayBoardMoves(moves) {
  const orientation = boardState.orientation;
  const initialFen = boardState.initialFen;
  boardState = createInitialBoardState(orientation, initialFen);
  moves.forEach((move) => {
    boardState.fen = move.fenAfter;
    boardState.moves.push(move);
    boardState.lastMoveFrom = move.from;
    boardState.lastMoveTo = move.to;
  });
}

function applyRecordedMove(move, status) {
  const result = chess.tryMove({
    fen: boardState.fen,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  });

  if (!result.ok) {
    boardState.status = '变例数据异常，请返回后重新录入。';
    return false;
  }

  boardState.fen = result.fenAfter;
  boardState.moves.push(result.move);
  boardState.selectedSquare = null;
  boardState.legalTargets = [];
  boardState.lastMoveFrom = move.from;
  boardState.lastMoveTo = move.to;
  boardState.wrong = [];
  boardState.expected = [];
  boardState.check = result.check ? [findKingSquare(result.fenAfter)] : [];
  boardState.status = status || `程序已走 ${result.san}`;
  return true;
}

function movesMatch(actual, expected) {
  return Boolean(actual && expected &&
    actual.from === expected.from &&
    actual.to === expected.to &&
    (actual.promotion || null) === (expected.promotion || null));
}

function getPracticeContext() {
  const opening = getSelectedOpening();
  const variation = getSelectedVariation();
  if (!opening || !variation || !practiceState) return null;
  return { opening, variation };
}

function advancePractice() {
  const context = getPracticeContext();
  if (!context || currentScene !== 'practice') return;
  const { opening, variation } = context;

  if (practiceState.nextIndex >= variation.moves.length) {
    completePractice();
    draw();
    return;
  }

  const nextMove = variation.moves[practiceState.nextIndex];
  if (nextMove.side === opening.practiceSide) {
    practiceState.status = 'waiting_user_move';
    boardState.status = `轮到你走 ${opening.practiceSide === 'white' ? '白方' : '黑方'}。`;
    draw();
    return;
  }

  practiceState.status = 'auto_playing_opponent';
  boardState.status = '对手方自动走棋中...';
  draw();
  const variationId = practiceState.variationId;
  setTimeout(() => {
    if (!practiceState || practiceState.variationId !== variationId || currentScene !== 'practice') return;
    const latest = getSelectedVariation();
    const move = latest && latest.moves[practiceState.nextIndex];
    if (!move) {
      completePractice();
      draw();
      return;
    }
    if (applyRecordedMove(move, `对手已走 ${move.san}，轮到你。`)) {
      practiceState.nextIndex += 1;
    } else {
      practiceState.status = 'showing_error_feedback';
    }
    advancePractice();
  }, AUTO_PLAY_DELAY_MS);
}

function applyPracticeAttempt(result, from, to, promotion) {
  const context = getPracticeContext();
  if (!context || practiceState.status !== 'waiting_user_move') return;
  const expected = context.variation.moves[practiceState.nextIndex];

  if (!result.ok || !movesMatch(result.move, expected)) {
    markPracticeMistake(expected, from, to, promotion);
    return;
  }

  applyMoveResult(result, from, to);
  boardState.status = '正确';
  practiceState.nextIndex += 1;
  practiceState.status = 'showing_correct_feedback';
  setTimeout(() => {
    if (practiceState && currentScene === 'practice') advancePractice();
  }, AUTO_PLAY_DELAY_MS);
}

function markPracticeMistake(expected, from, to, promotion) {
  boardState.selectedSquare = null;
  boardState.legalTargets = [];
  boardState.pendingPromotion = null;
  boardState.wrong = [from, to];
  boardState.expected = [];
  boardState.status = '这一步不对，可以重试或查看正确走法。';
  practiceState.status = 'showing_error_feedback';
  practiceState.mistakeCount += 1;
  practiceState.mistakes.push({
    variationId: practiceState.variationId,
    ply: expected ? expected.ply : practiceState.nextIndex + 1,
    expectedFrom: expected ? expected.from : '',
    expectedTo: expected ? expected.to : '',
    actualFrom: from,
    actualTo: to,
    promotion: promotion || null,
    createdAt: Date.now(),
  });
}

function retryPracticeMove() {
  if (!practiceState) return;
  clearBoardFeedback();
  practiceState.status = 'waiting_user_move';
  boardState.selectedSquare = null;
  boardState.legalTargets = [];
  boardState.status = '再试一次。';
  draw();
}

function showPracticeAnswer() {
  const context = getPracticeContext();
  if (!context) return;
  const expected = context.variation.moves[practiceState.nextIndex];
  if (!expected) return;
  boardState.wrong = [];
  boardState.expected = [expected.from, expected.to];
  boardState.status = `正确走法：${expected.san}`;
  practiceState.status = 'showing_answer';
  draw();
}

function resumePracticeAfterAnswer() {
  if (!practiceState) return;
  clearBoardFeedback();
  practiceState.status = 'waiting_user_move';
  boardState.status = '请重新走出这一步。';
  draw();
}

function completePractice() {
  const context = getPracticeContext();
  if (!context || practiceState.saved) return;
  practiceState.status = 'variation_completed';
  practiceState.saved = true;
  const durationMs = Date.now() - practiceState.startedAt;
  const lastMistake = practiceState.mistakes[practiceState.mistakes.length - 1];
  storage.recordPracticeResult({
    openingId: context.opening.id,
    variationId: context.variation.id,
    mode: 'single',
    mistakeCount: practiceState.mistakeCount,
    mistakes: practiceState.mistakes,
    lastMistakePly: lastMistake && lastMistake.ply,
    durationMs,
    startedAt: practiceState.startedAt,
  });
  loadAppData();
  boardState.status = practiceState.mistakeCount
    ? `完成，有 ${practiceState.mistakeCount} 次错误记录。`
    : '全对完成。';
}

function findKingSquare(fen) {
  const position = chess.createPosition(fen);
  const king = position.turn === 'w' ? 'K' : 'k';
  const index = position.board.findIndex((piece) => piece === king);
  return index >= 0 ? indexToSquare(index) : null;
}

function indexToSquare(index) {
  const files = 'abcdefgh';
  return `${files[index % 8]}${Math.floor(index / 8) + 1}`;
}

function handleTouch(point) {
  if (handlePromotionTap(point)) {
    draw();
    return;
  }

  const boardSquare = isBoardScene() ? chessBoard.hitTest(point, boardBounds, boardState.orientation) : null;
  if (boardSquare && handleBoardTap(boardSquare)) {
    draw();
    return;
  }

  const target = hitAreas.find((area) => (
    point.x >= area.x &&
    point.x <= area.x + area.width &&
    point.y >= area.y &&
    point.y <= area.y + area.height
  ));
  if (target) target.onTap();
}

wx.onTouchStart((event) => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  lastTouch = { x: touch.clientX, y: touch.clientY };
  touchMoved = false;
});

wx.onTouchMove((event) => {
  const touch = event.touches && event.touches[0];
  if (!touch || !lastTouch) return;
  const deltaY = touch.clientY - lastTouch.y;
  const deltaX = touch.clientX - lastTouch.x;
  if (Math.abs(deltaY) > 8 || Math.abs(deltaX) > 8) touchMoved = true;
  if (currentScene === 'openingDetail' && Math.abs(deltaY) > Math.abs(deltaX)) {
    detailScroll = Math.max(0, Math.min(260, detailScroll - deltaY));
    lastTouch = { x: touch.clientX, y: touch.clientY };
    draw();
  }
});

wx.onTouchEnd((event) => {
  if (!lastTouch) return;
  const touch = event.changedTouches && event.changedTouches[0];
  const point = touch ? { x: touch.clientX, y: touch.clientY } : lastTouch;
  lastTouch = null;
  if (!touchMoved) handleTouch(point);
});

if (wx.onWindowResize) {
  wx.onWindowResize(() => {
    setupCanvas();
    draw();
  });
}

if (wx.onKeyboardConfirm) {
  wx.onKeyboardConfirm((event) => {
    commitOpeningRename(event && event.value);
  });
}

setupCanvas();
chessBoard.preloadPieces(draw);
loadAppData();
draw();
