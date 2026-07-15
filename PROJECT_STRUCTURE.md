# PROJECT_STRUCTURE.md
# 星星照护所 · 项目架构文档

> 本文档用于指导后续代码拆分和模块实现，不涉及代码本身。
> 所有改动应以本文档为准，不要在未更新文档的情况下修改目录结构。

---

## 1. 当前拆分目标

当前 `main.js` 已承载大量逻辑，随着功能增加，文件体积过大将导致：

- bug 定位困难，修复一处可能影响其他地方；
- 每次请 AI 辅助开发时，需要重复读取整个大文件，浪费 credits；
- 多人协作或分阶段开发时，职责不清晰。

**拆分原则**：

1. 分阶段进行，每一步完成后项目必须保持可运行状态，不要一次性重构所有文件；
2. 每个文件只有一个明确的职责；
3. 剧情文本与逻辑代码完全分离，写剧情不碰逻辑文件；
4. 美术和音频资源不放进 `src/`，统一放进 `assets/`。

---

## 2. 推荐目录结构

```
src/
  main.js                         # Phaser 初始化 + Scene 注册
  style.css                       # 全局样式

  core/
    Constants.js                  # 全局常量
    GameState.js                  # 所有数值 + 存读档方法
    DayManager.js                 # 每日阶段流转
    ValueSystem.js                # 通用数值计算（clamp、公式）

  systems/
    ActivitySystem.js             # 固定行动阶段：信任度/压力值变化、重复惩罚
    EventSystem.js                # 随机/数值触发事件：投诉概率、突发事件

  data/
    rooms.js                      # 房间基础信息（ID、名称、初始开放状态）
    fixedActivities.js            # 固定行动阶段：各场景的基础效果与重复惩罚数据
    freeActions.js                # 自由行动阶段：各房间可点击按钮及其效果数据
    facilities.js                 # 设施清单（名称、价格、解锁哪个场景、被动效果）
    dialogs_fixed.js              # 固定剧情文本（开场、每日开始/结束、固定行动后）
    dialogs_events.js             # 随机/数值触发剧情（家长投诉、闲聊、突发事件）
    dialogs_orange.js             # 橙橙专属互动文本与剧情节点
    dialogs_actions.js            # 各按钮点击的普通反馈文本（非剧情性质）
    tasks.js                      # 每日任务定义（第一阶段暂不创建，后续按需加入）

  ui/
    HUD.js                        # 顶部固定显示：金钱、名望、行动力
    DialogBox.js                  # 通用文字弹窗
    ChoicePanel.js                # 选项按钮面板（2–3 选项）
    widgets.js                    # 通用 UI 组件（按钮、标签等）

  scenes/
    StartScene.js                 # 标题画面
    PrologueScene.js              # 序章（主角入职剧情）
    OfficeScene.js                # 教师办公室 Hub
    FixedActionScene.js           # 固定行动阶段：选择今日集体活动
    MapScene.js                   # 地图画面（已开放房间入口）
    ResultScene.js                # 每日结算 / 结局画面

    rooms/
      ActivityRoomScene.js        # 活动室
      PaintingRoomScene.js        # 绘画室
      ToyRoomScene.js             # 娱乐 / 玩具室
      OutdoorYardScene.js         # 户外探索院
      LibraryScene.js             # 图书室
      SensoryRoomScene.js         # 感统室
```

---

## 3. 每个模块的职责

### `main.js`
- 只负责 Phaser 初始化和所有 Scene 的注册；
- 不包含任何游戏逻辑或数值计算；
- 是项目的唯一入口。

### `core/`

| 文件 | 职责 |
|---|---|
| `Constants.js` | 所有"写死"的常量，例如：行动力初始上限、体能→行动力公式参数、投诉概率上限、属性范围上下界 |
| `GameState.js` | 存储所有游戏数值（金钱、名望、行动力、体能表现、专业理解、沟通能力、群体信任度、群体压力值、橙橙好感值等）；提供 `loadState`、`saveState`、`resetState` 方法（存档逻辑集中在这里，不单独做 SaveSystem） |
| `DayManager.js` | 管理每天的阶段流转：固定行动×3（必须完成三次）→ 自由行动 → 每日结算；判断当日照护记录是否已完成 |
| `ValueSystem.js` | 通用数值工具函数：clamp、体能表现→行动力上限计算、投诉概率公式；不存储状态，只负责计算 |

### `systems/`

| 文件 | 职责 |
|---|---|
| `ActivitySystem.js` | 固定行动阶段的核心规则：根据选择的场景和当天重复次数，计算群体信任度/压力值的变化量；维护每天的重复计数 |
| `EventSystem.js` | 随机/数值触发事件的判定：根据投诉概率公式决定是否触发家长投诉；根据条件触发突发事件；不直接修改数值，只返回事件类型，由 Scene 决定如何展示 |

### `data/`

| 文件 | 职责 |
|---|---|
| `rooms.js` | 各房间的基础元数据：ID、显示名称、初始是否开放、需要哪个设施才能解锁 |
| `fixedActivities.js` | 各房间在固定行动阶段的数值效果：首次/第2次/第3次安排时对群体信任度和压力值的加减量 |
| `freeActions.js` | 各房间在自由行动阶段的可交互按钮数据：按钮 ID、消耗行动力、影响哪些数值、每日次数限制、前置条件 |
| `facilities.js` | 可购买设施清单：名称、价格、解锁哪个场景 ID、安装后的被动效果说明 |
| `dialogs_fixed.js` | 固定剧情文本（开场白、序章、每日开始/结束文字、固定行动后的旁白） |
| `dialogs_events.js` | 随机/数值触发剧情文本（家长投诉、所长闲聊、突发事件、直播翻车等） |
| `dialogs_orange.js` | 橙橙专属互动文本：按橙橙好感值、剧情 flag、房间场景和玩家选择组织文本；不设置额外状态系统 |
| `dialogs_actions.js` | 各按钮点击后的普通反馈文本（非剧情性质，例如"你整理了一下玩具，感觉轻松了一点"） |

> **剧情写作原则**：`dialogs_*.js` 只存文本，不含任何逻辑；逻辑代码只引用文本的键名，不硬编码中文字符串。开发阶段所有文本均可先用占位符填充（例如 `"[橙橙好感值30剧情 - 待写]"`），写剧情时再替换，不需要动任何逻辑文件。

### `ui/`

| 文件 | 职责 |
|---|---|
| `HUD.js` | 顶部固定 HUD：金钱、名望、行动力数值的实时显示；提供更新方法供各 Scene 调用 |
| `DialogBox.js` | 通用对话弹窗：支持文字滚动、点击继续；所有剧情文本通过此组件显示 |
| `ChoicePanel.js` | 选项面板：展示 2–3 个可点击选项，返回玩家选择结果；家长沟通、所长互动均使用此组件 |
| `widgets.js` | 通用 UI 元件（按钮工厂、文字标签、图标）；供各 Scene 调用，避免各 Scene 重复写相同的按钮代码 |

### `scenes/`

| 文件 | 职责 |
|---|---|
| `StartScene.js` | 标题画面，进入游戏或继续存档 |
| `PrologueScene.js` | 序章：主角收信入职的开场叙事（固定剧情） |
| `OfficeScene.js` | 教师办公室 Hub：所长互动、电脑入口、地图按钮 |
| `FixedActionScene.js` | 固定行动阶段：显示当日可选场景，执行后调用 `ActivitySystem` 更新群体数值 |
| `MapScene.js` | 地图画面：显示所有已开放的房间入口，点击后切换到对应 RoomScene |
| `ResultScene.js` | 每日结算/结局画面：展示当日数值变化摘要；调用 `EventSystem` 展示家长投诉和经营危机判定结果；处理阶段结局（第一次危机预警 / 第二次游戏结束）；确认后进入下一天 |

### `scenes/rooms/`

每个主要房间单独一个 Scene（理由见第 4 节）。

| 文件 | 对应房间 |
|---|---|
| `ActivityRoomScene.js` | 活动室 |
| `PaintingRoomScene.js` | 绘画室 |
| `ToyRoomScene.js` | 娱乐 / 玩具室 |
| `OutdoorYardScene.js` | 户外探索院 |
| `LibraryScene.js` | 图书室 |
| `SensoryRoomScene.js` | 感统室 |

---

## 4. 房间 Scene 决策

**每个主要房间单独一个 Scene，不使用通用 RoomScene。**

原因：
- 每个房间有独立的背景图（BG），未来需要按背景图的实际布局来摆放点击区域和交互按钮；
- 各房间的可交互按钮数量、位置、逻辑差异较大，强行通用化会导致数据结构过于复杂；
- 单独 Scene 便于后续分阶段开发：先完成活动室和玩具室，再逐步加其他房间，互不影响。

---

## 5. MapScene 决策

`MapScene` 只负责显示已开放的房间入口，不包含任何游戏逻辑。

**初始开放（无需购买）：**
- 活动室
- 娱乐 / 玩具室
- 户外探索院

**需要通过电脑购买/修建后开放：**
- 绘画室
- 图书室
- 感统室

**特别说明：**
绘画室可以在第一天就完成修建，修建完成当天立刻可以在 MapScene 中显示并进入，不需要等到第二天。

MapScene 从 `GameState` 读取哪些房间已解锁，动态决定哪些入口可点击，哪些显示为"未开放"状态。

---

## 6. 资源目录说明

美术和音频资源的后续整理目标目录为：

```
assets/
  images/         # 背景图、角色图、UI 图标
  audio/          # 背景音乐、音效
```

**当前阶段说明：**
- 不强制迁移现有资源路径；
- 结构拆分时不得移动已有 `assets` 文件，避免破坏当前可运行状态；
- `assets/images/` 和 `assets/audio/` 作为后续整理方向，待资源增多后再统一归类。

代码中只引用资源的相对路径字符串，不将图片或音频直接嵌入逻辑文件。

---

## 7. SaveSystem 决策

**不单独创建 `SaveSystem.js`，存读档逻辑统一放在 `GameState.js` 中。**

`GameState.js` 提供以下三个方法：
- `saveState()`：将当前所有数值序列化并写入 `localStorage`；
- `loadState()`：从 `localStorage` 读取并恢复数值；
- `resetState()`：清除存档，重置所有数值为初始值。

如果未来需要拆分（例如支持多存档槽、云存档），可以将这三个方法迁移到独立的 `Save.js`，但不允许两套存档逻辑并存。
