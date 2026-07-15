# IOA 安全体系说明

> 《星星照护所2.1》智能运营分析（IOA）安全体系
>
> 版本：v1.0 | 更新日期：2026-07-14

---

## 一、体系概览

《星星照护所2.1》采用分层安全架构，覆盖以下 IOA 核心维度：

| 维度 | 实现位置 | 保护对象 |
|------|----------|----------|
| **Agent 行为安全** | `parent-ai-core/harmfulResponses.js` | 家长 AI 对话内容安全检测 |
| **Agent 行为审计** | `cloud-functions/_shared/ioaAuditLogger.js` | 每轮 AI 对话的结构化审计日志 |
| **数据交互校验** | `cloud-functions/_shared/anonymizerAdapter.js` | 玩家输入 PII 脱敏 |
| **异常行为识别** | `cloud-functions/_shared/ioaAuditLogger.js` | 8 类 anomaly flags 自动检测 |
| **API Key 保护** | EdgeOne Pages 环境变量 | `DEEPSEEK_API_KEY` |
| **传输安全** | EdgeOne Pages 平台 | HTTPS/TLS 全链路加密 |
| **DDoS 防护** | EdgeOne Pages 平台 | 边缘流量清洗 |

---

## 二、HaS-Anonymizer 数据脱敏层

### 2.1 用途

HaS-Anonymizer 负责对**玩家输入文本、AI 请求 payload、对话历史**进行个人信息（PII）脱敏，保护家长和孩子的隐私。

**不用于 API Key 保护**（API Key 由 EdgeOne Pages 环境变量管理，不出现在代码中）。

### 2.2 架构

```
玩家输入（原始文本）
      │
      ▼
cloud-functions/_shared/anonymizerAdapter.js
      │
      ├── HaS-Anonymizer 可用？
      │   ├── 是 → 远程调用 HaS 服务脱敏
      │   └── 否 → 内置正则规则兜底脱敏
      │
      ▼
sanitizeTurnPayload()
      │
      │   脱敏覆盖：playerReply / history[]
      │   脱敏后传给 evaluateParentTurnWithAgents()
      │   原始敏感文本不持久化存储
      │
      ▼
返回结果含 privacyGuard 元信息
```

### 2.3 脱敏规则（内置 fallback）

| PII 类型 | 检测模式 | 替换文本 |
|----------|----------|----------|
| 手机号 | `1[3-9]\d{9}` | `[手机号已隐藏]` |
| 邮箱 | `xxx@xxx.xx` | `[邮箱已隐藏]` |
| 身份证号 | 18 位公民身份号码 | `[身份证号已隐藏]` |
| 微信号/QQ号 | `wxid_*` / `微信：*` / `QQ：*` | `[社交账号已隐藏]` |
| 地址信息 | `XX省XX市XX区` 格式 | `[地址信息已隐藏]` |
| 真实姓名 | `我叫…` / `我是…` 表达 | `[姓名已隐藏]` |

### 2.4 接入方式

通过环境变量控制是否启用远程 HaS 服务：

```
HAS_ANONYMIZER_ENDPOINT=https://your-has-service/anon  # 可选，配置后优先使用
```

- **已配置** → 调用 HaS 远程服务（`provider: "has-anonymizer"`）
- **未配置** → 自动降级到内置正则规则（`provider: "has-anonymizer-fallback"`）
- **调用失败** → 静默降级，不影响游戏正常运行

### 2.5 涉及文件

| 文件 | 作用 |
|------|------|
| `cloud-functions/_shared/anonymizerAdapter.js` | 脱敏引擎（HaS 适配 + 内置规则兜底） |
| `cloud-functions/_shared/parentAiRuntime.js` | `handleParentAiTurn()` 中集成脱敏调用 |
| `cloud-functions/api/status.js` | `/api/status` 返回脱敏引擎状态 |

---

## 三、IOA Agent 行为审计

### 3.1 用途

IOA Agent 行为审计层对每一次家长 AI 对话轮次记录**结构化审计事件**，满足 IOA 安全体系对 Agent 行为安全、数据交互校验、异常行为识别的覆盖要求。

**不保存原始玩家文本**——审计日志仅记录统计元信息（分数、信任变化、safety flag、anomaly flags）。

### 3.2 架构

```
handleParentAiTurn()
      │
      ├── sanitizeTurnPayload()         ← 脱敏
      ├── evaluateParentTurnWithAgents() ← AI 评估
      │
      ├── buildIoaAuditEvent()          ← 生成审计事件
      │       │
      │       ├── 会话元信息（sessionId, week, turnCountBefore）
      │       ├── 评估结果（score, trustDelta, safetyFlag, shouldEnd）
      │       ├── Agent 追踪摘要（每 agent 的 score/safety/duration）
      │       ├── 数据校验（schemaValid）
      │       ├── privacyGuard 副本
      │       └── anomalyFlags[] 检测
      │
      └── buildIoaAuditResponse()       ← 返回审计摘要给前端
```

### 3.3 审计事件字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `eventType` | string | 固定 `"parent_ai_turn"` |
| `recordedAt` | ISO 8601 | 记录时间 |
| `sessionId` | string | 会话 ID |
| `runtime` | string | 固定 `"edgeone_pages_cloud_functions"` |
| `provider` | string | AI 提供商（如 `"DeepSeek"`） |
| `model` | string | 模型标识 |
| `turnCountBefore` | number | 本轮前的对话轮数 |
| `trustBefore` | number | 本轮前信任值 |
| `trustDelta` | number | 本轮信任变化 |
| `trustAfter` | number | 本轮后信任值 |
| `score` | number | 本轮评估分数 |
| `safetyFlag` | string | 安全标记 |
| `shouldEnd` | boolean | 是否应结束对话 |
| `endReason` | string | 结束原因 |
| `privacyGuard` | object | 脱敏元信息（副本） |
| `agentTraceSummary` | array | 每个评估 agent 的摘要 |
| `schemaValid` | boolean | 评估输出格式是否合规 |
| `fallbackUsed` | boolean | 是否使用内置脱敏兜底 |
| `anomalyFlags` | string[] | 检测到的异常标记列表 |

### 3.4 异常行为识别（8 类 anomaly flags）

| Flag | 触发条件 |
|------|----------|
| `harmful_response` | safetyFlag === 'harmful' 或 harmfulStreak >= 2 |
| `privacy_risk` | 脱敏层检测到 PII（手机号/邮箱/身份证等） |
| `medical_risk` | safetyFlag 为 'medical_risk' 或 'clinical_risk' |
| `irrelevant_input` | safetyFlag 为 'irrelevant' 或 'off_topic' |
| `large_trust_delta` | 信任变化绝对值 > 15 |
| `model_error` | AI 模型调用失败 |
| `missing_privacy_guard` | privacyGuard 未启用 |
| `invalid_agent_output` | 评估输出缺少必要字段或格式不合法 |

### 3.5 安全约束

- **不记录原始 `playerReply` 或 `history` 文本**
- **不记录 `DEEPSEEK_API_KEY` 或任何凭据**
- **审计失败不阻断业务流程**：try/catch 包裹，静默降级
- **返回给前端的是摘要而非完整日志**：仅 `ioaAudit` 对象，包含 `recorded`、`anomalyFlags`、`schemaValid` 等

### 3.6 涉及文件

| 文件 | 作用 |
|------|------|
| `cloud-functions/_shared/ioaAuditLogger.js` | 审计事件构建 + 异常检测引擎 |
| `cloud-functions/_shared/parentAiRuntime.js` | `handleParentAiTurn()` 中集成审计调用 |

---

## 四、API Key 安全

### 4.1 保护策略

API Key（`DEEPSEEK_API_KEY`）**始终**由 EdgeOne Pages 环境变量管理：

```
EdgeOne Pages 控制台 → 环境变量 → DEEPSEEK_API_KEY
                                    ↓
                    cloud-functions/_shared/parentAiRuntime.js
                                    ↓
                        getEnv(context, 'DEEPSEEK_API_KEY')
```

### 4.2 安全原则

- **不出现在任何源代码文件中**
- **不被打包进前端 `dist/` 产物**
- **`cloud-functions/` 中通过 `context.env` 运行时注入**
- **`.env` 文件仅供本地开发，应加入 `.gitignore`**

---

## 五、传输与平台安全

| 能力 | 实现方式 |
|------|----------|
| HTTPS/TLS 传输加密 | EdgeOne Pages 自动签发 SSL 证书 |
| CDN 全球加速 | EdgeOne 边缘节点分发静态资源 |
| DDoS 基础防护 | EdgeOne 平台级流量清洗 |
| WAF 基础防护 | EdgeOne Web 应用防火墙 |
| CORS 控制 | Cloud Functions 响应头配置 |

---

## 六、完整性验证

部署后可通过以下端点验证安全体系状态：

```
GET https://{域名}/api/status
```

预期响应包含：

```json
{
  "provider": "DeepSeek",
  "hasKey": true,
  "mode": "agent_ensemble",
  "runtime": "edgeone_pages_cloud_functions",
  "agentArchitecture": "parent-turn: 2 evaluator agents + 1 aggregator reply generator",
  "anonymizer": {
    "mode": "has-anonymizer-fallback",
    "hasRemote": false,
    "builtinRules": ["phone", "email", "id_card", "wechat_qq", "address", "real_name"]
  },
  "ioaAudit": {
    "enabled": true,
    "module": "ioaAuditLogger",
    "anomalyFlags": [
      "harmful_response", "privacy_risk", "medical_risk",
      "irrelevant_input", "large_trust_delta", "model_error",
      "missing_privacy_guard", "invalid_agent_output"
    ],
    "originalTextStored": false,
    "externalSink": false
  }
}
```

每次家长 AI 对话轮次响应中包含 `privacyGuard` 字段，实时确认脱敏执行状态。

---

*本体系随《星星照护所2.1》持续迭代，安全规则与脱敏策略将根据实际运营数据动态更新。*
