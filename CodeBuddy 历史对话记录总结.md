# CodeBuddy 历史对话记录总结 — 《星星照护所2.1》AI 使用说明

> 参赛项目：《星星照护所2.1》 — 自闭症理解与照护公益网页游戏
>
> 本文档按比赛要求的四个 AI 使用环节，简述各环节使用的 AI 工具及产出方式。

---

## 核心判断

> **本项目以 CodeBuddy 作为核心开发工具，贯穿需求梳理、公益主题设计、七周剧情生成、代码实现、音频/图像提示词设计、安全架构与部署适配；同时在世界观剧情、游戏原画、声音表演与运行时家长 AI 交互中深度融合 AI 能力。**

---

## 一、AI 工具角色分工

| 角色 | AI 工具 | 说明 |
|------|----------|------|
| **开发中枢** | **CodeBuddy（混元/Claude）** | 全流程设计、编码、提示词生成、架构文档、部署适配——所有其他 AI 的**设计者、提示者、接入者与整合者** |
| **内容生成（由 CodeBuddy 提示驱动）** | GPT Image 2 / Suno v5 / ElevenLabs | 图像生成、BGM 音乐、SFX 音效——由 CodeBuddy 设计提示词后，用户手动生成素材 |
| **运行时能力（由 CodeBuddy 设计接入）** | DeepSeek API / EdgeOne Pages + Cloud Functions / HaS-Anonymizer | 家长 AI 对话、平台安全（DDoS/WAF/HTTPS）、PII 脱敏——由 CodeBuddy 设计系统架构并编写接入代码 |

---

## 二、世界观与剧情（Worldbuilding & Story）

### 使用的 AI 工具

**CodeBuddy（混元/Claude）**— 作为全流程设计协作者

### 产出内容与方式

CodeBuddy 参与了从初始概念到完整叙事的全流程设计。用户以自然语言描述游戏设想，CodeBuddy 阅读、分析、提问、设计方案、生成内容，产出的中文文本由用户审阅修改后纳入最终版本。

#### 2.1 核心主题与玩法设计

| 产出物 | AI 参与内容 |
|--------|-------------|
| `AI_REQUIREMENTS.md` | 协助梳理出"理解代替治愈"核心主题，拆解为可操作的公益目标；基于用户初始设想，设计"白天经营 + 夜晚探索"双循环核心玩法；定义压力/安全感/信任/资金/口碑/精力六维数值体系及其相互张力 |
| `DEV_PLAN.md` | 结合所有设计文档，输出阶段性开发计划与优先级建议 |

#### 2.2 角色设计

| 产出物 | AI 参与内容 |
|--------|-------------|
| `CHARACTER_DESIGN.md`（50KB+） | 深度参与**主角**（24岁心理学毕业生，双性别立绘描述）、**所长陈岚**（48岁，含隐藏阿斯伯格特质设定）、**孩子橙橙**（ASD 谱系儿童，七周成长弧线）的人物设定。包含外貌、性格、成长弧线、剧情概述、与游戏机制的关联。 |
| `directorAdvice.md` | 设计所长在不同阶段的专业指导文本 |

#### 2.3 七周叙事与多结局

| 产出物 | AI 参与内容 |
|--------|-------------|
| `SEVEN_WEEK_NARRATIVE_PLAN.md` | AI 辅助生成完整七周主线剧情框架 |
| `src/data/week1~7OrangeStory.js` | 橙橙七周完整剧情代码，含画作母题设计（门/鸟/笼/窗等意象） |
| `src/data/dialogs_directorChats.js` | 7 次所长聊天触发制剧情，含完整对话脚本 |
| `src/data/dialogs_fixed.js` | 每周固定安排叙事文本 |
| `ENDING_AGENCY_ECHO.md` | AI 辅助设计 3+ 结局分支：维持运转（中性）/ 获得合作（好结局）/ 艰难停摆（失败）；三个结局均从第 7 周末尾自然接入，每结局指定对应背景图，逐步修复手眼偏差 |
| `ORANGE_PLOT_OUTLINE.md` | 橙橙线完整剧情大纲 |

#### 2.4 ASD 知识体系构建

| 产出物 | AI 参与内容 |
|--------|-------------|
| `ASD_KNOWLEDGE_BASE.md` | 基于 DSM-5-TR 诊断标准、CDC 流行病学数据、学术文献等整理 ASD 核心知识，涵盖感官处理、沟通策略、干预哲学、神经多样性概念 |
| `KNOWLEDGE_LIBRARY.md` | 游戏中资料馆的知识文本 |
| `KNOWLEDGE_CARDS_PLAN.md` | 线索卡内容模板与关键词体系 |
| `src/data/knowledgeCards.js` | 可收集知识卡的代码实现 |

#### 2.5 世界观审核与价值传递

| 产出物 | AI 参与内容 |
|--------|-------------|
| `对话存档/07-世界观完整性终评.md` | AI 对世界观设定进行完整性评估，系统性核查一致性 |
| `对话存档/04-社会价值显性传递策略.md` | AI 分析结算文本如何显性传递公益理念，确保"不污名化、不治愈叙事" |

### 产出方式总结

> 本环节**完全由 CodeBuddy 驱动**：CodeBuddy 通过多轮对话理解设计意图，以文字形式产出全部设计文档、剧情文本、角色设定、审核反馈。所有 AI 生成文本均经用户审阅与修改后定稿。

---

## 三、游戏原画（Game Key Art）

### 使用的 AI 工具

| 角色 | 工具 | 用途 |
|------|------|------|
| **设计 + 提示** | **CodeBuddy（混元/Claude）** | 视觉设计文本描述、文生图 prompt 设计、素材规格规划 |
| **图像生成** | GPT Image 2（OpenAI） | 以文生图方式生成角色立绘、场景背景、CG 插图、画作素材 |

### 产出内容与方式

CodeBuddy 完成全部视觉设计与提示词后，由 GPT Image 2 根据提示词生成图像。

#### 3.1 CodeBuddy 的视觉文本设计

CodeBuddy 在 `CHARACTER_DESIGN.md` 中为三位核心角色生成了详细的**立绘参考描述**：

- **主角**（双性别）：工牌、工装颜色/材质、发型、表情姿态列表（平常/思考/疲惫/坚定），每种状态的微表情与体态
- **所长陈岚**：短发灰白、无框眼镜、衬衫颜色与材质偏好、社交姿态特征、流露关怀时的微表情
- **孩子橙橙**：年龄特征体型、常穿衣物、在不同情绪状态下的体态描述

CodeBuddy 还在全剧情中标记了场景背景图（如 `__BG:office2__`、`__BG:painting_room__`），并为多结局指定了对应的背景画面，确保场景视觉与叙事情感一致。

#### 3.2 GPT Image 2 文生图生成

基于 CodeBuddy 产出的角色设定、场景描述和视觉风格指引，用户使用 **GPT Image 2（OpenAI）** 以文生图方式生成：

- **角色立绘**：主角（双性别/多表情）、所长陈岚、孩子橙橙
- **场景背景**：照护所办公室、绘画室、户外小院等多场景背景图
- **CG 插图**：4 张回忆 CG（初到照护所 / 梦境入口 / 绘画室时光 / 户外小院）
- **孩子画作**：4 张橙橙艺术创作（对应画作母题）
- **其他宣传/封面图**

最终素材存入 `public/` 目录，共 72 张 PNG 文件。

#### 3.3 收集系统视觉规划

CodeBuddy 在 `src/data/collections.js` 和 `收集系统使用说明.md` 中设计了收集系统的视觉结构，并基于设计描述为 GPT Image 2 提供对应的生成指引。

### 产出方式总结

> **CodeBuddy 负责全部视觉设计决策**：完成角色外貌/表情/姿态/服饰/场景氛围的详细文本描述，产出文生图 prompt，规划素材规格 → 用户基于 CodeBuddy 的提示词使用 GPT Image 2 生成图像 → 最终 PNG 素材由 CodeBuddy 在代码中引用整合。本环节的创作主导者是 CodeBuddy，GPT Image 2 仅作为图像渲染引擎执行提示词。

---

## 四、游戏安全体系（Game Security Architecture）

### 使用的 AI 工具

| 工具 | 用途 |
|------|------|
| **CodeBuddy（混元/Claude）** | IOA 安全体系全流程设计与代码实现 |
| **DeepSeek API** | 家长 AI 对话运行时后端（2 evaluator agents + 1 aggregator） |
| **EdgeOne Pages + Cloud Functions** | 平台级安全：DDoS 防护、WAF、HTTPS/TLS、API Key 环境变量管理 |
| **HaS-Anonymizer** | PII 个人信息脱敏层（远程服务 + 内置正则兜底） |

### 产出内容与方式

#### 4.1 IOA 安全体系架构设计

CodeBuddy 设计了完整的分层安全架构，覆盖 IOA（智能运营分析）四个核心维度：

| 维度 | 实现位置 | 功能 |
|------|----------|------|
| **Agent 行为安全** | `parent-ai-core/harmfulResponses.js` | 家长 AI 对话内容安全检测，含 harmfulStreak 累计追踪、safetyFlag 标记 |
| **Agent 行为审计** | `cloud-functions/_shared/ioaAuditLogger.js` | 每轮 AI 对话的结构化审计日志，20+ 字段包含会话元信息、评估结果、Agent 追踪摘要、脱敏状态 |
| **数据交互校验** | `cloud-functions/_shared/anonymizerAdapter.js` | 玩家输入 PII 脱敏：手机号/邮箱/身份证/社交账号/地址/真实姓名，HaS 远程 + 内置正则双通路 |
| **异常行为识别** | `ioaAuditLogger.js` | 8 类 anomaly flags 自动检测：harmful_response / privacy_risk / medical_risk / irrelevant_input / large_trust_delta / model_error / missing_privacy_guard / invalid_agent_output |

#### 4.2 安全规则与约束

CodeBuddy 在安全体系设计中实施了严格的约束策略：

- **审计失败不阻断业务流程**：所有安全模块 try/catch 包裹，静默降级
- **不记录原始文本**：审计日志仅记录统计元信息（分数/信任变化/safety flag），不保存原始 playerReply 或对话历史
- **不记录 API Key**：审计日志禁止记录 `DEEPSEEK_API_KEY` 或任何凭据
- **返回摘要而非完整日志**：返回给前端仅 `ioaAudit` 摘要对象（recorded/anomalyFlags/schemaValid 等）

#### 4.3 API Key 保护

CodeBuddy 将 API Key 管理从代码硬编码重构为 **EdgeOne Pages 环境变量注入**：

- `DEEPSEEK_API_KEY` 不出现在任何源代码文件中
- 不被打包进前端 `dist/` 产物
- `cloud-functions/` 中通过 `context.env` 运行时注入
- `.env` 文件仅供本地开发，已加入 `.gitignore`

#### 4.4 家长 AI 对话系统设计

CodeBuddy 设计了完整的 DeepSeek API 接入架构：

| 设计内容 | 文件 |
|----------|------|
| System Prompt 模板（含 5 种家长身份类型、口语特征、中国现实语境、ASD 核心约束） | `PARENT_AI_DESIGN.md` |
| 满意度判定系统（3 档：≥80 成功 / 50-79 中性 / <50 失败）、4 轮强制结算 | `PARENT_AI_DESIGN.md` |
| Agent 合议评估架构（2 evaluator agents + 1 aggregator reply generator） | `parent-ai-core/` |
| 前端同源接口调用（dev→localhost:5178 / prod→空 base URL） | `src/services/parentAiClient.js` |
| 部署上线可验证端点 `/api/status` | `cloud-functions/api/status.js` |

#### 4.5 联网功能隐私设计

CodeBuddy 在 `NETWORK_DESIGN.md` 中设计了三层 AI 内容审核防线（前端预过滤 → AI 内容审核 → 人工兜底），并制定了数据最小化清单——明确声明游戏运行时**绝不上传**的数据类型。

### 产出方式总结

> **CodeBuddy 设计并实现 IOA 安全体系的全部模块代码**（审计日志、脱敏引擎、有害检测、环境变量管理、Cloud Functions 部署适配）。DeepSeek API（家长 AI 对话能力）、EdgeOne Pages（DDoS/WAF/HTTPS）、HaS-Anonymizer（PII 脱敏）均为 CodeBuddy 设计选型后接入的运行时组件。

---

## 五、声音表演（Audio Performance）

### 使用的 AI 工具

| 工具 | 用途 | 生成数量 |
|------|------|----------|
| **Suno v5** | 游戏 BGM 音乐生成（纯器乐/Instrumental 模式） | **11 首** |
| **ElevenLabs** | 游戏 SFX 音效生成（text-to-sound 模式） | **17 个** |
| **CodeBuddy（混元/Claude）** | 音乐/音效提示词生成 + 场景-曲目映射 + 音频系统代码接入 | — |

### 产出内容与方式

#### 5.1 BGM 音乐 — Suno v5（CodeBuddy 提示词 + 用户生成）

CodeBuddy 为全部 **11 首 BGM** 生成了英文 + 中文双语 Suno 风格提示词（含风格流派、器乐编配、BPM、和声走向、时长、loop 点等完整参数），用户在 Suno App 中手动生成 mp3 文件后放入 `public/audio/bgm/`。

**6 首基础 BGM（第一轮，6月25日）**：

| Key | 歌名 | 风格 | Suno 提示词（CodeBuddy 设计） |
|-----|------|------|------|
| `title_bgm` | "A Place Called Star" | Warm acoustic, soft post-rock | instrumental, gentle lofi, warm ambient, soft piano, light music box melody, subtle strings, cozy and slightly magical |
| `daily_bgm` | "Gentle Morning Routine" | Light ambient, soft jazz | instrumental, soft acoustic, fingerpicked nylon guitar, light kalimba, gentle ambient pads, everyday warmth |
| `story_soft_bgm` | "Quiet Understanding" | Minimal ambient piano | instrumental, sparse ambient piano, subtle textures, tender and introspective |
| `pressure_bgm` | "Weight of Care" | Sparse tension ambient | instrumental, subtle tension, low cello drone, soft piano with occasional minor chords, ambient texture |
| `minigame_bgm` | "Little Steps Forward" | Playful lo-fi | instrumental, playful lo-fi beat, light percussion, warm synth pads, gentle and encouraging |
| `ending_bgm` | "Stars Remain" | Chamber, warm strings | instrumental, warm piano and strings, gentle ambient, soft closure with a touch of bittersweet |

**5 首新增 BGM（第二轮，7月1日）**：

CodeBuddy 首先阅读了全部剧情文件，分析三线叙事的情感差异，发现 `daily_bgm` 被用了 10 次覆盖了所有场景——存在严重缺口。然后设计了方案：

| Key | 风格 | 器乐编配 | BPM | 触发场景 |
|-----|------|----------|-----|----------|
| `orange_theme` | Minimal ambient piano | Solo felt piano, D minor/F major ambiguous | ~70 | 绘画室（橙橙专属主题） |
| `intimate_trust` | Chamber | Piano + cello duo, suspended chords → major 7ths | ~60-65 | 所长聊天 04/06（档案柜/AS自白） |
| `sensory_storm` | Dark ambient/drone → minimal pulse | 40-80Hz drones + heartbeat sub + sparse piano | — | 橙橙第2周电钻噪音 / 第7周施工锤击 |
| `late_night_decision` | Sparse late-night jazz ballad | Rhodes/felt piano, E minor | ~55 | 所长聊天 07（决策前夜）/ 第4周伦理选择 |
| `first_understanding` | Soft post-rock/indie folk | Guitar/piano + glockenspiel, add9 chords, C major | ~65-70 | 橙橙周结算成功 |

#### 5.2 SFX 音效 — ElevenLabs（CodeBuddy 提示词 + 用户生成）

CodeBuddy 为全部 **17 个 SFX** 生成了 ElevenLabs 英文提示词（刻意避开 bright/sharp/harsh/loud/alarming 等刺激词汇）。用户在 ElevenLabs Sound Effects 页逐一生成后放入 `public/audio/se/`。

**13 个基础 SFX**：`click`、`dialog_next`、`paper_open`、`pigeon_wing`、`choice_confirm`、`attr_plus`、`attr_minus`、`room_switch`、`phone_ring`、`computer_on`、`painting_brush`、`door_open`、`door_close`

**4 个小游戏反馈 SFX**：`minigame_success`、`minigame_normal`、`minigame_fail`、`construction`（第 2 周装修音效，音量 20%）

#### 5.3 音频系统代码接入 — CodeBuddy

CodeBuddy 完成了全部音频系统的代码设计和实现：

| 修改文件 | 接入内容 |
|----------|----------|
| `src/core/AudioManager.js` | 统一 BGM/SFX 管理器：淡入淡出（250ms）、BGM 恢复、循环 SE、音量控制（BGM 默认 60%/SFX 默认 80%）、静音、用户手势监听 |
| `src/data/resourcePacks.js` | 注册 11 首 BGM + 17 个 SFX 资源键和路径 |
| `src/scenes/rooms/PaintingRoomScene.js` | `orange_theme` 绘画室主题 / `sensory_storm` 噪音事件触发 |
| `src/scenes/OfficeScene.js` | `intimate_trust` 所长聊天 04/06 / `late_night_decision` 决策场景 |
| `src/scenes/ResultScene.js` | `first_understanding` 橙橙结算成功 |
| 其余 8 个场景文件 | BGM 接入：StartScene(title_bgm)、PrologueScene(story_soft_bgm)、OfficeScene(daily_bgm)、ResultScene(story_soft_bgm)、MiniGameScene(minigame_bgm)、EndingScene(ending_bgm) 等 |

### 产出方式总结

> 本环节的**设计、提示、编排与接入全部由 CodeBuddy 完成**：CodeBuddy 阅读剧情文件→分析情绪缺口→设计曲目方案→生成 Suno/ElevenLabs 提示词→编写音频系统代码（AudioManager、资源注册、场景级 BGM 切换）。Suno v5 和 ElevenLabs 作为音频生成引擎，按 CodeBuddy 设计的提示词输出音频文件。

---

## 六、各环节 AI 使用总结

| AI 使用环节 | CodeBuddy 的主导角色 | 其他 AI 的辅助角色 |
|-------------|---------------------|---------------------|
| **世界观与剧情** | 独立完成全部设计文档、剧情文本、角色设定、知识库、审核评估 | —（本环节仅 CodeBuddy） |
| **游戏原画** | 设计全部角色/场景视觉描述、文生图 prompt、素材规格；代码中引用整合 | GPT Image 2：按 CodeBuddy 提示词执行图像生成 |
| **游戏安全体系** | 设计 IOA 安全架构、编写全部安全模块代码、选型并接入 DeepSeek/EdgeOne/HaS-Anonymizer | DeepSeek：家长 AI 对话运行时；EdgeOne：平台安全；HaS-Anonymizer：PII 脱敏 |
| **声音表演** | 阅读剧情→分析情绪缺口→设计曲目方案→生成全部 11 首 BGM + 17 个 SFX 提示词→编写 AudioManager 及全部场景级接入代码 | Suno v5：按提示词生成 BGM 音频；ElevenLabs：按提示词生成 SFX 音频 |

---

*文档版本：v1.1 | 生成日期：2026-07-15 | 基于 CodeBuddy 与 40 个对话存档的完整历史追溯*
