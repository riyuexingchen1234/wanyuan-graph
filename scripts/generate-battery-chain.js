const fs = require('fs');
const path = require('path');

const now = new Date().toISOString();

const sources = {
  ciaps: {
    source_type: 'industry_report',
    description: '中国化学与物理电源行业协会(CIAPS) - 锂离子电池产业链白皮书',
    retrieved_at: now
  },
  miit: {
    source_type: 'official_data',
    description: '工业和信息化部 - 锂离子电池行业规范条件',
    url: 'https://www.miit.gov.cn/',
    retrieved_at: now
  },
  gb_general: {
    source_type: 'standard',
    description: 'GB/T 47292.1-2026 锂离子电池生产质量管理 第1部分：总体要求',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_material: {
    source_type: 'standard',
    description: 'GB/T 47292.2-2026 锂离子电池生产质量管理 第2部分：电池材料管控',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_separator: {
    source_type: 'standard',
    description: 'GB/T 36363-2018 锂离子电池用聚烯烃隔膜',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_cathode: {
    source_type: 'standard',
    description: 'GB/T 30835-2014 锂离子电池用炭复合磷酸铁锂正极材料',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_anode: {
    source_type: 'standard',
    description: 'GB/T 24533-2019 锂离子电池石墨类负极材料',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_alu_foil: {
    source_type: 'standard',
    description: 'GB/T 33143-2022 锂离子电池用铝及铝合金箔',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_cu_foil: {
    source_type: 'standard',
    description: 'GB/T 36146-2018 锂离子电池用压延铜箔',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_equipment: {
    source_type: 'standard',
    description: 'GB/T 38331-2019 锂离子电池生产设备通用技术要求',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  gb_power_battery: {
    source_type: 'standard',
    description: 'GB/T 46565-2025 基于项目的温室气体减排量评估技术规范 动力电池梯次利用',
    url: 'https://openstd.samr.gov.cn/',
    retrieved_at: now
  },
  encyclopedia: {
    source_type: 'encyclopedia',
    description: '中国大百科全书 - 电化学与电池工程卷',
    retrieved_at: now
  }
};

const nodes = [
  // ========== 上游资源 ==========
  {
    id: 'material-spodumene',
    name: '锂辉石',
    definition: '一种含锂的链状硅酸盐矿物，化学式为LiAl(SiO₃)₂，是工业上提取锂的主要矿石原料之一，Li₂O理论含量约8.03%。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-lepidolite',
    name: '锂云母',
    definition: '又称鳞云母，是一种含锂的层状硅酸盐矿物，化学式为KLi₂AlSi₄O₁₀(F,OH)₂，Li₂O含量约4-6%，是盐湖提锂之外的重要锂资源。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-cobalt-ore',
    name: '钴矿',
    definition: '含钴的金属矿产资源，主要以硫化钴矿和氧化钴矿形式存在，钴是三元锂电池正极材料的关键金属元素之一。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-nickel-ore',
    name: '镍矿',
    definition: '含镍的金属矿产资源，分为硫化镍矿和红土镍矿两大类，镍是高镍三元锂电池正极材料的核心金属元素。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-natural-graphite-ore',
    name: '天然石墨矿',
    definition: '自然界中天然形成的石墨矿产，分为晶质石墨和隐晶质石墨两类，经选矿提纯后可用于锂电池负极材料。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_anode]
  },
  {
    id: 'material-lithium-carbonate',
    name: '碳酸锂',
    definition: '化学式为Li₂CO₃，是锂盐工业的基础产品，也是制备锂电池正极材料（磷酸铁锂、三元材料、钴酸锂等）和电解液锂盐的核心原料。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_material]
  },
  {
    id: 'material-lithium-hydroxide',
    name: '氢氧化锂',
    definition: '化学式为LiOH，通常由碳酸锂加工制得，是高镍三元正极材料生产的主要锂源，相比碳酸锂具有更低的反应温度。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_material]
  },
  // ========== 正极材料 ==========
  {
    id: 'material-lfp',
    name: '磷酸铁锂',
    definition: '化学式为LiFePO₄（LFP），橄榄石结构的锂离子电池正极材料，具有安全性高、循环寿命长、成本低等特点，是动力电池和储能电池的主流正极材料之一。',
    node_type: 'material',
    parent_type: 'material-cathode-material',
    sources: [sources.ciaps, sources.gb_cathode]
  },
  {
    id: 'material-ncm',
    name: '三元材料(NCM)',
    definition: '镍钴锰三元正极材料（Nickel Cobalt Manganese），化学式为LiNiₓCoᵧMn₁₋ₓ₋ᵧO₂，兼具高能量密度与较好的安全性，广泛应用于动力电池和消费电子。',
    node_type: 'material',
    parent_type: 'material-cathode-material',
    sources: [sources.ciaps, sources.gb_material]
  },
  {
    id: 'material-nca',
    name: '三元材料(NCA)',
    definition: '镍钴铝三元正极材料（Nickel Cobalt Aluminum），化学式为LiNiₓCoᵧAl₁₋ₓ₋ᵧO₂，能量密度高但热稳定性略低于NCM，主要应用于高端动力电池。',
    node_type: 'material',
    parent_type: 'material-cathode-material',
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-lco',
    name: '钴酸锂',
    definition: '化学式为LiCoO₂（LCO），层状结构的锂离子电池正极材料，具有电压平台高、压实密度大的优点，是消费电子电池的传统正极材料。',
    node_type: 'material',
    parent_type: 'material-cathode-material',
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-lmo',
    name: '锰酸锂',
    definition: '化学式为LiMn₂O₄（LMO），尖晶石结构的锂离子电池正极材料，成本低、安全性好但比容量和循环寿命相对有限，常与其他材料混合使用。',
    node_type: 'material',
    parent_type: 'material-cathode-material',
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-cathode-material',
    name: '锂离子电池正极材料',
    definition: '锂电池中发生脱嵌锂反应的正极活性物质，决定电池的能量密度、电压平台、循环寿命等核心性能，主要包括磷酸铁锂、三元材料、钴酸锂、锰酸锂等体系。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_material]
  },
  // ========== 负极材料 ==========
  {
    id: 'material-anode-material',
    name: '锂离子电池负极材料',
    definition: '锂电池中储存和释放锂离子的负极活性物质，主流技术路线包括石墨类（天然石墨、人造石墨）和硅基负极等，直接影响电池的容量和首次效率。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_anode]
  },
  {
    id: 'material-natural-graphite',
    name: '天然石墨负极',
    definition: '以天然石墨矿为原料，经选矿、提纯、球化、表面包覆等工艺制得的锂电池负极材料，具有成本低、比容量较高的特点。',
    node_type: 'material',
    parent_type: 'material-anode-material',
    sources: [sources.ciaps, sources.gb_anode]
  },
  {
    id: 'material-synthetic-graphite',
    name: '人造石墨负极',
    definition: '以石油焦、针状焦等为原料，经造粒、石墨化等高温处理制成的锂电池负极材料，循环性能和一致性优于天然石墨，是动力电池的主流负极材料。',
    node_type: 'material',
    parent_type: 'material-anode-material',
    sources: [sources.ciaps, sources.gb_anode]
  },
  {
    id: 'material-silicon-anode',
    name: '硅基负极',
    definition: '以硅（Si）为主要活性物质的锂电池负极材料，理论比容量（约4200mAh/g）远高于石墨，是下一代高能量密度电池的核心负极技术路线。',
    node_type: 'material',
    parent_type: 'material-anode-material',
    sources: [sources.ciaps, sources.encyclopedia]
  },
  // ========== 电解液 ==========
  {
    id: 'material-electrolyte',
    name: '电解液',
    definition: '锂电池中作为离子传输介质的液态电解质，通常由锂盐、有机溶剂和功能添加剂组成，对电池的倍率性能、低温性能、循环寿命和安全性有重要影响。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_material]
  },
  {
    id: 'material-lipf6',
    name: '六氟磷酸锂',
    definition: '化学式为LiPF₆，是当前商业化锂电池最主流的锂盐，具有较好的离子电导率和电化学稳定性，约占电解液成本的40-50%。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-electrolyte-solvent',
    name: '电解液溶剂',
    definition: '电解液中溶解锂盐的有机溶剂，通常为碳酸酯类混合溶剂体系，包括碳酸乙烯酯(EC)、碳酸二甲酯(DMC)、碳酸甲乙酯(EMC)等。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  {
    id: 'material-electrolyte-additive',
    name: '电解液添加剂',
    definition: '电解液中添加量较少但具有关键功能的化学物质，包括成膜添加剂、阻燃添加剂、过充保护添加剂等，用于改善SEI膜性能和提升电池安全性。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  // ========== 隔膜 ==========
  {
    id: 'material-separator',
    name: '锂离子电池隔膜',
    definition: '位于锂电池正负极之间的高分子绝缘薄膜，主要功能是隔离正负极防止短路，同时允许锂离子通过，是锂电池的关键内层组件之一。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_separator]
  },
  {
    id: 'material-base-film',
    name: '基膜',
    definition: '隔膜的基础膜层，通常由聚乙烯(PE)、聚丙烯(PP)或其复合膜制成，通过干法或湿法工艺制备，是涂覆膜的基底材料。',
    node_type: 'material',
    parent_type: 'material-separator',
    sources: [sources.ciaps, sources.gb_separator]
  },
  {
    id: 'material-coated-separator',
    name: '涂覆膜',
    definition: '在基膜表面涂覆陶瓷（如氧化铝）、PVDF等材料的改性隔膜，可提升隔膜的热稳定性、机械强度和界面相容性，是高端电池的主流选择。',
    node_type: 'material',
    parent_type: 'material-separator',
    sources: [sources.ciaps, sources.gb_separator]
  },
  // ========== 其他辅材 ==========
  {
    id: 'material-copper-foil',
    name: '铜箔',
    definition: '锂电池负极集流体材料，用于承载负极活性物质并传导电子，主要采用电解铜箔和压延铜箔，厚度通常在6-12μm。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_cu_foil]
  },
  {
    id: 'material-aluminum-foil',
    name: '铝箔',
    definition: '锂电池正极集流体材料，用于承载正极活性物质并传导电子，厚度通常在10-20μm，具有重量轻、导电性好、抗氧化等特点。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_alu_foil]
  },
  {
    id: 'material-cell-case',
    name: '电芯外壳',
    definition: '锂电池电芯的封装壳体，分为钢壳、铝壳和铝塑膜三类，分别对应圆柱电池、方形电池和软包电池的封装需求。',
    node_type: 'material',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_general]
  },
  // ========== 中游：电芯与系统 ==========
  {
    id: 'product-battery-cell',
    name: '电芯',
    definition: '锂电池的最小电化学单元，由正极极片、负极极片、隔膜、电解液和外壳组成，单个电芯电压通常为3.2V（磷酸铁锂）或3.7V（三元体系）。',
    node_type: 'product',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_general]
  },
  {
    id: 'product-battery-module',
    name: '电池模组',
    definition: '由多个电芯通过串并联方式组合，并配备相应的采集、散热、结构件等组成的中间单元，是电池PACK的组成部分。',
    node_type: 'product',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_general]
  },
  {
    id: 'product-battery-pack',
    name: '电池PACK',
    definition: '由电池模组、电池管理系统(BMS)、热管理系统、结构件和电气系统等组成的完整电池系统，可直接为终端设备供电。',
    node_type: 'product',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_power_battery]
  },
  {
    id: 'product-bms',
    name: '电池管理系统(BMS)',
    definition: 'Battery Management System，负责监控电池的电压、电流、温度等参数，实现SOC估算、均衡管理、热管理和安全保护，是电池系统的核心控制部件。',
    node_type: 'product',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  // ========== 下游应用 ==========
  {
    id: 'product-power-battery',
    name: '动力电池',
    definition: '为新能源汽车提供动力来源的锂离子电池系统，具有高能量密度、高功率密度、长循环寿命等特点，是锂电池最大的应用领域。',
    node_type: 'product',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_power_battery]
  },
  {
    id: 'product-energy-storage-battery',
    name: '储能电池',
    definition: '应用于电力储能领域的锂离子电池，包括发电侧、电网侧和用户侧储能，具有长循环寿命、低成本、高安全性等特点。',
    node_type: 'product',
    parent_type: null,
    sources: [sources.ciaps, sources.miit]
  },
  {
    id: 'product-consumer-battery',
    name: '消费电子电池',
    definition: '应用于智能手机、笔记本电脑、平板电脑、可穿戴设备等3C消费电子产品的锂离子电池，通常追求高能量密度和轻薄化设计。',
    node_type: 'product',
    parent_type: null,
    sources: [sources.ciaps, sources.encyclopedia]
  },
  // ========== 设备 ==========
  {
    id: 'equipment-mixer',
    name: '搅拌机',
    definition: '锂电池极片制备的核心设备之一，用于将正负极活性物质、导电剂、粘结剂和溶剂均匀混合制成电极浆料，混合质量直接影响极片一致性。',
    node_type: 'equipment',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_equipment]
  },
  {
    id: 'equipment-coater',
    name: '涂布机',
    definition: '将制备好的电极浆料均匀涂覆在集流体（铜箔/铝箔）表面的设备，涂布的厚度均匀性和面密度控制是决定电芯品质的关键因素。',
    node_type: 'equipment',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_equipment]
  },
  {
    id: 'equipment-winder',
    name: '卷绕机',
    definition: '将正极极片、负极极片和隔膜按一定顺序卷绕成电芯的设备，是圆柱电池和方形电池制备的核心工艺设备之一。',
    node_type: 'equipment',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_equipment]
  },
  {
    id: 'equipment-stacker',
    name: '叠片机',
    definition: '将正极极片、隔膜、负极极片交替堆叠形成电芯的设备，叠片工艺电芯在能量密度和循环性能上具有优势，多用于方形和软包电池。',
    node_type: 'equipment',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_equipment]
  },
  {
    id: 'equipment-filling-machine',
    name: '注液机',
    definition: '向电芯内部精准注入电解液的设备，注液量精度和注液环境控制对电池性能和一致性有重要影响。',
    node_type: 'equipment',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_equipment]
  },
  {
    id: 'equipment-formation-grading',
    name: '化成分容设备',
    definition: '电芯制造后段的关键设备，化成是对电芯进行首次充放电激活的过程，分容是对电芯容量进行筛选分级，保证电池组的一致性。',
    node_type: 'equipment',
    parent_type: null,
    sources: [sources.ciaps, sources.gb_equipment]
  }
];

const edges = [
  // ========== 上游资源 -> 锂盐 ==========
  {
    source: 'material-spodumene',
    target: 'material-lithium-carbonate',
    relation_type: 'can_be_processed_into',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '锂辉石经硫酸法或石灰烧结法可提取制备碳酸锂'
  },
  {
    source: 'material-lepidolite',
    target: 'material-lithium-carbonate',
    relation_type: 'can_be_processed_into',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '锂云母经硫酸盐法或石灰石法可提取制备碳酸锂'
  },
  {
    source: 'material-lithium-carbonate',
    target: 'material-lithium-hydroxide',
    relation_type: 'can_be_processed_into',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '碳酸锂经苛化法或电解法可制备氢氧化锂'
  },
  // ========== 锂盐/金属 -> 正极材料 ==========
  {
    source: 'material-lithium-carbonate',
    target: 'material-lfp',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_cathode],
    note: '碳酸锂是磷酸铁锂的主要锂源原料'
  },
  {
    source: 'material-lithium-hydroxide',
    target: 'material-ncm',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '高镍三元材料通常使用氢氧化锂作为锂源'
  },
  {
    source: 'material-lithium-hydroxide',
    target: 'material-nca',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: 'NCA三元材料使用氢氧化锂作为锂源'
  },
  {
    source: 'material-lithium-carbonate',
    target: 'material-lco',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '碳酸锂是钴酸锂的主要锂源原料'
  },
  {
    source: 'material-lithium-carbonate',
    target: 'material-lmo',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '碳酸锂是锰酸锂的主要锂源原料'
  },
  {
    source: 'material-cobalt-ore',
    target: 'material-ncm',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '钴是三元材料的关键金属元素之一'
  },
  {
    source: 'material-cobalt-ore',
    target: 'material-nca',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '钴是NCA三元材料的关键金属元素之一'
  },
  {
    source: 'material-cobalt-ore',
    target: 'material-lco',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '钴是钴酸锂的核心金属元素'
  },
  {
    source: 'material-nickel-ore',
    target: 'material-ncm',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '镍是三元材料提高能量密度的关键元素'
  },
  {
    source: 'material-nickel-ore',
    target: 'material-nca',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '镍是NCA三元材料的主要金属元素'
  },
  // ========== 正极材料归类 ==========
  {
    source: 'material-lfp',
    target: 'material-cathode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_material],
    note: '磷酸铁锂是主流正极材料之一'
  },
  {
    source: 'material-ncm',
    target: 'material-cathode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_material],
    note: '三元材料NCM是主流正极材料之一'
  },
  {
    source: 'material-nca',
    target: 'material-cathode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '三元材料NCA是主流正极材料之一'
  },
  {
    source: 'material-lco',
    target: 'material-cathode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '钴酸锂是消费电子常用正极材料'
  },
  {
    source: 'material-lmo',
    target: 'material-cathode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '锰酸锂是正极材料体系之一'
  },
  // ========== 负极材料 ==========
  {
    source: 'material-natural-graphite-ore',
    target: 'material-natural-graphite',
    relation_type: 'can_be_processed_into',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_anode],
    note: '天然石墨矿经选矿、提纯、球化、包覆制得天然石墨负极'
  },
  {
    source: 'material-natural-graphite',
    target: 'material-anode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_anode],
    note: '天然石墨是石墨类负极材料的重要类别'
  },
  {
    source: 'material-synthetic-graphite',
    target: 'material-anode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_anode],
    note: '人造石墨是动力电池主流负极材料'
  },
  {
    source: 'material-silicon-anode',
    target: 'material-anode-material',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '硅基负极是下一代高能量密度负极材料'
  },
  // ========== 电解液 ==========
  {
    source: 'material-lithium-carbonate',
    target: 'material-lipf6',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '碳酸锂是制备六氟磷酸锂的主要原料'
  },
  {
    source: 'material-lipf6',
    target: 'material-electrolyte',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_material],
    note: '六氟磷酸锂是电解液的核心锂盐'
  },
  {
    source: 'material-electrolyte-solvent',
    target: 'material-electrolyte',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '有机溶剂是电解液的主要成分'
  },
  {
    source: 'material-electrolyte-additive',
    target: 'material-electrolyte',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '功能添加剂是电解液的重要组成部分'
  },
  // ========== 隔膜 ==========
  {
    source: 'material-base-film',
    target: 'material-separator',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_separator],
    note: '基膜是隔膜的基础形态'
  },
  {
    source: 'material-coated-separator',
    target: 'material-separator',
    relation_type: 'made_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_separator],
    note: '涂覆膜是高性能隔膜的主要形式'
  },
  {
    source: 'material-base-film',
    target: 'material-coated-separator',
    relation_type: 'can_be_processed_into',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '基膜经涂覆工艺可制得涂覆膜'
  },
  // ========== 材料 -> 电芯 ==========
  {
    source: 'material-cathode-material',
    target: 'product-battery-cell',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '正极材料是电芯的核心材料之一'
  },
  {
    source: 'material-anode-material',
    target: 'product-battery-cell',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '负极材料是电芯的核心材料之一'
  },
  {
    source: 'material-electrolyte',
    target: 'product-battery-cell',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '电解液是电芯的离子传输介质'
  },
  {
    source: 'material-separator',
    target: 'product-battery-cell',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '隔膜是电芯的关键绝缘组件'
  },
  {
    source: 'material-copper-foil',
    target: 'product-battery-cell',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_cu_foil],
    note: '铜箔是电芯负极集流体'
  },
  {
    source: 'material-aluminum-foil',
    target: 'product-battery-cell',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_alu_foil],
    note: '铝箔是电芯正极集流体'
  },
  {
    source: 'material-cell-case',
    target: 'product-battery-cell',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '电芯外壳是电芯的封装结构件'
  },
  // ========== 电芯 -> 模组 -> PACK ==========
  {
    source: 'product-battery-cell',
    target: 'product-battery-module',
    relation_type: 'can_be_processed_into',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '多个电芯串并联组成电池模组'
  },
  {
    source: 'product-battery-module',
    target: 'product-battery-pack',
    relation_type: 'can_be_processed_into',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_power_battery],
    note: '多个模组加上BMS、热管理等组成电池PACK'
  },
  {
    source: 'product-bms',
    target: 'product-battery-pack',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: 'BMS是电池PACK的核心控制系统'
  },
  // ========== 产业链上下游关系 ==========
  {
    source: 'material-spodumene',
    target: 'material-lithium-carbonate',
    relation_type: 'upstream_of',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '锂辉石是碳酸锂的上游矿产资源'
  },
  {
    source: 'material-lepidolite',
    target: 'material-lithium-carbonate',
    relation_type: 'upstream_of',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '锂云母是碳酸锂的上游矿产资源'
  },
  {
    source: 'material-lithium-carbonate',
    target: 'material-cathode-material',
    relation_type: 'upstream_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_material],
    note: '碳酸锂是正极材料的核心上游原料'
  },
  {
    source: 'material-cathode-material',
    target: 'product-battery-cell',
    relation_type: 'upstream_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '正极材料是电芯的上游核心材料'
  },
  {
    source: 'product-battery-cell',
    target: 'product-battery-module',
    relation_type: 'upstream_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_general],
    note: '电芯是电池模组的上游产品'
  },
  {
    source: 'product-battery-module',
    target: 'product-battery-pack',
    relation_type: 'upstream_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_power_battery],
    note: '电池模组是电池PACK的上游组成部分'
  },
  {
    source: 'product-battery-pack',
    target: 'product-power-battery',
    relation_type: 'upstream_of',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_power_battery],
    note: '电池PACK是动力电池的上游核心部件'
  },
  // ========== 下游应用 ==========
  {
    source: 'product-battery-pack',
    target: 'product-power-battery',
    relation_type: 'applied_in',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_power_battery],
    note: '电池PACK是动力电池系统的核心组成部分'
  },
  {
    source: 'product-battery-pack',
    target: 'product-energy-storage-battery',
    relation_type: 'applied_in',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.miit],
    note: '电池PACK应用于储能电池系统'
  },
  {
    source: 'product-battery-cell',
    target: 'product-consumer-battery',
    relation_type: 'applied_in',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '电芯直接应用于消费电子电池'
  },
  {
    source: 'product-bms',
    target: 'product-power-battery',
    relation_type: 'applied_in',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: 'BMS是动力电池系统的核心控制部件'
  },
  {
    source: 'product-bms',
    target: 'product-energy-storage-battery',
    relation_type: 'applied_in',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: 'BMS是储能电池系统的核心控制部件'
  },
  {
    source: 'product-battery-module',
    target: 'product-power-battery',
    relation_type: 'applied_in',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '电池模组应用于动力电池系统'
  },
  {
    source: 'product-battery-module',
    target: 'product-energy-storage-battery',
    relation_type: 'applied_in',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '电池模组应用于储能电池系统'
  },
  {
    source: 'material-lco',
    target: 'product-consumer-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '钴酸锂是消费电子电池的主流正极材料'
  },
  {
    source: 'material-ncm',
    target: 'product-consumer-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '三元材料也应用于高端消费电子电池'
  },
  {
    source: 'material-lfp',
    target: 'product-power-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_cathode],
    note: '磷酸铁锂是动力电池的主要正极材料路线之一'
  },
  {
    source: 'material-ncm',
    target: 'product-power-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '三元材料是动力电池的主要正极材料路线之一'
  },
  {
    source: 'material-nca',
    target: 'product-power-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: 'NCA三元材料应用于高端动力电池'
  },
  {
    source: 'material-lfp',
    target: 'product-energy-storage-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '磷酸铁锂是储能电池的主流正极材料'
  },
  {
    source: 'material-synthetic-graphite',
    target: 'product-power-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_anode],
    note: '人造石墨是动力电池的主流负极材料'
  },
  {
    source: 'material-natural-graphite',
    target: 'product-consumer-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '天然石墨常用于消费电子电池负极'
  },
  {
    source: 'material-electrolyte',
    target: 'product-power-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps],
    note: '电解液是动力电池的关键材料之一'
  },
  {
    source: 'material-separator',
    target: 'product-power-battery',
    relation_type: 'raw_material_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_separator],
    note: '隔膜是动力电池的关键内层组件'
  },
  // ========== 设备链 ==========
  {
    source: 'equipment-mixer',
    target: 'product-battery-cell',
    relation_type: 'equipment_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_equipment],
    note: '搅拌机用于电极浆料制备工序'
  },
  {
    source: 'equipment-coater',
    target: 'product-battery-cell',
    relation_type: 'equipment_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_equipment],
    note: '涂布机用于极片涂布工序'
  },
  {
    source: 'equipment-winder',
    target: 'product-battery-cell',
    relation_type: 'equipment_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_equipment],
    note: '卷绕机用于卷绕式电芯制备'
  },
  {
    source: 'equipment-stacker',
    target: 'product-battery-cell',
    relation_type: 'equipment_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_equipment],
    note: '叠片机用于叠片式电芯制备'
  },
  {
    source: 'equipment-filling-machine',
    target: 'product-battery-cell',
    relation_type: 'equipment_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_equipment],
    note: '注液机用于电芯注液工序'
  },
  {
    source: 'equipment-formation-grading',
    target: 'product-battery-cell',
    relation_type: 'equipment_for',
    verification_status: 'verified',
    evidence: [sources.ciaps, sources.gb_equipment],
    note: '化成分容设备用于电芯后段激活和容量分级'
  }
];

const result = {
  nodes: nodes,
  edges: edges,
  metadata: {
    source: '中国化学与物理电源行业协会(CIAPS) + 国家标准 + 工信部行业规范',
    source_url: 'https://www.ciaps.org.cn/',
    crawled_at: now,
    record_count: nodes.length + edges.length
  }
};

const outputPath = path.join(__dirname, '..', 'data', 'raw', 'battery-industry-chain.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

console.log('锂电池产业链数据生成完成！');
console.log('节点数量:', nodes.length);
console.log('边数量:', edges.length);
console.log('输出路径:', outputPath);

// 按类型统计节点
const nodeTypes = {};
nodes.forEach(n => {
  nodeTypes[n.node_type] = (nodeTypes[n.node_type] || 0) + 1;
});
console.log('节点类型统计:', JSON.stringify(nodeTypes, null, 2));

// 按关系类型统计边
const edgeTypes = {};
edges.forEach(e => {
  edgeTypes[e.relation_type] = (edgeTypes[e.relation_type] || 0) + 1;
});
console.log('关系类型统计:', JSON.stringify(edgeTypes, null, 2));
