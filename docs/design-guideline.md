# 国际象棋开局记录与练习小程序设计 Guideline

本文档是后续产品、交互、数据结构、页面、组件和实现设计的统一准则。除非后续明确变更，所有功能设计都应以本文档为基准。

## 1. 产品定位

### 1.1 产品一句话

一个面向个人使用的微信小程序，用棋盘完成国际象棋开局变式的记录、浏览和记忆练习。

### 1.2 核心目标

- 让用户快速创建自己的开局库。
- 让用户在棋盘上录入开局变式，而不是在表单里手写棋谱。
- 让用户按固定顺序或随机顺序练习已记录的变式。
- 练习时用户只操作自己选择的开局方，程序按记录自动走对手方。
- 用户走对时顺畅继续；用户走错时可以重试，也可以查看正确走法。
- 第一版优先满足个人本地使用，不追求社交、分享、账号体系和云同步。

### 1.3 非目标

第一版不做以下内容：

- 不做在线对弈。
- 不做 AI 引擎分析。
- 不做最佳着法推荐。
- 不做自动开局名称识别。
- 不做 PGN 导入导出，但数据结构预留扩展空间。
- 不做复杂积分、排行榜、分享和社区功能。
- 不做变式内分类、章节、难度分组等复杂管理。
- 不做每条变式的结束语或关键局面说明。

## 2. 用户与使用场景

### 2.1 用户画像

当前目标用户是开发者本人，主要用于个人开局 repertoire 的积累和复习。

因此第一版设计原则是：

- 功能直接，路径短。
- 不为了新用户教育增加大量说明。
- 不为了多人协作设计权限和同步冲突。
- 允许界面稍偏专业，但必须保持操作清晰。
- 数据以可靠、本地可恢复为优先。

### 2.2 典型场景

#### 场景 A：创建一个开局

用户想开始记录一个新开局，例如“西西里防御 Najdorf 黑方”。

流程：

1. 进入首页。
2. 点击“新建开局”。
3. 输入开局名称。
4. 选择练习方：白方或黑方。
5. 可选添加标签，用于区分开局。
6. 保存后进入开局详情页。

#### 场景 B：创建一条变式

用户在某个开局里录入一条完整变式。

流程：

1. 进入开局详情页。
2. 点击“新建变式”。
3. 在棋盘上依次走双方棋子。
4. 程序校验每一步是否合法。
5. 用户可撤销、重走、保存。
6. 保存时输入变式名称，可选备注。
7. 变式出现在该开局的变式列表中。

#### 场景 C：浏览变式

用户想回看自己录入过的变式。

流程：

1. 进入开局详情页。
2. 从变式列表选择一条变式。
3. 棋盘显示初始局面。
4. 用户点击走法列表中的任一步，棋盘跳转到对应局面。
5. 用户可前进、后退、回到开头、跳到结尾。

#### 场景 D：按顺序练习

用户想按创建顺序或列表顺序练习该开局下所有变式。

流程：

1. 进入开局详情页。
2. 点击“顺序练习”。
3. 程序从第一条待练变式开始。
4. 用户走自己一方的棋子。
5. 程序自动走对手方的记录走法。
6. 一条变式完成后进入下一条。
7. 全部完成后显示练习结果。

#### 场景 E：随机练习

用户想打乱变式顺序练习。

流程：

1. 进入开局详情页。
2. 点击“随机练习”。
3. 程序随机排列该开局下的变式。
4. 每条变式内部仍按正常走法顺序练习。
5. 完成后显示本轮结果。

## 3. 信息架构

### 3.1 顶层结构

第一版建议只保留一个主入口：开局库。

页面结构：

- 首页 / 开局库
- 开局详情
- 变式编辑
- 变式浏览
- 练习页
- 设置页，可后置

不建议第一版做复杂 TabBar。由于应用是个人工具，核心路径应集中在“开局库 -> 开局详情 -> 棋盘操作”。

### 3.2 首页：开局库

首页职责：

- 展示所有开局。
- 创建开局。
- 快速进入最近练习的开局。
- 通过标签或颜色区分开局。

首页信息：

- 开局名称。
- 练习方：白方 / 黑方。
- 标签。
- 变式数量。
- 最近练习时间。
- 最近正确率或连续全对次数。

首页主要操作：

- 新建开局。
- 进入开局详情。
- 编辑开局基础信息。
- 删除开局，需二次确认。

### 3.3 开局详情页

开局详情页是产品核心页。

页面职责：

- 展示当前开局的棋盘预览。
- 展示该开局下的变式列表。
- 提供新建变式入口。
- 提供顺序练习、随机练习入口。
- 提供开局设置入口。

建议布局：

- 顶部：开局名称、练习方、返回按钮、更多按钮。
- 中部：棋盘预览，默认显示初始局面或最近浏览局面。
- 底部：变式列表与主要操作。
- 底部固定操作区：新建变式、顺序练习、随机练习。

变式列表项展示：

- 变式名称。
- 首几步走法摘要，例如 `1. e4 c5 2. Nf3 d6`。
- 总步数。
- 练习状态：未练 / 已完成 / 最近出错 / 连续全对。
- 最近练习时间。

### 3.4 变式编辑页

变式编辑页必须以棋盘为中心。

页面职责：

- 录入走法。
- 校验走法合法性。
- 展示已录入走法。
- 支持撤销、重做、保存。

建议布局：

- 顶部：返回、变式名称、保存。
- 中部：棋盘。
- 棋盘下方：当前轮到哪方走、最近一步走法。
- 底部：走法列表、撤销、重做、清空、保存。

编辑规则：

- 录入时用户可以走白方和黑方双方棋子。
- 每一步必须通过合法性校验。
- 非法走法不写入变式，只显示错误提示。
- 保存前至少需要一手走法。
- 保存时如果没有名称，自动生成名称，例如“变式 1”。
- 允许只记录开局片段，不要求必须到终局。

### 3.5 变式浏览页

变式浏览页用于复盘，不改变数据。

页面职责：

- 回放变式。
- 查看任一步局面。
- 进入练习该变式。
- 进入编辑该变式。

建议操作：

- 上一步。
- 下一步。
- 回到开头。
- 跳到结尾。
- 从当前变式开始练习。
- 编辑变式。

### 3.6 练习页

练习页是最高优先级体验页。

页面职责：

- 引导用户按记录走自己的开局方。
- 自动播放对手走法。
- 对正确和错误走法给出明确反馈。
- 记录练习结果。

建议布局：

- 顶部：开局名、当前变式、进度，例如 `2 / 8`。
- 中部：棋盘。
- 棋盘下方：当前提示，例如“白方走棋”或“黑方回应中”。
- 底部：当前变式走法进度、重试、查看正确走法、结束练习。

## 4. 开局与变式概念

### 4.1 开局 Opening

开局是用户创建的训练主题。

字段建议：

- 名称，例如“意大利开局 白方”。
- 练习方：白方或黑方。
- 标签：用于区分开局，例如“白方 repertoire”“对 1.e4”“黑方防御”。
- 创建时间。
- 更新时间。
- 最近练习时间。
- 变式数量。

设计原则：

- 开局需要支持区分和筛选。
- 标签只属于开局，不属于开局内变式。
- 一个开局内所有变式默认练习同一方。

### 4.2 变式 Variation

变式是某个开局下的一条走法序列。

第一版按简单模型处理：一条变式就是一条线性走法，不做分支树。

字段建议：

- 所属开局 ID。
- 变式名称。
- 走法序列。
- 初始局面，第一版默认为标准初始局面。
- 创建时间。
- 更新时间。
- 总半回合数 plyCount。
- 最近练习结果。

设计原则：

- 变式不做分类。
- 变式可以重命名。
- 变式可以删除，删除前二次确认。
- 变式可以复制，方便创建相近路线。
- 后续如需支持变式树，可从线性变式升级为共享节点结构。

## 5. 棋盘交互规范

### 5.1 棋盘视觉参考

棋盘 UI 参考 lichess 和 chess.com，但不复制其品牌视觉。

第一版视觉方向：

- 棋盘为核心，尽量大。
- 使用清晰的双色格。
- 支持最后一步高亮。
- 支持选中棋子高亮。
- 支持可走目标格提示。
- 支持错误格红色提示。
- 支持正确走法绿色提示。

建议默认主题：

- 浅格：`#f0d9b5`
- 深格：`#b58863`
- 选中：`rgba(246, 206, 84, 0.65)`
- 最后一步：`rgba(205, 210, 106, 0.65)`
- 正确：`rgba(80, 180, 120, 0.65)`
- 错误：`rgba(230, 78, 78, 0.70)`
- 可走点：`rgba(20, 20, 20, 0.18)`

### 5.2 棋盘方向

棋盘方向由开局练习方决定：

- 练习方为白方：白棋在底部。
- 练习方为黑方：黑棋在底部。

浏览和编辑时默认沿用开局练习方方向，但可提供“翻转棋盘”按钮。

### 5.3 棋子操作

第一版默认支持点击操作：

1. 点击己方棋子，选中棋子。
2. 高亮合法目标格。
3. 点击目标格，尝试走棋。
4. 如果合法，更新棋盘。
5. 如果非法，保留原局面并提示。

后续可增加拖拽操作，但不能影响点击操作的稳定性。

### 5.4 合法走法要求

必须支持标准国际象棋规则：

- 普通走法。
- 吃子。
- 王车易位。
- 吃过路兵。
- 兵升变。
- 将军状态。
- 不能走导致己方王被将军的走法。

不需要支持：

- 变体规则。
- 自定义棋子。
- 非标准棋盘。

### 5.5 升变交互

当兵走到最后一横排：

1. 弹出升变选择层。
2. 选项：后、车、象、马。
3. 默认高亮后。
4. 用户选择后才提交该步。
5. 练习时如果正确走法包含升变，用户必须选择正确升变棋子。

### 5.6 棋盘状态高亮

棋盘至少支持以下状态：

- `selected`：当前选中棋子。
- `legal-target`：当前棋子的可走目标。
- `last-move-from` / `last-move-to`：上一步走法。
- `expected-from` / `expected-to`：查看正确走法时展示。
- `wrong-from` / `wrong-to`：用户错误走法。
- `check`：王被将军。

高亮优先级：

1. 错误提示。
2. 正确走法提示。
3. 将军提示。
4. 当前选中。
5. 最后一步。
6. 可走目标。

## 6. 练习模式设计

### 6.1 练习模式类型

#### 顺序练习

- 按当前变式列表顺序练习。
- 默认顺序为创建时间升序。
- 后续可支持手动排序。

#### 随机练习

- 随机打乱变式顺序。
- 每条变式内部走法顺序不变。
- 随机结果在本轮练习开始时固定，避免中途变化。

#### 单条练习

- 从某条变式详情页进入。
- 只练当前变式。

### 6.2 练习方

每个开局创建时选择练习方：

- 白方练习：用户走白棋，程序走黑棋。
- 黑方练习：用户走黑棋，程序走白棋。

变式内部不单独设置练习方。

### 6.3 练习流程

以白方练习为例：

1. 棋盘显示初始局面。
2. 程序等待用户走白方第一步。
3. 用户走棋。
4. 程序比对用户走法是否等于记录中的白方走法。
5. 如果正确，程序自动执行记录中的黑方回应。
6. 进入下一轮用户走棋。
7. 重复直到变式结束。
8. 记录本条变式结果。

黑方练习时：

1. 如果变式第一步是白方走法，程序先自动执行白方第一步。
2. 用户再走黑方回应。
3. 后续流程相同。

### 6.4 走法比对规则

用户走法必须与记录走法完全一致。

比对字段：

- 起点格。
- 终点格。
- 升变棋子，如果有。

不建议第一版只比对 SAN 文本，因为 SAN 可能因局面上下文和歧义标记产生额外复杂度。

### 6.5 正确反馈

用户走对时：

- 执行用户走法。
- 高亮最后一步。
- 短暂显示“正确”。
- 如果存在对手下一步，延迟 300-600ms 自动执行。
- 自动执行对手走法后，高亮对手最后一步。
- 进入下一步等待。

反馈应轻量，避免频繁打断。

### 6.6 错误反馈

用户走错时：

- 不推进练习进度。
- 用户错误走法不写入当前练习记录的主线进度。
- 棋盘回到走错前局面。
- 错误起点和终点短暂红色高亮。
- 当前变式标记为“本次非全对”。
- 底部显示操作：重试、查看正确走法。

用户可选择：

#### 重试

- 保持在当前局面。
- 清除错误高亮。
- 用户再次尝试当前步。

#### 查看正确走法

- 高亮正确起点和终点。
- 显示正确走法文本。
- 用户点击“我知道了”后，程序可自动执行正确走法并继续，或让用户重新走一遍。
- 第一版建议：查看后仍要求用户重新走一遍，加深记忆。

### 6.7 全对反馈

当某条变式从头到尾没有任何错误：

- 显示轻量完成态。
- 记录为全对。
- 更新连续全对次数。
- 更新最近练习时间。
- 显示本条用时。
- 顺序或随机练习中自动进入下一条，建议等待用户点击“下一条”。

当一轮练习全部完成：

- 显示总变式数。
- 全对条数。
- 有错条数。
- 总用时。
- 可选择“再练一轮”或“返回开局”。

### 6.8 有错但完成

如果用户中途走错，但最终完成该变式：

- 记录为完成但非全对。
- 保留错误步信息。
- 正确率可按“正确用户步数 / 用户尝试步数”计算。
- 后续可用于错题复习。

## 7. 数据模型

第一版使用本地存储。建议用清晰版本号封装，方便后续迁移到云数据库。

### 7.1 数据根结构

```ts
type AppData = {
  schemaVersion: number;
  openings: Opening[];
  variations: Variation[];
  practiceSessions: PracticeSession[];
  settings: AppSettings;
};
```

### 7.2 Opening

```ts
type Opening = {
  id: string;
  name: string;
  sideToPractice: 'white' | 'black';
  tags: string[];
  color?: string;
  createdAt: number;
  updatedAt: number;
  lastPracticedAt?: number;
  archived?: boolean;
};
```

说明：

- `sideToPractice` 是开局级设置。
- `tags` 用于开局区分。
- `archived` 为后续归档预留。

### 7.3 Variation

```ts
type Variation = {
  id: string;
  openingId: string;
  name: string;
  moves: RecordedMove[];
  initialFen: string;
  createdAt: number;
  updatedAt: number;
  stats: VariationStats;
};
```

第一版 `initialFen` 默认标准初始局面：

```txt
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

### 7.4 RecordedMove

```ts
type RecordedMove = {
  ply: number;
  side: 'white' | 'black';
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
  san?: string;
  lan?: string;
  fenAfter: string;
};

type Square =
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8';
```

说明：

- `from/to/promotion` 是练习比对的核心。
- `san` 用于展示。
- `fenAfter` 用于快速跳转和调试。

### 7.5 VariationStats

```ts
type VariationStats = {
  practiceCount: number;
  perfectCount: number;
  currentPerfectStreak: number;
  lastPracticedAt?: number;
  lastResult?: 'perfect' | 'completed_with_errors' | 'abandoned';
  lastMistakes?: PracticeMistake[];
};
```

### 7.6 PracticeSession

```ts
type PracticeSession = {
  id: string;
  openingId: string;
  mode: 'single' | 'sequential' | 'random';
  variationIds: string[];
  startedAt: number;
  endedAt?: number;
  results: PracticeVariationResult[];
};
```

### 7.7 PracticeVariationResult

```ts
type PracticeVariationResult = {
  variationId: string;
  startedAt: number;
  endedAt?: number;
  status: 'perfect' | 'completed_with_errors' | 'abandoned';
  expectedUserMoveCount: number;
  correctUserMoveCount: number;
  mistakeCount: number;
  mistakes: PracticeMistake[];
};
```

### 7.8 PracticeMistake

```ts
type PracticeMistake = {
  ply: number;
  expected: {
    from: Square;
    to: Square;
    promotion?: 'q' | 'r' | 'b' | 'n';
  };
  actual: {
    from: Square;
    to: Square;
    promotion?: 'q' | 'r' | 'b' | 'n';
  };
  createdAt: number;
};
```

## 8. 状态机设计

### 8.1 练习页状态

```ts
type PracticeState =
  | 'loading'
  | 'auto_playing_opponent'
  | 'waiting_user_move'
  | 'showing_correct_feedback'
  | 'showing_error_feedback'
  | 'showing_answer'
  | 'variation_completed'
  | 'session_completed'
  | 'abandoned';
```

### 8.2 状态流转

#### 初始化

- `loading -> auto_playing_opponent`：黑方练习且当前第一步是白方。
- `loading -> waiting_user_move`：当前轮到用户方。

#### 用户走对

- `waiting_user_move -> showing_correct_feedback`
- `showing_correct_feedback -> auto_playing_opponent`，如果还有对手步。
- `showing_correct_feedback -> variation_completed`，如果变式结束。

#### 程序走对手步

- `auto_playing_opponent -> waiting_user_move`，如果还有用户步。
- `auto_playing_opponent -> variation_completed`，如果变式结束。

#### 用户走错

- `waiting_user_move -> showing_error_feedback`
- 用户点重试：`showing_error_feedback -> waiting_user_move`
- 用户点查看正确走法：`showing_error_feedback -> showing_answer`
- 用户看完答案：`showing_answer -> waiting_user_move`

#### 完成

- `variation_completed -> waiting_user_move`，进入下一条变式。
- `variation_completed -> session_completed`，没有下一条变式。

### 8.3 防重复操作

在以下状态中应禁止用户走棋：

- `loading`
- `auto_playing_opponent`
- `showing_correct_feedback`
- `variation_completed`
- `session_completed`

这样可以避免动画或自动走法期间误触导致状态错乱。

## 9. 页面与组件设计

### 9.1 推荐工程结构

小程序代码建议放在独立 `miniprogram/` 目录，仓库根目录保留文档、脚本和后续工具。

```txt
chess-opening/
  project.config.json
  miniprogram/
    app.ts
    app.json
    app.wxss
    pages/
      openings/
      opening-detail/
      variation-edit/
      variation-view/
      practice/
      settings/
    components/
      chess-board/
      piece/
      move-list/
      opening-card/
      variation-card/
      practice-result/
      promotion-picker/
    services/
      storage/
      chess/
      practice/
    models/
    assets/
      pieces/
        cburnett/
    styles/
  docs/
    design-guideline.md
  LICENSES/
    cburnett.md
```

微信小程序页面和组件应保持同名文件组：

```txt
pages/openings/openings.ts
pages/openings/openings.wxml
pages/openings/openings.wxss
pages/openings/openings.json
```

组件也应保持同名文件组，并在组件 json 中声明 `component: true`。

### 9.2 页面路由建议

```json
{
  "pages": [
    "pages/openings/openings",
    "pages/opening-detail/opening-detail",
    "pages/variation-edit/variation-edit",
    "pages/variation-view/variation-view",
    "pages/practice/practice",
    "pages/settings/settings"
  ]
}
```

### 9.3 核心组件

#### chess-board

职责：

- 渲染棋盘。
- 渲染棋子。
- 处理点击选择和目标格点击。
- 展示高亮。
- 根据方向翻转棋盘。

输入属性：

- `positionFen`
- `orientation`
- `selectedSquare`
- `legalTargets`
- `highlights`
- `disabled`

输出事件：

- `squaretap`
- `movetry`
- `promotionrequired`

#### move-list

职责：

- 展示变式走法。
- 按完整回合展示白方和黑方走法。
- 支持点击某一步跳转。

#### promotion-picker

职责：

- 展示升变选择。
- 返回升变棋子。

#### variation-card

职责：

- 展示变式摘要。
- 展示最近练习状态。
- 进入浏览或练习。

#### practice-result

职责：

- 展示单条变式或整轮练习结果。
- 提供下一条、再练一次、返回开局。

## 10. 国际象棋规则服务

### 10.1 职责

`services/chess/` 应封装所有棋规相关逻辑，页面和组件不直接判断复杂规则。

主要能力：

- 从 FEN 创建局面。
- 生成合法走法。
- 尝试走法。
- 输出新 FEN。
- 输出 SAN。
- 判断将军。
- 判断升变。
- 判断游戏是否结束，虽然开局练习不依赖终局。

### 10.2 推荐接口

```ts
type TryMoveInput = {
  fen: string;
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
};

type TryMoveResult =
  | {
      ok: true;
      move: RecordedMove;
      fenAfter: string;
      san: string;
    }
  | {
      ok: false;
      reason: 'illegal_move' | 'promotion_required' | 'wrong_turn';
    };
```

### 10.3 实现建议

优先使用成熟棋规库，避免自行实现完整国际象棋规则。

选择库时关注：

- 是否支持 TypeScript。
- 是否支持 FEN。
- 是否支持 SAN。
- 是否支持王车易位、吃过路兵、升变。
- 是否适合微信小程序构建环境。

如果后续引入第三方库，应记录其许可证。

## 11. 本地存储设计

### 11.1 存储原则

- 第一版本地存储即可。
- 所有数据带 `schemaVersion`。
- 每次写入前做最小校验。
- 关键写入尽量整包原子替换。
- 预留导出备份能力。

### 11.2 Key 设计

```txt
chessOpening.appData.v1
```

后续迁移时：

```txt
chessOpening.appData.v2
```

### 11.3 数据迁移

启动时流程：

1. 读取最新 key。
2. 如果不存在，创建默认数据。
3. 如果 schemaVersion 旧，执行迁移。
4. 如果数据损坏，提示用户并保留原始备份。

### 11.4 删除策略

第一版可以真删除，但建议实现前先考虑软删除：

- 开局删除会删除其下所有变式和练习记录关联。
- 删除开局必须二次确认。
- 删除变式必须二次确认。

## 12. UI 视觉规范

### 12.1 整体风格

关键词：

- 专注。
- 棋盘优先。
- 安静但清晰。
- 工具感强。
- 反馈明确。

不建议：

- 过度卡通化。
- 大面积紫色默认风格。
- 过多弹窗。
- 过重的游戏化视觉。

### 12.2 色彩

建议建立 CSS 变量：

```css
page {
  --color-bg: #f7f2e8;
  --color-panel: #fffaf0;
  --color-text: #2c2418;
  --color-muted: #8a7a65;
  --color-border: #e2d3bd;
  --color-primary: #2f6f4e;
  --color-primary-weak: #dcebdd;
  --color-danger: #c94c43;
  --color-warning: #c98b2e;
  --board-light: #f0d9b5;
  --board-dark: #b58863;
}
```

### 12.3 字体与排版

微信小程序内字体选择有限，优先保证可读性。

建议：

- 标题使用较强字重。
- 棋谱 SAN 使用等宽或数字对齐风格。
- 按钮文案短而明确。
- 棋盘周围减少大段说明。

### 12.4 按钮层级

主要按钮：

- 新建变式。
- 顺序练习。
- 随机练习。
- 保存。

次要按钮：

- 撤销。
- 重做。
- 编辑。
- 翻转棋盘。

危险按钮：

- 删除开局。
- 删除变式。
- 清空当前录入。

### 12.5 反馈文案

正确：

- “正确”
- “继续”
- “本条全对”

错误：

- “这一步不对”
- “再试一次”
- “查看正确走法”

完成：

- “完成本条”
- “全对完成”
- “完成，有错误记录”

## 13. 素材规范

### 13.1 棋子素材

使用 lichess 的 cburnett 棋子素材：

- 来源：https://github.com/lichess-org/lila/tree/master/public/piece/cburnett
- Lichess 授权说明：https://github.com/lichess-org/lila/blob/master/COPYING.md
- 该目录在 Lichess 授权文件中标注为 Colin M.L. Burnett，许可证 GPLv2+

### 13.2 本地目录

建议放置：

```txt
miniprogram/assets/pieces/cburnett/
  wK.svg
  wQ.svg
  wR.svg
  wB.svg
  wN.svg
  wP.svg
  bK.svg
  bQ.svg
  bR.svg
  bB.svg
  bN.svg
  bP.svg
LICENSES/cburnett.md
```

### 13.3 授权注意

因为该素材是 GPLv2+，后续如果小程序不是仅个人使用，而是发布、分发或商业化，需要重新评估授权影响。第一版个人使用也应保留来源和许可证说明，避免后续遗忘。

## 14. 错误与边界情况

### 14.1 空数据

首页没有开局时：

- 显示空状态。
- 文案：“还没有开局，先创建一个训练主题。”
- 主按钮：“新建开局”。

开局没有变式时：

- 显示棋盘初始局面。
- 文案：“这个开局还没有变式。”
- 主按钮：“新建变式”。

### 14.2 变式过短

允许保存一条只有一手或几手的变式。

练习时按已有走法结束，不要求完整开局长度。

### 14.3 轮到对手但无对手走法

如果变式结束在对手应走之前，直接完成变式。

### 14.4 黑方练习的起始自动步

黑方练习时，如果变式从白方第一手开始：

- 进入练习后程序自动走白方第一手。
- 用户从黑方第一手开始练。

如果后续支持非标准初始局面，需要根据 FEN 的 side-to-move 判断是否先自动走。

### 14.5 数据损坏

如果某条变式走法无法从初始局面合法重放：

- 不进入练习。
- 在变式列表标记“数据异常”。
- 提供删除或编辑入口。
- 不自动修复，避免进一步损坏。

## 15. MVP 功能清单

### 15.1 必须完成

- 创建、编辑、删除开局。
- 开局支持练习方选择。
- 开局支持标签。
- 创建、编辑、删除变式。
- 在棋盘上录入变式。
- 合法走法校验。
- 棋盘展示 cburnett 棋子。
- 浏览变式。
- 单条练习。
- 顺序练习。
- 随机练习。
- 用户走错后可重试或查看正确走法。
- 全对和有错完成的结果记录。
- 本地存储。

### 15.2 可以延后

- 拖拽走棋。
- PGN 导入导出。
- 云同步。
- 错题复习队列。
- 间隔重复。
- 变式树。
- 搜索。
- 自定义棋盘主题。
- 多开局混合练习。
- 数据备份导出。

## 16. 后续版本路线图

### 16.1 V1：个人可用版

目标：完成核心闭环。

范围：

- 开局库。
- 变式录入。
- 变式浏览。
- 顺序和随机练习。
- 本地结果记录。

### 16.2 V1.1：效率增强

范围：

- 拖拽走棋。
- 复制变式。
- 变式重排序。
- 练习历史详情。
- 只练最近出错变式。

### 16.3 V1.2：导入导出

范围：

- PGN 导出。
- PGN 导入。
- 本地 JSON 备份和恢复。

### 16.4 V2：高级训练

范围：

- 变式树。
- 从任意局面开始练。
- 间隔重复。
- 错题本。
- 多开局混合随机练习。

### 16.5 V3：同步与发布

仅当不再只是个人使用时考虑：

- 微信登录。
- 云同步。
- 多设备数据一致性。
- 隐私说明。
- 素材授权重新审查。
- 分享与导入他人开局库。

## 17. 设计决策记录

当前已确认决策：

- 用户走错时，可以重试，也可以查看正确走法。
- 开局需要支持区分，使用标签等开局级信息。
- 开局内变式第一版按简单列表处理，不做分类。
- 不需要变式结束语或关键局面说明。
- 当前目标是个人使用。
- 其他未特别指定的点采用默认建议。

默认建议包括：

- 开局创建时选择练习方。
- 第一版变式用线性棋谱，不做变式树。
- 随机练习指随机变式顺序，而不是打乱变式内部走法。
- 第一版不做云同步。
- 第一版不做 PGN 导入导出，但预留字段。
- 第一版不做引擎分析和自动开局识别。
- 支持标准国际象棋规则。
- 升变时弹出选择，默认高亮皇后。
- 棋盘方向默认按练习方显示。

## 18. 后续实现优先级建议

建议按以下顺序开发：

1. 搭建微信小程序 TypeScript 基础工程。
2. 引入或封装国际象棋规则服务。
3. 实现棋盘组件和棋子渲染。
4. 实现本地存储模型。
5. 实现开局库和开局详情。
6. 实现变式编辑。
7. 实现变式浏览。
8. 实现单条练习。
9. 实现顺序练习和随机练习。
10. 增加练习统计和错误记录。
11. 完成素材授权说明。
12. 做真机或 DevTools 交互测试。

## 19. 设计验收标准

一个功能只有满足以下条件，才算符合本 guideline：

- 操作是否围绕棋盘完成。
- 是否遵守开局级练习方设定。
- 是否能明确区分录入、浏览、练习三个模式。
- 是否不会把错误走法写入变式主数据。
- 是否能在错误时提供重试和查看正确走法。
- 是否能在全对时记录全对结果。
- 是否能在随机练习中保持变式内部顺序不变。
- 是否保留素材来源和许可证说明。
- 是否不引入第一版明确不做的复杂功能。
