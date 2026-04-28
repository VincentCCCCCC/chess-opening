const theme = require('./styles/theme.js');
const storage = require('./services/storage/index.js');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const sceneMap = {
  library: {
    title: '开局库',
    eyebrow: 'Chess Opening',
    desc: '小游戏 Canvas 骨架已启动。后续这里会展示你的开局卡片、新建入口和最近练习状态。',
  },
  detail: {
    title: '开局详情',
    eyebrow: 'Opening Detail',
    desc: '后续这里会展示开局信息、棋盘预览、变式列表和练习入口。',
  },
  edit: {
    title: '变式编辑',
    eyebrow: 'Variation Edit',
    desc: '后续这里会用棋盘录入双方走法，并通过棋规服务校验合法性。',
  },
  view: {
    title: '变式浏览',
    eyebrow: 'Variation View',
    desc: '后续这里会支持前进、后退和点击走法跳转到任意一步局面。',
  },
  practice: {
    title: '练习',
    eyebrow: 'Practice',
    desc: '后续这里会按顺序或随机练习已记录的变式，并记录正确和错误结果。',
  },
  settings: {
    title: '设置',
    eyebrow: 'Settings',
    desc: '第一版设置可后置，先保留小游戏场景占位。',
  },
};

const sceneButtons = [
  { label: '开局详情', scene: 'detail' },
  { label: '变式编辑', scene: 'edit' },
  { label: '变式浏览', scene: 'view' },
  { label: '练习', scene: 'practice' },
  { label: '设置', scene: 'settings' },
];

let dpr = 1;
let viewport = { width: 375, height: 667 };
let currentScene = 'library';
let sceneStack = [];
let hitAreas = [];
let scrollOffset = 0;
let lastTouch = null;
let touchMoved = false;
let storageState = { openingCount: 0, openingNames: [], status: '加载中' };

function refreshStorageState(status) {
  try {
    const appData = storage.loadAppData();
    storageState = {
      openingCount: appData.openings.length,
      openingNames: appData.openings.slice(-3).map((opening) => opening.name),
      status: status || '存储就绪',
    };
  } catch (error) {
    storageState = {
      openingCount: 0,
      openingNames: [],
      status: `存储异常：${error.code || error.message}`,
    };
  }
}

function setupCanvas() {
  const info = wx.getSystemInfoSync();
  dpr = info.pixelRatio || 1;
  viewport = {
    width: info.windowWidth || 375,
    height: info.windowHeight || 667,
  };
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  if (ctx.setTransform) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else {
    ctx.scale(dpr, dpr);
  }
}

function draw() {
  hitAreas = [];
  drawBackground();
  drawScene(sceneMap[currentScene]);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
  gradient.addColorStop(0, '#f8f4eb');
  gradient.addColorStop(0.52, theme.colorBg);
  gradient.addColorStop(1, theme.colorBgDeep);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.fillStyle = 'rgba(47, 111, 78, 0.06)';
  ctx.beginPath();
  ctx.arc(viewport.width - 52, 88, 118, 0, Math.PI * 2);
  ctx.fill();
}

function drawScene(scene) {
  const padding = 24;
  const safeTop = 32;
  let y = safeTop - (currentScene === 'library' ? scrollOffset : 0);

  drawText(scene.eyebrow, padding, y, 13, theme.colorPrimary, '600');
  y += 32;
  drawText(scene.title, padding, y, 30, theme.colorText, '700');
  y += 48;
  y = drawWrappedText(scene.desc, padding, y, viewport.width - padding * 2, 16, 28, theme.colorMuted);

  y += 14;
  const boardSize = currentScene === 'library'
    ? Math.min(viewport.width - padding * 2, 128)
    : Math.min(viewport.width - padding * 2, 280);
  drawBoardPreview(padding, y, boardSize);
  y += boardSize + 18;

  if (currentScene === 'library') {
    y = drawStoragePanel(padding, y, viewport.width - padding * 2);
    y += 12;
    drawSectionTitle('Phase 2 调试', padding, y);
    y += 26;
    drawButton('新增测试开局', padding, y, viewport.width - padding * 2, 42, createDebugOpening, true);
    y += 50;
    drawButton('运行 Opening CRUD 测试', padding, y, viewport.width - padding * 2, 42, runStorageSmokeTest);
    y += 50;
    drawButton('清空本地数据', padding, y, viewport.width - padding * 2, 42, resetDebugData);

    y += 62;
    drawSectionTitle('骨架场景', padding, y);
    y += 28;
    sceneButtons.forEach((button) => {
      drawButton(button.label, padding, y, viewport.width - padding * 2, 46, () => pushScene(button.scene));
      y += 58;
    });
  } else {
    drawButton('返回开局库', padding, y, viewport.width - padding * 2, 48, backToLibrary, true);
  }
}

function drawBoardPreview(x, y, size) {
  const cell = size / 8;
  drawRoundRect(x, y, size, size, 16, '#d8c6a9');
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.boardLight : theme.boardDark;
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }

  const pieces = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(cell * 0.58)}px serif`;
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = '#1f1b16';
    ctx.fillText(pieces[i], x + i * cell + cell / 2, y + cell / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('♟', x + i * cell + cell / 2, y + cell * 1.5);
    ctx.fillText('♙', x + i * cell + cell / 2, y + cell * 6.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'][i], x + i * cell + cell / 2, y + cell * 7.5);
  }

  ctx.strokeStyle = 'rgba(44, 36, 24, 0.22)';
  ctx.lineWidth = 2;
  drawRoundRectPath(x, y, size, size, 16);
  ctx.stroke();
}

function drawStoragePanel(x, y, width) {
  const panelHeight = storageState.openingNames.length ? 128 : 100;
  drawRoundRect(x, y, width, panelHeight, 18, 'rgba(255, 250, 240, 0.88)');
  ctx.strokeStyle = theme.colorBorder;
  ctx.lineWidth = 1;
  drawRoundRectPath(x, y, width, panelHeight, 18);
  ctx.stroke();

  drawText('Phase 2 本地存储', x + 16, y + 28, 16, theme.colorText, '700');
  drawText(`Opening 数量：${storageState.openingCount}`, x + 16, y + 56, 14, theme.colorMuted, '400');
  drawText(storageState.status, x + 16, y + 82, 14, theme.colorPrimary, '500');
  if (storageState.openingNames.length) {
    drawText(`最近：${storageState.openingNames.join(' / ')}`, x + 16, y + 108, 13, theme.colorMuted, '400');
  }
  return y + panelHeight;
}

function drawSectionTitle(text, x, y) {
  drawText(text, x, y, 17, theme.colorText, '700');
}

function drawButton(label, x, y, width, height, onTap, primary) {
  drawRoundRect(x, y, width, height, 16, primary ? theme.colorPrimary : theme.colorPanel);
  ctx.strokeStyle = primary ? theme.colorPrimary : theme.colorBorder;
  ctx.lineWidth = 1;
  drawRoundRectPath(x, y, width, height, 16);
  ctx.stroke();

  drawText(label, x + 18, y + height / 2 + 1, 16, primary ? '#ffffff' : theme.colorText, '600', 'left', 'middle');
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

function createDebugOpening() {
  try {
    const count = storage.listOpenings().length + 1;
    storage.createOpening({
      name: `测试开局 ${count}`,
      practiceSide: count % 2 === 0 ? 'black' : 'white',
      tags: ['debug'],
    });
    refreshStorageState('已新增测试开局');
  } catch (error) {
    refreshStorageState(`新增失败：${error.code || error.message}`);
  }
  draw();
}

function runStorageSmokeTest() {
  try {
    const result = storage.runOpeningCrudSmokeTest();
    refreshStorageState(result.ok ? 'CRUD 测试通过' : 'CRUD 测试失败');
  } catch (error) {
    refreshStorageState(`CRUD 失败：${error.code || error.message}`);
  }
  draw();
}

function resetDebugData() {
  try {
    storage.resetAppData();
    refreshStorageState('已清空并重建默认数据');
  } catch (error) {
    refreshStorageState(`清空失败：${error.code || error.message}`);
  }
  draw();
}

function pushScene(sceneName) {
  sceneStack.push(currentScene);
  currentScene = sceneName;
  scrollOffset = 0;
  draw();
}

function backToLibrary() {
  currentScene = sceneStack.pop() || 'library';
  if (currentScene !== 'library') {
    currentScene = 'library';
    sceneStack = [];
  }
  scrollOffset = 0;
  draw();
}

function handleTouch(point) {
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
  if (!touch || !lastTouch || currentScene !== 'library') return;
  const deltaY = touch.clientY - lastTouch.y;
  if (Math.abs(deltaY) > 2) touchMoved = true;
  scrollOffset = Math.max(0, Math.min(360, scrollOffset - deltaY));
  lastTouch = { x: touch.clientX, y: touch.clientY };
  draw();
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

setupCanvas();
refreshStorageState();
draw();
