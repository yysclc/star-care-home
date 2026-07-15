# 家长沟通 AI 接入实现说明

> 状态：早期实现记录。当前事实来源、分支 outcome、三层任务和多代理判定以 `PARENT_AI_STORY_CONTEXT_AUDIT.md`、`PARENT_AI_CORE_INTEGRATION.md` 与 `parent-ai-core/` 为准。

> 本文档给协作者使用，说明家长沟通 AI 系统的实现顺序、最小改动范围、安全要求、语料来源与注意事项。

---

## 1. 最终目标

把“家长沟通”从当前离线固定消息系统，升级为 AI 驱动的多轮聊天系统。

最终效果：

- 玩家点击家长联系人进入聊天。
- 家长发起一段消息。
- 玩家可以自由输入回复，也可以点击 AI 生成的快捷回复。
- AI 根据玩家回复评分，更新本次对话的“家长满意度”。
- 满意度达到成功/失败条件，或最多 4 轮后强制结算。
- AI 失败、超时、无网时，自动回退到现有离线消息系统。

---

## 2. 最小改动范围

优先只改这些文件：

```text
src/ui/ParentChatPanel.js
src/scenes/OfficeScene.js
src/data/parentMessages.js
src/core/GameState.js
```

建议新增这些文件：

```text
src/data/parentAIGuide.js
src/services/ParentAIService.js
server/parent-ai.js 或 api/parent-ai.js
```

如果项目暂时没有后端目录，可以新增一个轻量 Node/Express 后端，或按部署平台实现 `/api/parent-ai`。

---

## 3. 尽量不要改的文件

除非必要，不要改：

```text
src/core/ParentTrustSystem.js
src/systems/AudioManager.js
src/ui/DialogBox.js
src/ui/ChoicePanel.js
src/ui/HUD.js
src/scenes/ResultScene.js
src/data/asdCourseQuestions.js
src/data/asdMuseumContent.js
```

原因：

- `ParentTrustSystem.js` 已经负责每周结算，不要把 AI 单轮对话结算混进去。
- `DialogBox` / `ChoicePanel` 是通用 UI，不要为了 AI 聊天改全局行为。
- `HUD` 只显示资源，不负责 AI 流程。
- `ResultScene` 是周结算，不要提前把 AI 机制塞进去。
- ASD 知识库是给玩家学习的，不是给 AI 扮演家长的。

---

## 4. 开始前必须阅读

至少阅读：

```text
PARENT_AI_DESIGN.md
src/ui/ParentChatPanel.js
src/scenes/OfficeScene.js
src/data/parentMessages.js
src/core/ParentTrustSystem.js
src/core/GameState.js
```

语料和规则来源：

1. `PARENT_AI_DESIGN.md`
   - AI 家长行为、满意度机制、prompt 模板、输出 JSON 的主设计文档。

2. `src/data/parentMessages.js`
   - 离线 fallback 数据源，也可作为 AI 生成风格的最低样例。

3. `src/core/ParentTrustSystem.js`
   - 家长信任、每周家长消息数量、孩子状态对家长信任变化的规则。

4. 现有 ASD 知识相关文件只作专业底线参考，不要直接全量塞给 AI：
   ```text
   ASD_KNOWLEDGE_BASE.md
   KNOWLEDGE_LIBRARY.md
   src/data/asdMuseumContent.js
   ```

---

## 5. 实现顺序

### 5.1 新增 `src/data/parentAIGuide.js`

从 `PARENT_AI_DESIGN.md` 抽出常量：

```js
export const PARENT_PROFILE_TYPES = [...]
export const PARENT_SPEECH_EXAMPLES = [...]
export const CHINA_PARENT_CONTEXT = [...]
export const COMPLAINT_DEEP_REASONS = [...]
export const ASD_CARE_BOUNDARIES = [...]
export const PARENT_AI_SYSTEM_PROMPT_TEMPLATE = `...`
```

注意：这些是给 AI prompt 用的，不直接展示给玩家。

### 5.2 搭建后端代理

前端不能放 API Key。

新增接口：

```text
POST /api/parent-ai
```

请求包含：

```json
{
  "conversationHistory": [],
  "gameState": {},
  "parentProfile": {},
  "playerReply": ""
}
```

返回必须是严格 JSON：

```json
{
  "qualityScore": 75,
  "delta": 12,
  "isIrrelevant": false,
  "parentReply": "...",
  "parentMood": "calmed",
  "shouldEnd": false,
  "safetyFlag": "none",
  "quickReplies": ["...", "...", "..."]
}
```

### 5.3 实现 Game IOA Safety Layer

后端同时做轻量安全层。可以命名为：

```text
Game IOA Safety Layer
```

至少覆盖：

#### Agent 行为安全

- 校验 AI 只能返回 JSON。
- 校验 `delta` 在 `-25 ~ +25`。
- 校验 `qualityScore` 在 `0 ~ 100`。
- 校验 `quickReplies` 数量和长度。
- AI 不能返回直接修改游戏资源的指令。

#### 玩家身份鉴权

- 本地开发可先用匿名 session id。
- 正式版后端生成 player token。
- 每次请求必须带 token。

#### 数据交互校验

- 校验 `chatType` 只能是 `dailyTalk` / `complaint`。
- 校验 `satisfaction` 在 `0 ~ 100`。
- 校验 `round` 在 `1 ~ 4`。
- 不接受前端传来的最终资源变化。
- 后端只接受“玩家回复 + 当前对话状态”，不接受“我要加多少信任”。

#### 异常行为识别

- 单玩家请求频率限制。
- 同一轮重复请求检测。
- 超长输入、乱码、prompt 注入记录。
- AI 多次返回异常 JSON 时自动触发 fallback。

### 5.4 新增 `src/services/ParentAIService.js`

前端统一通过这个文件调 AI。

建议 API：

```js
export async function generateInitialParentMessage({ gs, chatType, parentProfile }) {}

export async function evaluateParentReply({
  gs,
  chatType,
  satisfaction,
  round,
  parentProfile,
  conversationHistory,
  playerReply,
}) {}
```

该 service 负责：

- 调 `/api/parent-ai`。
- 超时控制。
- JSON 校验。
- fallback 到 `parentMessages.js`。
- 把 AI 输出转换成聊天 UI 可用数据。

### 5.5 改造 `ParentChatPanel.js`

需要增加：

- 自由输入框。
- 发送玩家输入。
- 快捷回复按钮。
- “对方正在输入...”状态。
- 满意度显示或进度条。
- 对话结束状态。
- 对话中禁止返回。

注意：

- 不要再用 `ChoicePanel` 做回复选择。
- 回复选项应显示在聊天界面内部。

### 5.6 改造 `OfficeScene.js` 家长沟通流程

这里是主接入口。

当前已有联系人列表和离线消息逻辑。要改成：

- 点击联系人后创建 `conversationState`。
- 初始满意度：
  ```text
  dailyTalk = 80
  complaint = 40
  ```
- AI 生成第一条家长消息。
- 玩家输入或点击快捷回复后，调用 AI 评分。
- 本地更新满意度。
- 检查是否结束：
  ```text
  satisfaction >= 100 -> 成功
  satisfaction <= 0 -> 失败
  round >= 4 -> 强制结算
  ```

### 5.7 实现本地结算

AI 不直接改数值。本地根据结果改。

第一版建议：

```text
倾诉成功：家长信任 +2，名望 +1
倾诉中性：无变化
倾诉失败：家长信任 -2

投诉成功：家长信任 +4
投诉中性：家长信任 +1
投诉失败：家长信任 -4，名望 -2

无关内容归零：家长信任 -6，名望 -3
```

### 5.8 保留 fallback

API 不可用时，回退到现在的 `parentMessages.js`。

fallback 不需要多轮 AI，只要保证游戏能继续玩。

### 5.9 存档和状态

第一版建议：

- 保存已生成的联系人。
- 保存已处理状态。
- 不保存半截 AI 对话。

如果玩家进入一条 AI 对话，建议禁用返回，必须完成本轮对话后才能离开。

后续如果要支持中途退出，再扩展：

```js
gs.dayProgress.aiParentConversations
```

### 5.10 调试和日志

开发模式记录：

```text
chatType
parentProfile
satisfaction before/after
playerReply
AI delta
safetyFlag
fallback reason
```

正式版不要显示这些内部信息给玩家。

---

## 6. 自由输入要求

最终必须支持自由输入，否则“无关内容归零”没有意义。

自由输入基本规则：

- 输入为空不能发送。
- 超过长度截断或提示。
- 乱码、无关内容交给 AI 判断 `isIrrelevant`。
- AI 返回 `isIrrelevant=true` 时，本地直接：
  ```text
  satisfaction = 0
  ```
- 然后按无关内容失败结算。

---

## 7. 语料库来源

主要来源：

1. `PARENT_AI_DESIGN.md`
   - 主要行为语料和 prompt 设计。

2. `src/data/parentMessages.js`
   - 现有游戏内家长消息，可作为 fallback 和风格样例。

3. `src/core/ParentTrustSystem.js`
   - 提供家长信任与消息数量逻辑。

4. 现有剧情文件可少量参考，不建议全量喂 AI：
   ```text
   src/data/week4OrangeStory.js
   src/data/week5OrangeStory.js
   src/data/dialogs_fixed.js
   src/data/resultStories.js
   ```
   这些文件里有家长观察日、公益展示、记录沟通等语境。

5. ASD 科普资料只用于安全边界：
   ```text
   ASD_KNOWLEDGE_BASE.md
   KNOWLEDGE_LIBRARY.md
   src/data/asdMuseumContent.js
   ```

---

## 8. 不要做的事

- 不要把 API Key 写进前端。
- 不要让 AI 直接修改 `gs.funds`、`gs.parentTrust`、`gs.reputation`。
- 不要直接把整个 ASD 知识库塞进 prompt。
- 不要让 AI 生成医疗诊断、疗效承诺、训练处方。
- 不要改全局 `ChoicePanel` 或 `DialogBox` 来适配聊天。
- 不要破坏现有离线 fallback。

---

## 9. 推荐验收标准

第一阶段完成后，应满足：

- 没有 API Key 暴露在前端。
- AI 失败时能回退到本地消息池。
- AI 返回 JSON 错误时不会卡死。
- 自由输入可以触发 AI 评分。
- 明显无关输入会导致满意度归零并失败。
- AI 不能直接改游戏数值。
- 4 轮内一定能结算。
- 对话中不能返回导致半截状态。
- 联系人列表、聊天记录、满意度 UI 都能正常显示。
