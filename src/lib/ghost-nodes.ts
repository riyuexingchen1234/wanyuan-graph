export const GHOST_NODES = [
  { id: 'ghost-1', name: '硅料', x: -300, y: -200, coordinate_system: 'A', hint: '光伏上游原材料' },
  { id: 'ghost-2', name: '光伏组件', x: -200, y: -350, coordinate_system: 'A', hint: '光伏核心产品' },
  { id: 'ghost-3', name: '逆变器', x: -350, y: -100, coordinate_system: 'A', hint: '光伏配套设备' },
  { id: 'ghost-4', name: '聚丙烯', x: 300, y: 200, coordinate_system: 'B', hint: '另一种通用塑料' },
  { id: 'ghost-5', name: '注塑工艺', x: 250, y: 350, coordinate_system: 'B', hint: '塑料成型核心工艺' },
  { id: 'ghost-6', name: 'EVA薄膜', x: 400, y: 150, coordinate_system: 'B', hint: '光伏与包装的交汇材料' },
  { id: 'ghost-7', name: '锂电池', x: -150, y: 300, coordinate_system: 'AB', hint: '储能核心产品' },
  { id: 'ghost-8', name: 'PET颗粒', x: 350, y: -200, coordinate_system: 'B', hint: '聚酯类通用材料' },
];

export interface GhostNode {
  id: string;
  name: string;
  x: number;
  y: number;
  coordinate_system: 'A' | 'B' | 'AB';
  hint: string;
}