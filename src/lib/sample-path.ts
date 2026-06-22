export const SAMPLE_PATH = [
  { 
    nodeId: "industry-photovoltaic", 
    nodeName: "光伏",
    role: "起点", 
    coordinateSystem: "A",
    narration: "我们从光伏行业开始。这是大多数人能想到的新能源入口。",
    isTransitionPoint: false 
  },
  { 
    nodeId: "product-energy-storage-equipment", 
    nodeName: "储能设备",
    role: "A域-下游", 
    coordinateSystem: "A",
    narration: "光伏发电需要储能配套，储能设备是光伏产业链的下游环节。",
    isTransitionPoint: false 
  },
  { 
    nodeId: "product-battery-separator", 
    nodeName: "电池隔膜",
    role: "交汇点", 
    coordinateSystem: "AB",
    narration: "这里是关键——电池隔膜既是储能设备的上游材料（坐标系A），同时也是聚乙烯这种通用塑料的一种应用形态（坐标系B）。我们在这里换轨，从产业链视角切入材料属性视角。",
    isTransitionPoint: true 
  },
  { 
    nodeId: "material-polyethylene", 
    nodeName: "聚乙烯",
    role: "B域-材料", 
    coordinateSystem: "B",
    narration: "换到材料视角后，我们看到电池隔膜的底层材料是聚乙烯——一种最普通的塑料，成本极低，随处可见。",
    isTransitionPoint: false 
  },
  { 
    nodeId: "product-plastic-pipe", 
    nodeName: "塑料管道",
    role: "B域-延伸", 
    coordinateSystem: "B",
    narration: "同一种聚乙烯，还可以加工成塑料管道，用于给水、燃气——和储能毫无关系的行业。",
    isTransitionPoint: false 
  },
  { 
    nodeId: "product-packaging-film", 
    nodeName: "包装薄膜",
    role: "B域-延伸", 
    coordinateSystem: "B",
    narration: "还可以加工成包装薄膜，用于食品、电商包装。从光伏出发，我们走到了快递包装。这就是被行业分类切断的连接。",
    isTransitionPoint: false 
  }
] as const;

export const SAMPLE_PATH_NODE_IDS = SAMPLE_PATH.map(s => s.nodeId);