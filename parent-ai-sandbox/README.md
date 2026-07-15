# Parent AI Sandbox

这是独立于主游戏的家长沟通测试页，用来验证“特殊自由行动事件 -> 家长沟通主轴 -> 动态任务判定”的设计。

## 当前设计

- 第一优先级：本周触发的特殊自由行动事件。
- 第二优先级：如果本周没有触发特殊事件，则使用原有家长话题兜底。
- 没有主线剧情、Orange 支线或房间建设的中间优先级，避免和主线重复。

第 1 周目前包含两个事件：

- 小明的小恐龙：安抚物、固定位置、结构化环境、个别支持和公平边界。
- 害怕走进阳光里的小丽：感官敏感、梯度暴露、选择权、可退回的过渡空间。

沟通任务不是固定轮次。系统最多允许 4 次玩家回复，但不是必须走满；如果玩家一条回复已经完成必需任务，可以提前成功结束。

必需任务：

1. 担忧与事实：回应家长具体担心的事情，说清楚可观察事实。
2. 解释判断：结合现场反应说明孩子为什么需要这种支持。
3. 行动与协同：给家里和照护所都能执行的小计划，并说明后续如何观察或沟通。

如果这三个任务已经完成，对话可以自然结束；系统不再要求额外的“总结收尾”任务。

## 本地运行

```powershell
cd "E:\MyFirstGame\星星照护所1.3\星星照护所1.0\parent-ai-sandbox"
node .\server.mjs
```

然后打开：

```text
http://localhost:5178
```

没有 API key 时，页面只允许检查事件选择、分支文案和 UI 状态，不会使用本地关键词规则冒充专业评分或家长回复。

## 接入 DeepSeek V4 Flash

API key 不放进前端。启动本地代理前设置环境变量：

```powershell
$env:DEEPSEEK_API_KEY="你的 key"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
node .\server.mjs
```

`DEEPSEEK_MODEL` 可不设，默认使用 `deepseek-v4-flash`。`DEEPSEEK_BASE_URL` 可不设，默认使用 `https://api.deepseek.com`。

如需临时切回 Gemini，可设置：

```powershell
$env:AI_PROVIDER="gemini"
$env:GEMINI_API_KEY="你的 key"
$env:GEMINI_MODEL="gemini-3.5-flash"
node .\server.mjs
```

API 模式现在不是单一评分 prompt，而是 agent ensemble：

- 页面单回合：3 个评估/回复 agent（临床特教、家长真实感、游戏流程）并行判断，再由汇总器输出最终家长反应和任务状态。
- 独立 playtest：3 个玩家 agent（专业型、普通型、高风险误区型）分别与 3 个评估/回复 agent 对话，再由汇总器推进状态。

## 跑 2x3 agent playtest

```powershell
cd "E:\MyFirstGame\星星照护所1.3\星星照护所1.0\parent-ai-sandbox"
$env:DEEPSEEK_API_KEY="你的 key"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
node .\playtest-harness.mjs --out .\PLAYTEST_AGENT_ENSEMBLE_REPORT.md --json .\PLAYTEST_AGENT_ENSEMBLE_REPORT.json
```

默认会跑：

- 事件：小明的小恐龙、小丽阳光。
- 玩家 agent：专业型、普通型、高风险误区型。
- 评估/回复 agent：临床特教、家长真实感、游戏流程。
- 每条最多 4 轮。
