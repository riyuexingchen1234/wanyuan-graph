# 万源图谱

看见被行业分类切断的连接。

## 项目介绍

万源图谱是一个产业关系图谱网站，致力于展示被传统行业分类切断的跨行业连接。从光伏行业出发，经过储能设备和电池隔膜，换轨到材料视角，最终走到快递包装——这就是被行业分类切断的连接。

## 核心概念

### 坐标系 A（产业链视角）
从行业出发，追踪上下游关系：光伏 → 储能设备 → 电池隔膜 → ...

### 坐标系 B（材料属性视角）
从材料出发，发现跨行业延伸应用：聚乙烯 → 塑料管道 / 包装薄膜 / ...

### 交汇点（AB）
同时属于两个坐标系的节点，如电池隔膜既是储能设备的上游材料（坐标系A），又是聚乙烯的一种应用形态（坐标系B）。

## 技术栈

- **框架**: Next.js 14 App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS (字节跳动 Arco Design 色彩体系)
- **图可视化**: Cytoscape.js
- **验证**: JSON Schema + AJV

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页
│   ├── admin/                # 管理后台
│   │   ├── page.tsx          # 采集管理
│   │   └── data/page.tsx     # 数据管理
│   └── api/
│       ├── graph/            # 图谱数据 API
│       └── admin/            # 管理 API
├── components/
│   ├── GraphCanvas.tsx       # 图可视化组件
│   ├── NodeDetail.tsx        # 节点详情面板
│   ├── SearchBar.tsx         # 搜索栏
│   ├── PathGuide.tsx         # 路径引导
│   ├── Legend.tsx            # 图例
│   ├── DataCounter.tsx       # 数据计数器
│   ├── IntroOverlay.tsx      # 首次访问引导
│   └── KeyboardShortcuts.tsx # 快捷键提示
├── lib/
│   ├── types.ts             # 类型定义
│   ├── graph-data.ts         # 图数据处理
│   ├── cytoscape-config.ts   # Cytoscape 配置
│   ├── sample-path.ts        # 样板路径数据
│   ├── ghost-nodes.ts        # 虚影节点数据
│   ├── data-collector.ts    # AI 数据采集
│   ├── data-manager.ts       # 数据管理
│   └── collection-tasks.ts  # 预设采集任务
└── data/
    └── sample-data.json     # 样板数据
```

## 数据结构

图谱数据遵循 `schema.json` 定义的格式：

### 节点 (Node)
- `id`: 唯一标识符
- `name`: 名称
- `node_type`: 类型（material/process/equipment/product/industry）
- `coordinate_systems`: 所属坐标系（['A'] / ['B'] / ['A', 'B']）
- `aliases`: 别名列表
- `verification_status`: 验证状态

### 边 (Edge)
- `id`: 唯一标识符
- `source`: 起点节点 ID
- `target`: 终点节点 ID
- `relation_type`: 关系类型
- `verification_status`: 验证状态（verified/proposed）
- `evidence`: 证据列表（验证通过后）

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `/` | 聚焦搜索框 |
| `Esc` | 取消选中 / 退出引导 / 关闭搜索 |
| `←` | 路径引导中前进一步 |
| `→` | 路径引导中后退一步 |

## AI 数据采集

系统支持通过 AI 辅助采集产业数据。配置环境变量后，访问 `/admin` 即可使用：

1. 单任务采集：输入事物名称、类型、坐标系
2. 批量采集：执行预设的 14 个采集任务
3. 审核通过：将采集的数据合并到图谱
4. 边验证：为 proposed 边添加 evidence 后升级为 verified

### 环境变量配置

```bash
cp .env.example .env.local
```

编辑 `.env.local`：
- `LLM_API_KEY`: OpenAI API Key
- `LLM_MODEL`: 模型名称（默认 gpt-4o）
- `ADMIN_KEY`: 管理后台鉴权密钥

## 未来方向

- [ ] 更多样板路径展示跨行业连接
- [ ] 用户共建入口
- [ ] 数据导出与分享
- [ ] 社区验证机制
- [ ] 移动端适配

## License

MIT
