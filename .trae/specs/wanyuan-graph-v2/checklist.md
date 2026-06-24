# 万源图谱 v2 — 验证清单 (Checklist)

## 数据模型与架构

- [ ] 类型定义（types.ts）与 schema.json v0.2 严格对齐，字段名、enum 值、必填项完全一致
- [ ] GraphDataProvider 接口存在，所有数据访问通过 provider，无直接 import JSON
- [ ] 节点 ID 格式统一为 type-slug（如 material-polyethylene）
- [ ] parent_type 引用的父节点 ID 均存在（无悬挂引用）
- [ ] 边的 source/target 引用的节点 ID 均存在（无悬挂边）
- [ ] 数据校验工具（data-validator.ts）可运行，schema 验证通过

## 节点数据

- [ ] 至少 20 个节点，覆盖 material / process / equipment / product / industry 5 种以上类型
- [ ] 每个节点有 definition，且是"定义"（回答这个名称精确指代什么）而非"特性描述"
- [ ] 每个节点至少有一条 source（source_type + description）
- [ ] 子类关系通过 parent_type 表达，没有为分类学关系创建边
- [ ] 所有节点 stage 为 draft（第一阶段）

## 搜索功能

- [ ] 搜索栏可输入关键词，实时返回匹配节点
- [ ] 搜索结果显示节点名称 + 类型标签（颜色区分）
- [ ] 支持键盘上下选择、回车确认、ESC 关闭
- [ ] 搜索响应 < 200ms

## 节点详情面板

- [ ] 展示 name、node_type 标签、definition
- [ ] 展示父节点链接（可点击跳转）
- [ ] 展示子节点列表（可点击跳转）
- [ ] 展示来源列表（source_type + description + 可点击的 url）
- [ ] 展示 stage 标识
- [ ] 关系链路区域：按类型分组展示，无数据时显示友好提示
- [ ] 有关联边时，底部展示直接关联关系列表（对端节点 + 验证状态 + 依据）

## 图谱画布 (GraphCanvas)

- [ ] 渐进式局部展开：初始只显示中心节点 + 直接邻居，不渲染全图
- [ ] 点击邻居节点可展开下一层
- [ ] 中心节点尺寸更大、位置居中
- [ ] dagre 布局：LR 方向（上游在左，下游在右），节点不重叠
- [ ] verified 边：实线，width 3px
- [ ] proposed 边：橙色虚线，dash-pattern [8,6]，width 2px
- [ ] 边悬停 tooltip：显示关系类型、验证状态、evidence 摘要、来源链接
- [ ] 节点点击触发 onNodeSelect 回调
- [ ] isMountedRef 守卫 + 完整 cleanup（cy.stop + removeAllListeners + destroy），无内存泄漏
- [ ] 开发模式热重载 5 次以上不崩溃

## 主页面交互

- [ ] 初始状态：搜索栏 + 引导文案 + 推荐起始节点
- [ ] 选中节点 → 节点详情面板 + 画布渲染
- [ ] 切换关系类型 → 画布刷新为该类型的链路视图
- [ ] 点击画布节点 → 成为新中心，详情面板更新
- [ ] 面包屑导航：记录探索路径，可点击回退
- [ ] 可信度图例：画布左下角常驻，说明 verified/proposed 含义
- [ ] 空状态：无节点选中时有清晰引导

## 材料属性延伸

- [ ] 材料节点详情中显示"材料属性延伸"特殊入口
- [ ] 入口视觉：粉色左边框 + 半透明粉色背景 + 独立卡片
- [ ] 切换到材料延伸视角时，画布样式变化：
  - 紫粉色调背景渐变
  - 粉色连线
  - 中心材料节点菱形/六边形，尺寸 70px
  - 延伸应用节点带粉色光晕
- [ ] 切换时有淡出 → 切换 → 淡入过渡动画

## 性能

- [ ] 搜索响应 < 200ms
- [ ] 链路视图生成 < 300ms（深度 3）
- [ ] 图谱渲染 < 500ms（50 节点以内）
- [ ] 无明显的内存泄漏（反复进出节点，内存不持续增长）

## 构建质量

- [ ] `npm run build` 成功通过
- [ ] TypeScript strict 模式无错误
- [ ] 无未使用的 import 和变量
- [ ] 关键函数有清晰的接口注释
- [ ] 文件大小合理（单文件不超过 400 行）
