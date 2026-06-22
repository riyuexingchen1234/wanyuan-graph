import { CollectionTask } from './data-collector';

export const PRESET_TASKS: CollectionTask[] = [
  {
    taskType: 'node',
    target: {
      name: '硅料',
      node_type: 'material',
      coordinate_systems: ['A'],
    },
    context: '光伏产业最上游原材料，主要用于硅片生产',
  },
  {
    taskType: 'node',
    target: {
      name: '硅片',
      node_type: 'product',
      coordinate_systems: ['A'],
    },
    context: '光伏电池片的前置材料，由硅料加工而成',
  },
  {
    taskType: 'node',
    target: {
      name: '光伏组件',
      node_type: 'product',
      coordinate_systems: ['A'],
    },
    context: '光伏发电系统的核心产品，由电池片组成',
  },
  {
    taskType: 'node',
    target: {
      name: '逆变器',
      node_type: 'equipment',
      coordinate_systems: ['A'],
    },
    context: '光伏系统中将直流电转换为交流电的设备',
  },
  {
    taskType: 'node',
    target: {
      name: '锂电池',
      node_type: 'product',
      coordinate_systems: ['A', 'B'],
    },
    context: '储能设备的核心组件，同时在消费电子、电动汽车等领域广泛应用',
  },
  {
    taskType: 'node',
    target: {
      name: '正极材料',
      node_type: 'material',
      coordinate_systems: ['A'],
    },
    context: '锂电池的核心材料之一，包括磷酸铁锂、三元材料等',
  },
  {
    taskType: 'node',
    target: {
      name: '电解液',
      node_type: 'material',
      coordinate_systems: ['A'],
    },
    context: '锂电池的关键辅助材料，影响电池性能',
  },
  {
    taskType: 'node',
    target: {
      name: '聚丙烯',
      node_type: 'material',
      coordinate_systems: ['B'],
    },
    context: '与聚乙烯类似的通用塑料，但熔点更高',
  },
  {
    taskType: 'node',
    target: {
      name: 'PET',
      node_type: 'material',
      coordinate_systems: ['B'],
    },
    context: '聚酯类通用材料，广泛用于纺织和包装',
  },
  {
    taskType: 'node',
    target: {
      name: 'EVA',
      node_type: 'material',
      coordinate_systems: ['B'],
    },
    context: '乙烯-醋酸乙烯共聚物，光伏组件封装材料',
  },
  {
    taskType: 'node',
    target: {
      name: '注塑工艺',
      node_type: 'process',
      coordinate_systems: ['B'],
    },
    context: '塑料成型核心工艺之一',
  },
  {
    taskType: 'node',
    target: {
      name: '挤出工艺',
      node_type: 'process',
      coordinate_systems: ['B'],
    },
    context: '塑料加工的另一核心工艺，用于生产薄膜、管材等',
  },
  {
    taskType: 'node',
    target: {
      name: '农用薄膜',
      node_type: 'product',
      coordinate_systems: ['B'],
    },
    context: '聚乙烯等塑料在农业领域的应用，用于大棚等',
  },
  {
    taskType: 'node',
    target: {
      name: '一次性餐具',
      node_type: 'product',
      coordinate_systems: ['B'],
    },
    context: '塑料的另一个日常应用领域',
  },
];
