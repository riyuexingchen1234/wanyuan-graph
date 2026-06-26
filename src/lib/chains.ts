import type { ChainDef, RelationFlow, RelationType } from './types';

export const RELATION_FLOW: Record<RelationType, RelationFlow> = {
  raw_material_for: 'upstream_to_downstream',
  can_be_processed_into: 'upstream_to_downstream',
  upstream_of: 'upstream_to_downstream',
  applied_in: 'upstream_to_downstream',
  made_of: 'downstream_to_upstream',
  equipment_for: 'downstream_to_upstream',
  consumable_for: 'downstream_to_upstream',
  downstream_of: 'downstream_to_upstream',
  structurally_similar_to: 'horizontal',
  is_subclass_of: 'horizontal',
};

export const CHAIN_DEFS: Record<string, ChainDef> = {
  pv_chain: {
    id: 'pv_chain',
    name: '光伏产业链',
    description: '从工业硅到光伏电站的光伏产业链条',
    main_axis_relations: ['raw_material_for', 'can_be_processed_into', 'upstream_of', 'downstream_of'],
    branch_relations: ['applied_in', 'equipment_for', 'consumable_for', 'structurally_similar_to', 'made_of'],
    primary_axis: 'x',
    branch_depth: 1,
    is_viewable: true,
  },
  battery_chain: {
    id: 'battery_chain',
    name: '电池储能产业链',
    description: '从矿产资源到电池系统与储能应用',
    main_axis_relations: ['raw_material_for', 'can_be_processed_into', 'made_of', 'downstream_of', 'upstream_of'],
    branch_relations: ['applied_in', 'equipment_for', 'consumable_for', 'structurally_similar_to'],
    primary_axis: 'x',
    branch_depth: 1,
    is_viewable: true,
  },
  material_chain: {
    id: 'material_chain',
    name: '材料属性延伸链',
    description: '基于材料结构相似性和跨领域应用的横向材料网络',
    main_axis_relations: [
      'structurally_similar_to',
      { type: 'applied_in', flow: 'upstream_to_downstream' },
      'can_be_processed_into',
    ],
    branch_relations: ['raw_material_for', 'made_of', 'equipment_for'],
    primary_axis: 'x',
    branch_depth: 1,
    is_viewable: true,
  },
  stats_gov: {
    id: 'stats_gov',
    name: '国家统计局分类',
    description: 'GB/T 4754-2017 国民经济行业分类',
    main_axis_relations: [],
    branch_relations: [],
    is_viewable: false,
  },
  gb_standard: {
    id: 'gb_standard',
    name: '国家标准术语',
    description: 'GB标准中的正式术语名称',
    main_axis_relations: [],
    branch_relations: [],
    is_viewable: false,
  },
};

export function getEffectiveFlow(relationType: RelationType, chainId?: string): RelationFlow {
  if (chainId) {
    const chainDef = CHAIN_DEFS[chainId];
    if (chainDef) {
      for (const rel of chainDef.main_axis_relations) {
        if (typeof rel === 'object' && rel.type === relationType && rel.flow) {
          return rel.flow;
        }
      }
      for (const rel of chainDef.branch_relations) {
        if (typeof rel === 'object' && rel.type === relationType && rel.flow) {
          return rel.flow;
        }
      }
    }
  }
  return RELATION_FLOW[relationType];
}

export function relationMatchesType(
  rel: RelationType | { type: RelationType; flow?: RelationFlow },
  targetType: RelationType
): boolean {
  return typeof rel === 'string' ? rel === targetType : rel.type === targetType;
}

export function isMainAxisRelation(chainDef: ChainDef, relationType: RelationType): boolean {
  return chainDef.main_axis_relations.some(rel => relationMatchesType(rel, relationType));
}

export function isBranchRelation(chainDef: ChainDef, relationType: RelationType): boolean {
  return chainDef.branch_relations.some(rel => relationMatchesType(rel, relationType));
}
