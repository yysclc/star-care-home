# 《星星照护所》联网功能技术设计文档

> v1.0 | 2026-06-22 | 审阅前不进行任何代码修改

---

## 目录

1. [项目背景与范围界定](#1-项目背景与范围界定)
2. [推荐最小后端架构](#2-推荐最小后端架构)
3. [前端新增模块设计](#3-前端新增模块设计)
4. [数据表结构](#4-数据表结构)
5. [API 设计](#5-api-设计)
6. [AI 安全审核体系](#6-ai-安全审核体系)
7. [功能边界：当前版本 vs 未来版本](#7-功能边界当前版本-vs-未来版本)
8. [与现有系统的隔离策略](#8-与现有系统的隔离策略)
9. [隐私与安全要求落地](#9-隐私与安全要求落地)
10. [实施优先级建议](#10-实施优先级建议)

---

## 1. 项目背景与范围界定

### 1.1 目标功能

| 功能 | 描述 |
|------|------|
| **留言墙** | 玩家完成游戏后可留下一句话，经审核后公开展示 |
| **轻量记录榜** | 展示汇总统计（如"本周共有 N 位照护者完成了七周旅程"），**非竞技排名** |

### 1.2 不做的事（当前版本）

- 不做用户账号体系
- 不做玩家详细行为轨迹上传
- 不做实时排行榜
- 不做社交关系/好友系统
- 不做付费/积分体系

### 1.3 公益游戏特殊要求

本游戏面向自闭症家庭照护者，数据设计须遵循：

> "最小必要原则"——只采集完成游戏所必需的最少数据，任何上传均需明确告知玩家。

---

## 2. 推荐最小后端架构

### 2.1 总体架构图

```
┌─────────────────────────────────────────────────────┐
│                    前端 (Phaser/Vite)                 │
│  留言墙UI  │  记录榜UI  │  NetworkManager模块         │
└─────────────┬───────────────────────────────────────┘
              │ HTTPS REST API
              ▼
┌─────────────────────────────────────────────────────┐
│              API 网关 / BFF 层                        │
│  限流 │ 鉴权(匿名Token) │ 请求签名验证                 │
└─────────────┬───────────────────────────────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
┌─────────┐     ┌──────────────┐
│ 留言服务 │     │  统计服务     │
│ Message │     │  Stats       │
│ Service │     │  Service     │
└────┬────┘     └──────┬───────┘
     │                 │
     ▼                 ▼
┌─────────────────────────────┐
│         数据库 (PostgreSQL)  │
│  messages | stats_summary   │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│     AI 内容审核队列           │
│  (异步，不阻塞玩家提交流程)   │
└─────────────────────────────┘
```

### 2.2 推荐技术选型

#### 方案A：极简 Serverless（推荐，公益项目首选）

| 层级 | 技术 | 理由 |
|------|------|------|
| 托管平台 | **Supabase**（免费 tier） | PostgreSQL + REST API + 行级安全策略开箱即用 |
| AI 审核 | **腾讯云文本内容安全** 或 OpenAI Moderation API | 按调用付费，无需维护服务器 |
| 部署 | EdgeOne Pages / Vercel | 静态资源 CDN，零运维 |
| 限流 | Supabase RLS + 前端防抖 | 无需额外网关 |

#### 方案B：轻量自托管（若有服务器资源）

| 层级 | 技术 |
|------|------|
| Runtime | Node.js + Fastify |
| 数据库 | PostgreSQL / SQLite（极小项目） |
| AI 审核 | 同上，以 HTTP 调用接入 |
| 部署 | 单台 VPS + PM2 |

> **建议从方案 A 起步**，Supabase 免费额度（500MB 数据库、50 万次 API 调用/月）对公益小游戏完全够用。

### 2.3 数据流向总览

```
玩家完成游戏
    │
    ├─► [可选] 提交留言 ──► 前端脱敏 ──► POST /messages
    │                                        │
    │                                  存入DB (status=pending)
    │                                        │
    │                                  触发AI审核队列（异步）
    │                                        │
    │                              AI通过 → status=approved → 公开
    │                              AI拒绝 → status=rejected → 不展示
    │                              AI不确定 → 人工审核队列
    │
    └─► [自动] 上传完成摘要 ──► POST /stats/complete
                                    │
                              只记录：完成周数、总评分档位
                              不记录：具体选择、时间戳序列
```

---

## 3. 前端新增模块设计

### 3.1 模块总览

```
src/
├── network/                    ← 新增目录，完全独立
│   ├── NetworkManager.js       ← 网络层统一入口
│   ├── MessageWallClient.js    ← 留言墙专用客户端
│   ├── StatsClient.js          ← 记录榜专用客户端
│   └── AnonymousToken.js       ← 匿名身份令牌管理
│
├── scenes/
│   ├── MessageWallScene.js     ← 新增：留言墙展示场景
│   └── (现有场景不改动)
│
└── ui/
    ├── MessageWallPanel.js     ← 新增：留言墙UI组件
    └── StatsBadgePanel.js      ← 新增：记录榜展示组件
```

### 3.2 各模块职责

#### `NetworkManager.js`

```javascript
// 职责：统一管理网络请求，处理失败降级
// 关键原则：网络不可用时游戏正常运行，联网功能静默降级

class NetworkManager {
  isOnline()                      // 检测网络可用性（不可用则跳过所有上传）
  request(endpoint, options)      // 带重试的请求封装
  handleError(error)              // 错误上报（仅上报错误类型，不上报内容）
}
```

#### `AnonymousToken.js`

```javascript
// 职责：生成并持久化匿名会话ID
// 规则：
// - 基于 localStorage 存储随机 UUID
// - 不关联任何真实身份信息
// - 用户清除缓存即视为新用户（符合公益游戏设计）
// - Token 仅用于防重复提交，不用于追踪用户行为

class AnonymousToken {
  getOrCreate()    // 获取或生成匿名 token
  reset()          // 用户主动重置身份
}
```

#### `MessageWallClient.js`

```javascript
// 职责：留言的提交和拉取
// 关键：提交前在前端做初步过滤，不依赖服务端兜底

class MessageWallClient {
  submitMessage(text, context)          // context 只含：completedWeeks, scoreLevel
  fetchApprovedMessages(page, limit)
  // 注意：不提供"查询自己留言状态"接口（减少追踪面）
}
```

### 3.3 与现有场景的接入点（仅两处）

```
ResultScene.js
    └── 游戏结束后，显示"是否留言"按钮（可选，用户主动触发）
    └── 自动调用 StatsClient.submitCompletion()（静默，无UI反馈）

OfficeScene.js（主场景入口）
    └── 显示 StatsBadgePanel（只读展示，不影响游戏逻辑）
```

> **重要**：接入点仅通过事件或回调触发，不修改现有场景的核心逻辑。

---

## 4. 数据表结构

### 4.1 `messages` 表（留言墙）

```sql
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 内容字段
  content       VARCHAR(100) NOT NULL,           -- 限制100字
  display_name  VARCHAR(20),                     -- 展示昵称，可为空

  -- 来源上下文（极简，不含轨迹）
  completed_weeks  SMALLINT CHECK (completed_weeks BETWEEN 1 AND 7),
  score_level      VARCHAR(10),                  -- 'S'/'A'/'B'/'C' 档位，非原始分

  -- 审核状态
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','flagged')),
  ai_score      DECIMAL(3,2),                    -- AI置信度 0.00~1.00
  ai_reason     VARCHAR(200),                    -- AI拒绝原因（内部用）
  reviewed_by   VARCHAR(50),                     -- 人工审核者ID（可选）

  -- 时间（不精确到秒，保护隐私）
  created_date  DATE DEFAULT CURRENT_DATE,       -- 只记录日期，不记录时间
  approved_at   TIMESTAMPTZ,

  -- 防滥用
  anon_token_hash  CHAR(64),                     -- SHA256(匿名token)，不存原始值
  ip_hash          CHAR(64)                      -- SHA256(IP)，不存原始IP
);

CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_date   ON messages(created_date);
```

> **设计说明**：
> - `created_date` 只精确到日期，不记录具体时间，降低行为追踪风险
> - `ip_hash` 存哈希而非原始 IP，满足防刷需求同时保护隐私
> - `score_level` 只存档位字母，不存原始分数

### 4.2 `stats_summary` 表（记录榜聚合数据）

```sql
CREATE TABLE stats_summary (
  id              SERIAL PRIMARY KEY,
  stat_date       DATE UNIQUE DEFAULT CURRENT_DATE,

  -- 每日聚合，只存汇总，不存个人记录
  completions_today     INTEGER DEFAULT 0,    -- 今日完成人次
  completions_total     INTEGER DEFAULT 0,    -- 累计完成人次
  weeks_completed_dist  JSONB,                -- 各周完成分布，如 {"1":120,"7":34}

  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 `completion_events` 表（完成事件，临时聚合用）

```sql
CREATE TABLE completion_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_weeks SMALLINT NOT NULL,
  score_level     VARCHAR(10) NOT NULL,

  -- 绝不存储：选择序列、各小游戏详情、用户昵称
  created_date    DATE DEFAULT CURRENT_DATE,  -- 只记日期

  anon_token_hash CHAR(64)   -- 防重复提交校验，哈希值
);

-- 数据保留策略：超过30天的记录定期删除（已聚合到 stats_summary）
-- 通过数据库定时任务或 Supabase Edge Function 实现
```

### 4.4 行级安全策略（Supabase RLS）

```sql
-- 公开只读：任何人可查看已审核留言
CREATE POLICY "public_read_approved" ON messages
  FOR SELECT USING (status = 'approved');

-- 匿名提交：任何人可 INSERT，但有字段限制
CREATE POLICY "anon_insert" ON messages
  FOR INSERT WITH CHECK (
    length(content) <= 100 AND
    status = 'pending'         -- 插入时只能是 pending
  );

-- 禁止客户端 UPDATE/DELETE（只有服务端函数可操作）
-- 审核操作通过 Supabase Edge Function 完成，使用 service_role key
```

---

## 5. API 设计

### 5.1 接口总览

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| `GET` | `/api/messages` | 获取已审核留言列表 | 无需 |
| `POST` | `/api/messages` | 提交留言 | 匿名 Token |
| `GET` | `/api/stats/summary` | 获取汇总统计 | 无需 |
| `POST` | `/api/stats/complete` | 上报完成事件 | 匿名 Token |

### 5.2 接口详细设计

#### `GET /api/messages`

```
请求参数：
  page    integer  default=1
  limit   integer  default=20, max=50

响应 200：
{
  "total": 1284,
  "page": 1,
  "data": [
    {
      "id": "uuid",
      "display_name": "星星妈妈",
      "content": "坚持就是胜利",
      "completed_weeks": 7,
      "score_level": "A",
      "approved_at": "2026-06-20"     // 只精确到日期
    }
  ]
}

// 绝不返回：anon_token_hash、ip_hash、ai_score 等内部字段
```

#### `POST /api/messages`

```
请求头：
  X-Anon-Token: <UUID>    // 匿名 token，服务端做哈希存储

请求体：
{
  "display_name": "星星妈妈",     // 可选，1-20字
  "content": "坚持就是胜利",      // 必填，1-100字
  "completed_weeks": 7,
  "score_level": "A"
}

前端提交前校验（不依赖服务端）：
  - content 长度 1~100 字
  - display_name 不含手机号、邮箱格式（正则检测）
  - 本地防抖：同一 session 10 分钟内只允许提交 1 次

响应 202（已接受，待审核）：
{
  "message": "留言已提交，审核通过后将公开展示",
  "estimated_hours": 24
}

响应 429（提交过频）：
{
  "error": "RATE_LIMITED",
  "retry_after": 600
}
```

#### `POST /api/stats/complete`

```
请求头：
  X-Anon-Token: <UUID>

请求体（极简）：
{
  "completed_weeks": 7,
  "score_level": "A"
  // 绝不包含：选择序列、时间戳数组、各关卡分数
}

响应 200：
{
  "ok": true
}

// 幂等设计：同一 token 同一天重复上报，服务端忽略（去重）
```

#### `GET /api/stats/summary`

```
响应 200：
{
  "completions_total": 3842,
  "completions_this_week": 156,
  "message": "已有 3842 位照护者完成了七周旅程"
}
```

### 5.3 错误码规范

| 错误码 | 含义 | 前端处理 |
|--------|------|----------|
| `RATE_LIMITED` | 提交过频 | 提示等待，不显示技术细节 |
| `CONTENT_TOO_LONG` | 内容超长 | 前端已预验证，此为兜底 |
| `INVALID_TOKEN` | Token 无效 | 静默重新生成 token 后重试 |
| `SERVICE_UNAVAILABLE` | 服务不可用 | 静默降级，游戏正常运行 |

---

## 6. AI 安全审核体系

AI 在游戏安全体系中扮演**第一道防线**的角色。

### 6.1 三层防护架构

```
第一层：前端预过滤（实时，0延迟）
    ├── 长度限制（100字硬截断）
    ├── 格式校验（手机号、邮箱正则拦截）
    ├── 本地敏感词词表（约200词，基础过滤）
    └── 防止 XSS 注入（HTML 实体转义）

第二层：AI内容审核（异步，不阻塞提交）
    ├── 调用文本安全 API
    ├── 检测：辱骂 / 广告 / 隐私 / 政治等
    ├── 返回置信度分数
    └── 自动决策（高置信度通过/拒绝）

第三层：人工审核队列（兜底）
    ├── AI 不确定的内容（中间置信度区间）
    ├── 被举报的已通过内容
    └── 定期抽检已通过内容
```

### 6.2 AI 审核决策流程

```
用户提交留言
     │
     ▼
前端预校验 ──失败──► 前端拦截，提示修改（不上报）
     │
    通过
     ▼
存入DB (status=pending) ──► 立即返回202给用户
     │
     ▼（异步）
调用 AI 内容审核 API
     │
     ├── 置信度 ≥ 0.85 且分类=安全  ──► status=approved（自动公开）
     │
     ├── 置信度 ≥ 0.85 且分类=违规  ──► status=rejected（不展示，记录原因）
     │
     └── 0.40 ≤ 置信度 < 0.85       ──► status=flagged（进入人工队列）
```

### 6.3 AI 审核接入设计

```javascript
// 服务端 Supabase Edge Function
// 触发时机：新行插入 messages 表时，通过数据库触发器异步调用

async function reviewMessage(messageId, content) {
  const result = await moderationAPI.check({
    text: content,
    strategies: ['ABUSE', 'AD', 'PRIVACY', 'POLITICS']
  })

  const { isSafe, confidence, category } = result

  if (confidence >= 0.85) {
    await db.messages.update(messageId, {
      status: isSafe ? 'approved' : 'rejected',
      ai_score: confidence,
      ai_reason: isSafe ? null : category
    })
  } else {
    // 灰色区域，转人工
    await db.messages.update(messageId, {
      status: 'flagged',
      ai_score: confidence
    })
    // 可选：通知运营人员（微信/邮件）
  }
}
```

### 6.4 AI 在昵称安全中的作用

```
昵称安全处理流程：

前端：
  ├── 正则拦截：不含手机号格式（1[3-9]\d{9}）
  ├── 正则拦截：不含邮箱格式
  └── 字数限制：1-20字

AI审核（昵称独立检测）：
  ├── 检测是否包含真实人名（姓名识别）
  ├── 检测是否包含地址信息
  └── 检测是否包含身份证/学号格式

展示前脱敏：
  └── 若昵称为空，系统随机分配：
      "星星家长×××"、"照护者×××"、"温柔的手×××"
      （×××为随机两位数，不含姓氏）
```

### 6.5 AI 审核的局限性说明

| 场景 | AI 的处理 | 补充措施 |
|------|-----------|----------|
| 方言/拼音规避词 | 可能漏检 | 人工定期抽检 |
| 隐晦的情绪宣泄 | 可能误判（过度拦截） | 设置申诉入口（邮箱） |
| 新出现的网络用语 | 有滞后性 | 定期更新词表 |
| 跨语言内容 | 需开启多语言检测 | 配置 API 参数 |

---

## 7. 功能边界：当前版本 vs 未来版本

### 7.1 当前版本（V1，预留阶段）

**目标**：代码结构预留，不依赖后端，游戏完整运行

| 模块 | 实现方式 | 说明 |
|------|----------|------|
| `NetworkManager.js` | 已创建，所有方法返回 mock 数据 | 预留接口形状 |
| `MessageWallScene.js` | 展示本地硬编码示例数据 | UI 可完整预览 |
| `StatsBadgePanel.js` | 显示固定文案 | 如"已有 N+ 位照护者..." |
| 数据库 | 不部署 | 无任何网络请求 |

```javascript
// NetworkManager 当前版本示例
class NetworkManager {
  async fetchMessages() {
    if (this.isMockMode) {
      return MOCK_MESSAGES    // 返回本地示例数据
    }
    // 真实请求逻辑（未来版本激活）
  }
}
```

### 7.2 未来版本（V2，联网激活）

**激活条件**：切换一个配置开关

```javascript
// config/network.config.js
export const NETWORK_CONFIG = {
  ENABLE_ONLINE: false,    // ← 改为 true 即激活联网功能
  API_BASE_URL: 'https://xxx.supabase.co',
  MOCK_MODE: true          // 与上方联动
}
```

| 里程碑 | 功能 |
|--------|------|
| V2.0 | 部署 Supabase，激活留言提交和展示 |
| V2.1 | 接入 AI 内容审核，自动化审核流程 |
| V2.2 | 统计汇总功能，StatsBadge 展示真实数据 |
| V3.0 | 可选：后台管理界面（审核人员使用） |

---

## 8. 与现有系统的隔离策略

### 8.1 明确不修改的文件

| 文件 | 原因 |
|------|------|
| `src/gameState.js` / `GameState` | 核心状态机，联网模块只读不写 |
| `src/data/fixedActivities.js` | 游戏内容数据，与网络无关 |
| 所有小游戏场景 `minigames/*.js` | 独立游戏逻辑，不感知网络 |
| `OfficeScene.js` 核心逻辑 | 不添加任何游戏逻辑，最多在角落添加一个可选 UI 组件 |

### 8.2 与 ResultScene 的接入方式

```javascript
// ❌ 错误方式：修改现有逻辑
this.score = calculateScore()  // 不改这里

// ✅ 正确方式：在场景末尾追加，try-catch 包裹，静默失败
import { NetworkManager } from '../network/NetworkManager.js'

try {
  const net = NetworkManager.getInstance()
  net.submitCompletion({
    completedWeeks: gameState.currentWeek,
    scoreLevel: this.getScoreLevel()    // 只传档位，不传原始分
  })
} catch (e) {
  // 静默失败，不影响游戏
}
```

### 8.3 与 GameState 的数据关系

```
GameState（只读访问）
    │
    ├── currentWeek     → 传给 API 作为 completed_weeks
    ├── totalScore      → 转换为 score_level（A/B/C/D）后传出
    │                     转换函数在 NetworkManager 内部完成
    │
    └── 以下字段【禁止上传】：
        ├── choices[]           选择记录
        ├── activityHistory[]   活动历史
        ├── moodScore           实时情绪分
        └── 所有 boolean 状态标志
```

### 8.4 场景调用关系图（修改后）

```
现有流程（不变）：
OfficeScene → MiniGame1..N → ResultScene

新增（平行，不干扰）：
ResultScene ──[完成事件]──► NetworkManager.submitCompletion()
ResultScene ──[用户主动]──► MessageWallScene（独立场景，可返回）

OfficeScene ──[首次加载]──► StatsBadgePanel.fetchAndShow()（非阻塞）
```

---

## 9. 隐私与安全要求落地

### 9.1 各项安全要求对应实现

| 安全要求 | 实现层级 | 具体措施 |
|----------|----------|----------|
| 昵称不提示真实姓名 | 前端 + AI | 前端正则拦截；AI 审核人名实体识别；默认匿名展示 |
| 留言限制长度 | 前端 + 后端双重 | 前端 `maxlength=100`；API 层校验；DB 字段 `VARCHAR(100)` |
| 提交后不立即公开 | 后端 | 插入状态为 `pending`；`GET /messages` 只返回 `approved` |
| 只上传最终摘要 | 架构设计 | API 体只接受 `completed_weeks` 和 `score_level` 两字段 |
| 不追踪用户 | 数据模型 | 不建用户表；匿名 Token 只存哈希；时间只精确到日期 |
| 防刷防滥用 | 前端 + 后端 | 前端防抖 10min；后端 IP 哈希限流（同 IP 同日最多 5 次） |

### 9.2 数据最小化清单

游戏运行时**绝不上传**的数据：

- [ ] 玩家在每个选项的具体选择
- [ ] 各小游戏的详细分数
- [ ] 玩家游戏时长 / 时间序列
- [ ] 设备指纹信息
- [ ] 地理位置
- [ ] 原始 IP 地址（只存哈希）

### 9.3 隐私告知设计

```
触发时机：首次出现"是否提交留言"弹窗时
展示内容：
  "您的留言将经过安全审核后匿名公开。
   我们只会记录您完成的周数，不会保存
   您的游戏选择或任何个人信息。"

技术实现：
  localStorage 记录 privacy_noticed=true，避免重复弹出
```

---

## 10. 实施优先级建议

```
阶段 0（现在）：架构预留
  └── 创建 src/network/ 目录和 mock 版本模块
  └── 在 ResultScene 加入 try-catch 钩子（当前不发请求）
  └── NETWORK_CONFIG.ENABLE_ONLINE = false

阶段 1（有服务器资源时）：部署基础设施
  └── 注册 Supabase，建表，配置 RLS
  └── 翻转配置开关，联调两个 API

阶段 2：接入 AI 审核
  └── 接入腾讯云 / OpenAI Moderation
  └── 部署 Edge Function 审核流程
  └── 建立人工审核推送通知（飞书/微信）

阶段 3：数据可视化
  └── StatsBadge 展示真实统计
  └── 运营后台（可选）
```

---

*文档版本：v1.0 | 最后更新：2026-06-22*
