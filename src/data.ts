import { GraphData } from './types';

/**
 * 三条产业链共享部分节点（石油、聚乙烯），
 * 体现"世界本来是网状的"这一核心理念。
 * 
 * 产业链1：塑料杯产业链（需求：日常饮品需求）
 * 产业链2：一次性医疗耗材产业链（需求：医疗防护需求）
 * 产业链3：食品包装产业链（需求：食品保鲜需求）
 * 
 * 共享节点：石油、聚乙烯(PE) —— 三条产业链的交叉点
 */
export const sampleData: GraphData = {
  nodes: [
    // ===== 共享节点 =====
    {
      id: 'oil',
      name: '石油',
      type: 'material',
      description: '石油化工原料，多种塑料的基础原料。三条产业链的共同起点。',
      credibility: 'verified',
      sources: ['行业报告']
    },
    {
      id: 'pe',
      name: '聚乙烯(PE)',
      type: 'material',
      description: '由石油裂解得到的基础塑料材料。在塑料杯、医疗耗材、食品包装三个行业都有应用，但因行业分类不同，常被当作不同的东西。',
      credibility: 'verified',
      sources: ['化工行业标准', '跨行业材料对照研究']
    },

    // ===== 产业链1：塑料杯 =====
    {
      id: 'pellet',
      name: '塑料粒子',
      type: 'process',
      description: 'PE原料加工成的塑料粒子，便于运输和后续加工',
      credibility: 'verified',
      sources: ['生产工艺文档']
    },
    {
      id: 'cup-factory',
      name: '塑料杯厂',
      type: 'entity',
      description: '专门生产塑料杯的制造工厂',
      credibility: 'verified',
      sources: ['企业调研']
    },
    {
      id: 'cup-brand',
      name: '品牌商',
      type: 'entity',
      description: '塑料杯品牌运营商',
      credibility: 'verified',
      sources: ['市场调研']
    },
    {
      id: 'distributor',
      name: '经销商',
      type: 'entity',
      description: '负责塑料杯的分销和批发',
      credibility: 'verified',
      sources: ['渠道调研']
    },
    {
      id: 'drink-demand',
      name: '日常饮品需求',
      type: 'demand',
      description: '消费者对饮品的日常需求，牵引塑料杯产业链',
      credibility: 'verified',
      sources: ['消费者研究']
    },

    // ===== 产业链2：医疗耗材 =====
    {
      id: 'medical-pellet',
      name: '医用级塑料粒子',
      type: 'process',
      description: '符合医疗标准的塑料粒子，与普通塑料粒子的区别在于纯度和认证',
      credibility: 'verified',
      sources: ['医疗器械认证']
    },
    {
      id: 'medical-factory',
      name: '医疗器械厂',
      type: 'entity',
      description: '生产一次性医疗耗材的工厂',
      credibility: 'verified',
      sources: ['医疗器械注册证']
    },
    {
      id: 'hospital',
      name: '医院',
      type: 'entity',
      description: '医疗耗材的使用单位',
      credibility: 'verified',
      sources: ['医疗采购数据']
    },
    {
      id: 'medical-demand',
      name: '医疗防护需求',
      type: 'demand',
      description: '医疗场景对防护和一次性耗材的需求',
      credibility: 'verified',
      sources: ['医疗需求研究']
    },

    // ===== 产业链3：食品包装 =====
    {
      id: 'pe-film',
      name: 'PE膜',
      type: 'product',
      description: '由PE制成的包装膜，用于食品保鲜',
      credibility: 'verified',
      sources: ['包装材料标准']
    },
    {
      id: 'packaging-factory',
      name: '包装材料厂',
      type: 'entity',
      description: '生产食品包装材料的工厂',
      credibility: 'verified',
      sources: ['企业调研']
    },
    {
      id: 'food-factory',
      name: '食品加工厂',
      type: 'entity',
      description: '使用包装材料进行食品包装的工厂',
      credibility: 'verified',
      sources: ['食品生产许可']
    },
    {
      id: 'supermarket',
      name: '超市',
      type: 'entity',
      description: '食品的销售渠道',
      credibility: 'verified',
      sources: ['零售渠道数据']
    },
    {
      id: 'food-demand',
      name: '食品保鲜需求',
      type: 'demand',
      description: '消费者对食品保鲜和包装的需求',
      credibility: 'verified',
      sources: ['消费者研究']
    }
  ],

  relationships: [
    // ===== 产业链1：塑料杯产业链 =====
    {
      id: 'r1-1',
      sourceId: 'oil',
      targetId: 'pe',
      type: 'supply',
      strength: 0.9,
      description: '石油裂解生产聚乙烯',
      credibility: 'verified',
      chainId: 'chain-1'
    },
    {
      id: 'r1-2',
      sourceId: 'pe',
      targetId: 'pellet',
      type: 'supply',
      strength: 0.9,
      description: 'PE加工成塑料粒子',
      credibility: 'verified',
      chainId: 'chain-1'
    },
    {
      id: 'r1-3',
      sourceId: 'pellet',
      targetId: 'cup-factory',
      type: 'supply',
      strength: 0.9,
      description: '塑料粒子供应给塑料杯厂',
      credibility: 'verified',
      chainId: 'chain-1'
    },
    {
      id: 'r1-4',
      sourceId: 'cup-factory',
      targetId: 'cup-brand',
      type: 'supply',
      strength: 0.8,
      description: '塑料杯厂为品牌商代工',
      credibility: 'verified',
      chainId: 'chain-1'
    },
    {
      id: 'r1-5',
      sourceId: 'cup-brand',
      targetId: 'distributor',
      type: 'supply',
      strength: 0.8,
      description: '品牌商通过经销商分销',
      credibility: 'verified',
      chainId: 'chain-1'
    },
    {
      id: 'r1-6',
      sourceId: 'distributor',
      targetId: 'drink-demand',
      type: 'demand',
      strength: 0.7,
      description: '经销商满足日常饮品需求',
      credibility: 'verified',
      chainId: 'chain-1'
    },

    // ===== 产业链2：医疗耗材产业链 =====
    {
      id: 'r2-1',
      sourceId: 'pe',
      targetId: 'medical-pellet',
      type: 'supply',
      strength: 0.9,
      description: 'PE加工成医用级塑料粒子（需额外纯化和认证）',
      credibility: 'verified',
      chainId: 'chain-2'
    },
    {
      id: 'r2-2',
      sourceId: 'medical-pellet',
      targetId: 'medical-factory',
      type: 'supply',
      strength: 0.9,
      description: '医用塑料粒子供应给医疗器械厂',
      credibility: 'verified',
      chainId: 'chain-2'
    },
    {
      id: 'r2-3',
      sourceId: 'medical-factory',
      targetId: 'hospital',
      type: 'supply',
      strength: 0.9,
      description: '医疗器械厂向医院供货',
      credibility: 'verified',
      chainId: 'chain-2'
    },
    {
      id: 'r2-4',
      sourceId: 'hospital',
      targetId: 'medical-demand',
      type: 'demand',
      strength: 0.7,
      description: '医院满足医疗防护需求',
      credibility: 'verified',
      chainId: 'chain-2'
    },

    // ===== 产业链3：食品包装产业链 =====
    {
      id: 'r3-1',
      sourceId: 'pe',
      targetId: 'pe-film',
      type: 'supply',
      strength: 0.9,
      description: 'PE加工成PE膜（食品级）',
      credibility: 'verified',
      chainId: 'chain-3'
    },
    {
      id: 'r3-2',
      sourceId: 'pe-film',
      targetId: 'packaging-factory',
      type: 'supply',
      strength: 0.8,
      description: 'PE膜供应给包装材料厂',
      credibility: 'verified',
      chainId: 'chain-3'
    },
    {
      id: 'r3-3',
      sourceId: 'packaging-factory',
      targetId: 'food-factory',
      type: 'supply',
      strength: 0.8,
      description: '包装材料厂为食品加工厂提供包装',
      credibility: 'verified',
      chainId: 'chain-3'
    },
    {
      id: 'r3-4',
      sourceId: 'food-factory',
      targetId: 'supermarket',
      type: 'supply',
      strength: 0.8,
      description: '食品加工厂向超市供货',
      credibility: 'verified',
      chainId: 'chain-3'
    },
    {
      id: 'r3-5',
      sourceId: 'supermarket',
      targetId: 'food-demand',
      type: 'demand',
      strength: 0.7,
      description: '超市满足食品保鲜需求',
      credibility: 'verified',
      chainId: 'chain-3'
    },

    // ===== 跨产业链连接（核心亮点） =====
    {
      id: 'cross-1',
      sourceId: 'pellet',
      targetId: 'medical-pellet',
      type: 'material',
      strength: 0.85,
      description: '塑料粒子与医用塑料粒子的加工工艺相似，同一条产线可以切换生产',
      credibility: 'likely'
    },
    {
      id: 'cross-2',
      sourceId: 'distributor',
      targetId: 'supermarket',
      type: 'capital',
      strength: 0.7,
      description: '经销商和超市都是流通渠道，部分经销商同时经营塑料杯和食品',
      credibility: 'verified'
    },
    {
      id: 'cross-3',
      sourceId: 'cup-factory',
      targetId: 'packaging-factory',
      type: 'technology',
      strength: 0.75,
      description: '塑料杯厂和包装材料厂使用相似的注塑/吹膜设备，技术可迁移',
      credibility: 'likely'
    }
  ],

  chains: [
    {
      id: 'chain-1',
      name: '塑料杯产业链',
      description: '从石油到塑料杯：石油→聚乙烯→塑料粒子→塑料杯厂→品牌商→经销商→日常饮品需求',
      nodeIds: ['oil', 'pe', 'pellet', 'cup-factory', 'cup-brand', 'distributor', 'drink-demand'],
      demandType: '日常饮品需求'
    },
    {
      id: 'chain-2',
      name: '一次性医疗耗材产业链',
      description: '从石油到医疗耗材：石油→聚乙烯→医用塑料粒子→医疗器械厂→医院→医疗防护需求',
      nodeIds: ['oil', 'pe', 'medical-pellet', 'medical-factory', 'hospital', 'medical-demand'],
      demandType: '医疗防护需求'
    },
    {
      id: 'chain-3',
      name: '食品包装产业链',
      description: '从石油到食品包装：石油→聚乙烯→PE膜→包装材料厂→食品加工厂→超市→食品保鲜需求',
      nodeIds: ['oil', 'pe', 'pe-film', 'packaging-factory', 'food-factory', 'supermarket', 'food-demand'],
      demandType: '食品保鲜需求'
    }
  ]
};
