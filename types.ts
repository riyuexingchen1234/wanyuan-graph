// 万源图谱 - TypeScript 类型定义
// 多关系类型产业链图谱数据模型

/** 节点类型 */
export type NodeType =
  | 'industry'    // 行业
  | 'material'    // 原料/材料
  | 'product'     // 产品
  | 'equipment'   // 设备
  | 'consumable'  // 耗材
  | 'service'     // 服务
  | 'endpoint';   // 终端（消费者等）

/** 验证状态 */
export type VerificationStatus = 'proposed' | 'verified';

/** 数据来源类型 */
export type SourceType =
  | 'ai_generated'       // AI 生成
  | 'manual_entry'        // 人工录入
  | 'third_party_import'  // 第三方导入
  | 'user_submitted'      // 用户提交
  | 'field_research';     // 实地调研

/** 关系类型标识 */
export type RelationType = string;

/** 链路类型配置 */
export interface ChainType {
  type: RelationType;
  label: string;
  description: string;
  color: string;
}

/** 节点 */
export interface GraphNode {
  id: string;
  name: string;
  aliases?: string[];
  type: NodeType;
  description?: string;
  industry_tags: string[];
  metadata?: Record<string, unknown>;
}

/** 关系（边） */
export interface GraphEdge {
  id: string;
  source: string;          // 上游节点 ID
  target: string;          // 下游节点 ID
  relation_type: RelationType;
  verification_status: VerificationStatus;
  source_type: SourceType;
  evidence?: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

/** 完整图谱数据 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  chain_types: ChainType[];
}

/** 节点参与的链路信息（用于视角切换 UI） */
export interface NodeChainInfo {
  node_id: string;
  chains: Array<{
    relation_type: RelationType;
    chain_label: string;
    chain_color: string;
    upstream_count: number;   // 该链路上游节点数
    downstream_count: number; // 该链路下游节点数
  }>;
  cross_industry: boolean;    // 是否跨行业交叉点
  connected_industries: string[]; // 连接的行业列表
}

/** API 查询参数：按节点 + 关系类型获取链路 */
export interface ChainQuery {
  node_id: string;
  relation_type?: RelationType;  // 不传则返回该节点所有链路
  depth?: number;                // 遍历深度，默认 3
}

/** API 返回：链路视图 */
export interface ChainView {
  center_node: GraphNode;
  relation_type: RelationType;
  chain_type: ChainType;
  nodes: GraphNode[];
  edges: GraphEdge[];
  cross_industry_nodes: GraphNode[]; // 该链路中的跨行业交叉点
}
