# 万源图谱 Demo Guide — 怎么上本

> 这是一份**给初次接触本系统的人**的上手文档。
> 读完后，你应能：浏览图谱、看清每条边的可信度、以审核员/质疑者身份做动作、知道状态机的全部转换规则。
>
> **当前版本**：v0.4（6 档可信度状态机 + 8 类关系大类 + 4 类万源扩展）
> **状态**：根基项目（foundation project）— MVP 阶段，单用户 demo，无身份验证
> **最后更新**：2026-06-28

---

## 0. 30 秒速览（最常用场景）

**"我想看一个产业的上下游"**
→ 进入页面 → 在搜索框输入节点名（如"光伏电池片"）→ 选 [原料] 关系类型 → 看到所有相关连接

**"我想审核一条边"**
→ 选中节点 → 右侧面板底部"**状态机审核**" → 看到所有相关边 → 点 [通过→社区] / [通过→专家] / [质疑] / [废弃] 按钮 → 状态机自动持久化

**"我想质疑一条边"**
→ 选中节点 → "关联连接" 卡片悬停 → 右上角 ⚑ 按钮 → 填质疑类型 + 描述（≥ 30 字）→ 提交 → 边状态自动 → disputed

---

## 1. 系统由什么组成

```
┌──────────────────────────────────────────────┐
│  src/app/page.tsx          主页面（双层视图）   │
│  src/components/Graph3D/   3D 星云宏观层       │
│  src/components/GraphCanvas 2D 微观层          │
│  src/components/NodeDetail 右面板（节点详情）   │
│  src/components/EdgeReviewer  单边状态机按钮    │
│  src/components/EdgeChallenger  质疑表单 modal  │
│  src/components/StatusLegend  2D 状态图例      │
├──────────────────────────────────────────────┤
│  src/lib/state-machine.ts  6 档状态机强制器    │
│  src/lib/auto-extract.ts   80% 自动化 MVP      │
│  src/lib/dal.ts            数据访问层          │
│  src/lib/types.ts          TypeScript 类型     │
│  src/lib/cytoscape-config  2D 视觉编码         │
├──────────────────────────────────────────────┤
│  data/seed/pv-chain.json   种子数据（50 节点）  │
│  schema.json               v0.4 数据契约       │
│  docs/*.md                 5 份文档            │
└──────────────────────────────────────────────┘
```

---

## 2. 启动

```bash
cd /workspace
npm run dev          # 启动开发服务器（http://localhost:3000）
npm run build        # 生产构建
npx tsx scripts/test-state-machine.ts   # 跑状态机自测（14 用例）
npx tsx scripts/test-auto-extract.ts    # 跑自动抽取 demo
```

---

## 3. 视觉编码速查（背下来即可上手）

### 3.1 6 档可信度（v0.4）

| 状态 | 颜色 | 线型 | 含义 | 谁可以改 |
|------|------|------|------|----------|
| **auto-extracted** | 灰 #86909C | 实线 1.2px | 脚本自动产出，未经任何人核验 | 系统 |
| **proposed** | 橙 #FF7D00 | **虚线** 1.5px | 有人提交依据，未通过任何审核 | 任意用户 |
| **verified-community** | 蓝 #165DFF | 实线 1.8px | 社区共识（3+ 独立用户附议） | 社区 / 管理员 |
| **verified-expert** | 绿 #00B42A | 实线 2.2px | 行业专家/资质审核员终审 | 审核员 |
| **disputed** | 红 #F53F3F | 实线 2.5px | 被质疑，原 verified 等级失效 | 质疑者触发 |
| **deprecated** | 浅灰 #C9CDD4 | **点线** 1px | 已废弃，不参与下游推理 | 终态 |

### 3.2 跨产业连接

金色 `#FFC53D` 加粗（3-3.5px），z-index 上浮。叠加基础状态：
- 跨产业 + verified-expert → 绿色 3.5px（保留"专家确认"语义）
- 跨产业 + disputed → 红色 3.5px
- 跨产业 + proposed → 金色虚线

### 3.3 节点类型（color）

| 类型 | 颜色 |
|------|------|
| material | #165DFF（蓝） |
| equipment | #722ED1（紫） |
| process | #00B42A（绿） |
| technology | #0FC6C2（青） |
| product | #FF7D00（橙） |
| demand | #F53F3F（红） |

---

## 4. 状态机（核心规则）

### 4.1 全部合法转换

```
                    ┌──────────────────┐
                    │  auto-extracted  │
                    └──────┬───────────┘
                           │ 人工初核
                           ▼
                    ┌──────────────────┐
                    │     proposed     │◄──────────┐
                    └──┬──┬──┬──┬─────┘           │
                       │  │  │  │                  │ 证据不足
        ┌──────────────┘  │  │  └────────────┐    │ 退回
        │                 │  │               │    │
        ▼                 │  │               ▼    │
  verified-community      │  │           deprecated（终态）
        │                 │  │               ▲
        │ 专家进一步确认    │  │ 质疑/废弃      │
        ▼                 │  ▼               │
  verified-expert         │ disputed         │
        │                 │  │               │
        │ 被质疑/废弃      │  └───────────────┘
        └─────────────────┘
```

### 4.2 状态机代码层接口

```typescript
import { applyTransition, canTransition, ALLOWED_TRANSITIONS } from '@/lib/state-machine';

// 检查是否合法
canTransition('proposed', 'verified-expert'); // → true (v0.4 允许直接升 expert)

// 应用一次转换（带 actor 留痕）
const newEdge = applyTransition({
  edge: originalEdge,
  to: 'verified-expert',
  actor_id: 'reviewer-zhang',
  actor_role: 'expert',
  action: 'approved',
  reason: 'T/CPIA 0030 双源验证通过',
});
```

### 4.3 不可做的事

- ❌ 跨级跳（如 `auto-extracted → verified-expert`）— 状态机拒绝
- ❌ 同状态自转（`proposed → proposed`）— 状态机拒绝
- ❌ 复活废弃（`deprecated → anything`）— 状态机拒绝，deprecated 是终态
- ❌ AI 自动升级到 verified-expert（决策 #1，规则硬性禁止）

---

## 5. 角色与权限（决策记录摘要）

| 角色 | 身份门槛 | 关键权限 | 来源 |
|------|----------|----------|------|
| 任意用户 | 仅邮箱 | 提交边、质疑、附议 | 决策 #5 |
| 社区贡献者 | 邮箱 + 信誉分（v0.5 引入） | 升级到 verified-community | 手册 |
| 质疑者 | 任意用户 | 触发 disputed（≥ 30 字） | 决策 #6 |
| 审核员（专家） | 5 类资质之一 | 升级到 verified-expert | 决策 #4 |
| 管理员 | — | 任意转换（含 deprecated） | — |

**当前 demo 限制**：所有 actor 都用占位 ID（`principal-demo` / `challenger-demo`），身份不验证。生产环境需接用户系统。

---

## 6. 典型工作流（按角色）

### 6.1 探索者

1. 打开页面 → 默认看到 3D 星云（宏观层）
2. 鼠标拖动旋转 3D → 看到不同产业的星簇
3. 滚轮缩放 → 聚焦某个产业
4. 点击感兴趣的节点 → 切换到 2D 微观层（detail view）
5. 右侧 NodeDetail 面板显示节点详情 + 关联边
6. 切换"关系类型"下拉（顶部）→ 重新计算可见网络

### 6.2 审核员

1. 选中一个节点 → 右侧"**状态机审核**"section
2. 看到该节点的全部边，按状态排序
3. 每条边有允许的转换按钮（基于 `ALLOWED_TRANSITIONS`）
4. 点击按钮 → 状态机校验 + 持久化（写入 `pv-chain.json`）
5. 展开"审核轨迹"看历史 reviewer_chain
6. 边界情况（如"专家确认"但缺证据）→ 选 [质疑] 而非 [废弃]，给边一次重审机会

### 6.3 质疑者

1. 在 NodeDetail 的"关联连接"中，hover 任意边 → 右上角出现 ⚑ 按钮
2. 点击 → 弹出质疑表单
3. 选质疑类型（10 种下拉）
4. 写描述（实时字数提示，至少 30 字）
5. 可选：附证据链接
6. 提交 → 状态自动 → disputed
7. 重复对同一边的多次质疑**累积**到 dispute_history（不同人可有不同意见）

### 6.4 数据工程师（80% 自动化）

```typescript
import { extractTriples, buildEdgesFromTriples } from '@/lib/auto-extract';
import seedData from '@/data/seed/pv-chain.json';

// 1. 注册术语映射
const termDict = new Map<string, string>();
for (const n of seedData.nodes) {
  termDict.set(n.name, n.id);
  for (const a of n.aliases ?? []) termDict.set(a.term, n.id);
}

// 2. 从原文抽取三元组
const { triples, unmatched_hints } = extractTriples({
  text: '白银是银浆的关键原料...',
  source_meta: { source_type: 'standard', description: 'T/CPIA 0030' },
});

// 3. 建边（未注册术语自动跳过，宁缺毋滥）
const newEdges = buildEdgesFromTriples({
  triples,
  source_meta: { source_type: 'standard', description: 'T/CPIA 0030' },
  termToId: (t) => termDict.get(t),
  edgeIdFactory: (h, t, r) => `auto-${h}-${r}-${t}`,
});

// 4. 写回（用 API 走状态机，或直接 JSON 写）
```

---

## 7. API（v0.4）

### 7.1 审核员转换

```http
POST /api/edges/{edgeId}/transition
Content-Type: application/json

{
  "to": "verified-expert",
  "actor_id": "reviewer-zhang",
  "actor_role": "expert",
  "action": "approved",
  "reason": "T/CPIA 0030 双源验证"
}
```

返回：
```json
{ "edge": { "id": "...", "verification_status": "verified-expert", ... } }
```

错误码：
- 400 状态机拒绝（非法转换 / 缺字段 / 字数不足）
- 404 边不存在
- 500 文件读写失败

### 7.2 质疑者入口

```http
POST /api/edges/{edgeId}/challenge
Content-Type: application/json

{
  "challenger_id": "challenger-001",
  "challenge_type": "outdated_source",
  "challenge_text": "≥ 30 字的质疑描述...",
  "evidence_url": "https://...（可选）"
}
```

返回：
```json
{
  "edge": { "id": "...", "verification_status": "disputed", ... },
  "dispute": { "dispute_id": "...", "challenge_type": "...", "filed_at": "..." }
}
```

**累积语义**：边已 disputed 时再质疑 → 不增加 transitions，但 dispute_history 追加。

---

## 8. 已知限制（实事求是）

| 限制 | 影响 | 何时修 |
|------|------|--------|
| 单文件持久化（非 DB） | 多用户并发会丢更新 | v1.0 接 DB |
| 无身份验证 | 任意 actor_id 可填 | v1.0 接用户系统 |
| 无审核员资质校验 | 任意人可自称 expert | v0.5 接资质系统 |
| 80% 自动用模式匹配（非 LLM） | 召回率有限 | v0.5 接 LLM API |
| `import seedData` 在 build 时打包 | 改文件需重启 | v0.5 接 DB |
| 禁言 3/7 天规则未实施 | 恶意质疑可刷 | v0.5 接信誉分 |

---

## 9. 测试

```bash
# 状态机 14 用例（覆盖合法/非法转换、一致性、种子数据）
npx tsx scripts/test-state-machine.ts

# 自动抽取 demo（5 条三元组 + schema 校验）
npx tsx scripts/test-auto-extract.ts

# API 端到端（开 dev server 后另开终端）
curl -X POST http://localhost:3000/api/edges/pv-main-2/transition \
  -H "Content-Type: application/json" \
  -d '{"to":"disputed","actor_id":"t","actor_role":"community","action":"disputed","reason":"t"}'
```

---

## 10. 进一步阅读

- [docs/production-workflow.md](production-workflow.md) — A 路线 80/15/5 完整生产流程
- [docs/reviewer-handbook.md](reviewer-handbook.md) — 审核员 SOP + 5 真实案例
- [docs/challenger-handbook.md](challenger-handbook.md) — 质疑者 SOP + 8 FAQ
- [docs/decisions/2026-06-28.md](decisions/2026-06-28.md) — 8 项拍板 + 4 项明确不拍
- [schema.json](../schema.json) — v0.4 数据契约（AllowedTransitions 状态机规则）

---

## 附录 A：常见问题

**Q: 6 档可信度比"已验证/未验证"两档多在哪？**
A: 透明度。万源图谱核心理念要求每条边都附依据 + 可追溯的审核历史。两档把"是否验证"的真相当作二元，丢失了"谁验证的""什么时候验证的""是否被质疑过"这些关键信息。

**Q: 为什么不直接 LLM 抽三元组？**
A: v0.4 阶段先验证架构（schema、状态机、API、UI）能跑，auto-extract 留作 MVP 用模式匹配。LLM 集成是 v0.5 工作（决策 #2 持久化 `auto-extracted` 已为 LLM 接入预留状态机位置）。

**Q: 跨产业连接为什么特殊对待？**
A: 核心理念——"用户分类权交还用户"。行业分类是人为产物（DB33/T 1322 是浙江省地标，非国标），跨产业连接代表"被现行分类切断的客观关系"，是项目重点呈现的洞见。

**Q: 怎么知道一条边该不该升 verified？**
A: 看 evidence 列表。每条边至少有 1 个 evidence（来源 + 检索时间）。**有 1 级源**（国标、年报、专利、官方数据）+ **无矛盾质疑** → 可升 verified-community。**有 1 级源 + 行业专家确认** → 可升 verified-expert。
