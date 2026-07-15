# Parent AI 未经许可改动审计

## 结论

本清单只记录本轮 Parent AI 工作中擅自改动的原游戏剧情、原家长消息和玩家可见台词。用户已确认同目录递归范围内文件名带 `(2)` 的文件是未经修改的原件；本清单已改以这些 `(2)` 文件作为唯一权威基准，不再以 1.2 版本推定原文。

## 执行状态

- 11 个纯原剧情、原家长消息和玩家可见文本文件已由对应 `(2)` 原件完整恢复，并通过 SHA-256 一致性核验。
- `src/scenes/OfficeScene.js` 与 `src/scenes/rooms/roomHelpers.js` 中被改写的原台词已恢复；两文件相对 `(2)` 原件只保留 Parent AI 程序接入代码，没有删除或替换原文。
- `src/data/freeActionSpecialEvents.js` 已与 `src/data/freeActionSpecialEvents (2).js` 完全一致，不再含 `parentAiEventId`、选项 `id` 或 `parentAiOutcome`。
- 事件技术绑定已迁入 `parent-ai-core/eventBindings.js`，只记录周次、房间、行动、选项序号和原分支文字。
- 当前 11 个事件共 32 个选项均标记为缺少家长知情渠道；游戏联系人和正式 AI 会话不会为其生成家长主动开场。
- 旧版 PDF 和基于虚构信息桥梁生成的测试报告均已作废。

## 一、原剧情数据文件

### `src/data/freeActionSpecialEvents.js`

- 给 11 个原自由行动事件加入 `parentAiEventId`。
- 给 32 个原玩家选项加入稳定 `id`。
- 给 32 个原玩家选项加入 `parentAiOutcome`，其中包括没有剧情依据的 `informationSource`、`parentMessage` 和 `communicationFocus`。
- 改写 4 处原剧情可见文案：
  - `你记录下：不打断节奏的提示，更容易被接住。`
  - `【你】要看他们现在接得住什么？`
  - `你只选确认过意愿的作品。推进很慢，但绘画室里的气氛没有变紧。`
  - `这一周办公室里的气氛一直很紧。你走到小院角落，才发现自己肩膀已经僵了很久。`

### `src/data/dialogs_actions.js`

- 改写 1 处原剧情反馈：`你仍能接住大部分表达……`

### `src/data/dialogs_directorChats.js`

- 改写 2 处陈岚/玩家原对话中的“接住”表达。

### `src/data/dialogs_fixed.js`

- 改写 10 处主线原文，涉及陈岚、周嘉宁、玩家对“接住孩子”“接住信号”“接住训练”的讨论。

### `src/data/resultStories.js`

- 改写 5 处周结算原文，涉及家长、记录、外部方案和“下一个接手的人”。

### `src/data/finalEndingStories.js`

- 改写 1 处结局原文：`换一个她也能接住的词。`

### `src/data/week2OrangeStory.js`

- 改写 1 处橙橙父亲出场叙述：`这句话问得很快。不是凶，但很紧。`

### `src/core/ParentTrustSystem.js`

- 改写 2 处玩家可见的家长信任状态说明。

### `src/scenes/rooms/ActivityRoomScene.js`

- 改写 1 处橙橙剧情门槛提示。

### `src/scenes/minigames/ToyRoomJointAttentionScene.js`

- 改写 1 处小游戏结算原文：`孩子的注意力就是邀请，你接住了。`

## 二、原家长消息池

### `src/data/parentMessages.js`

- 重写了整份原有固定家长消息池，包括家长来信、玩家选项、成功回复和失败回复。
- 这些修改超出了 Parent AI 独立模块的范围，应完整恢复为原文。

## 三、原场景中的玩家可见文字

### `src/scenes/rooms/roomHelpers.js`

- 改写 `无额外数值变化。`
- 两处改写 `你现在还接不住这个判断。`
- 同一文件还加入 Parent AI 触发和结果存储逻辑；程序逻辑在第三步迁出剧情数据依赖。

### `src/scenes/OfficeScene.js`

- 改写王老师联系人预览：`负责家长沟通，有问题可以先问我。`
- 改写王老师自我介绍：`我是王老师，平时主要负责和家长沟通……`
- 同一文件加入 Parent AI 联系人、会话和 API 调用逻辑；程序逻辑保留，但不得再依赖被改写的原剧情文件。

## 四、非剧情的 Parent AI 程序改动

以下属于新功能实现，不是原剧情文案；第二步不回退，第三步重新整理边界：

- `src/core/GameState.js` 中的 Parent AI 存档字段。
- `src/debug/verifySaveLoadIntegrity.js` 中的 Parent AI 存档测试。
- `src/services/parentAiClient.js`。
- `parent-ai-core/`。
- `parent-ai-sandbox/`。
- `src/scenes/OfficeScene.js` 中的 Parent AI 程序流程。

## 五、无依据的信息桥梁

32 个 `parentAiOutcome` 中的“交接记录”“活动记录”“今日记录”“作品展示通知”“用餐记录”“本周观察记录”等字段，不能仅凭数据字段证明家长已经看到或听到相关内容。原剧情没有明确建立信息传递过程的分支，不能生成家长主动知情的开场。
