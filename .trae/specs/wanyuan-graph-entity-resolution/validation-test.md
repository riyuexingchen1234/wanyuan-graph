# 数据层方案验证报告 — 光伏×锂电十字交叉测试用例

## 测试目的

用两条真实存在且有交叉的产业链（光伏产业链 pv_chain × 锂电池储能产业链 battery_chain）作为测试数据，故意植入多种真实世界常见的数据问题，完整走查设计方案的pipeline各阶段，验证：
1. 实体消歧决策是否正确（merge/parent_child/not_duplicate/manual_review）
2. 命名分层是否合理（name/aliases/contextual_names）
3. 产业链归属是否正确（chains/primary_chain）
4. 边处理是否正确（流向、合并、派生、验证）
5. DAL接口能否支撑十字交叉交互场景
6. 找出方案中潜在的漏洞和边界问题

---

## 一、测试输入数据

### 1.1 场景设定

两条产业链通过"光储系统"场景交叉——光伏组件发出直流电，锂电池储能系统存储电能，组成光伏+储能一体化系统。真实世界中：
- 上游材料大部分各属各链（硅料 vs 锂矿）
- 少量共用材（铝合金、铜）同时服务两链
- 核心交叉是应用层：光伏组件 →(applied_in)→ 储能系统/电池包
- 命名差异真实存在：
  - 光伏行业叫"光伏组件/光伏板"
  - 储能/房车改装/民用行业叫"太阳能板/太阳能电池板"
  - 电池行业里"隔膜"和"电池隔膜"混用
  - 电池行业里"石墨负极"主要用人造石墨，但行业里"石墨"和"人造石墨"常混用（不严谨但普遍）
  - EVA胶膜行业内简称"EVA"
  - 国标文档名冗长（"地面用晶体硅光伏组件总规范"）

### 1.2 故意植入的问题（共10个数据pipeline测试点）

| 编号 | 问题类型 | 具体问题 | 预期处理 |
|------|---------|---------|---------|
| B1 | 同物异名（简称） | "电池隔膜" vs "隔膜"（节点11 vs 12），都是电池隔离膜 | merge，主名"电池隔膜"，"隔膜"为alias |
| B2 | 父子关系混淆 | "石墨负极" vs "人造石墨"（节点9 vs 10），人造石墨是石墨负极的主流子类 | parent_child（人造石墨的parent是石墨负极），不merge |
| B3 | 跨链语境名差异 | "光伏组件"（节点5）在储能/民用场景叫"太阳能板" | name="光伏组件"，contextual_name(battery_chain)="太阳能板" |
| B4 | 英文简称 | "EVA胶膜"（节点6）行业简称"EVA" | alias "EVA" |
| B5 | 国标文档名误入节点 | "地面用晶体硅光伏组件总规范"（节点16，gb_standard来源） | 识别为文档名，剥离后匹配"光伏组件"，merge为contextual_name(gb_standard) |
| B6 | 跨链共用材归属 | "铝合金"（节点15）同时供给光伏边框和电池壳体 | chains=[pv_chain,battery_chain]，primary_chain需决策 |
| B7 | 边方向反向 | "电池包 made_of 铝合金"（边E-m1）是反向边，source电池包在右 | 流向标注downstream_to_upstream，布局时铝合金在左 |
| B8 | 重复边 | 两条"碳酸锂→磷酸铁锂电池 raw_material_for"边来自不同数据源 | 合并evidence，不重复 |
| B9 | parent_type生成边 | 人造石墨parent_type=石墨负极，需派生can_be_processed_into或made_of？验证派生逻辑 | 应派生made_of或合适的relation_type，不应是raw_material_for |
| B10 | 悬空边（模拟数据错误） | 一条边指向不存在的节点id | V2引用完整性验证捕获，阻断apply |

### 1.3 节点数据（16个原始节点）

```
===== 光伏链专属节点 =====
N1  material-polysilicon       "多晶硅料"     material  pv来源
    def: "纯度9N以上的高纯度多晶硅，用于生产单晶硅棒和多晶硅锭，是光伏产业链最上游核心原料"
    sources: [{type: industry_report, desc: "光伏产业链研究报告-硅料环节"}]
    aliases: [{term: "多晶硅", context: "行业简称"}]

N2  material-silicon-wafer     "硅片"         material  pv来源
    def: "由单晶硅棒切割而成的薄片，是生产光伏电池片的基底材料"
    parent_type: null
    sources: [{type: industry_report}]

N3  product-solar-cell         "光伏电池片"   product   pv来源
    def: "在硅片上通过扩散、镀膜、印刷等工艺制成的可将光能转化为电能的半导体器件"
    sources: [{type: industry_report}]

N4  material-eva-film          "EVA胶膜"      material  pv来源
    def: "乙烯-醋酸乙烯酯共聚物薄膜，用于光伏组件封装时粘结和保护电池片"
    sources: [{type: industry_report}]
    注：行业简称EVA，但aliases里故意不填，测试N4简称识别

N5  product-pv-module          "光伏组件"     product   pv来源
    def: "由光伏电池片、EVA胶膜、钢化玻璃、铝合金边框等层压封装而成的光伏发电单元"
    sources: [{type: industry_report, desc: "光伏产业链研究报告"}]

N6  equipment-laminator        "层压机"       equipment pv来源
    def: "光伏组件生产中用于将各层材料在高温真空下热压合为一体的核心设备"
    sources: [{type: industry_report}]

===== 电池链专属节点 =====
N7  material-lithium-carbonate "碳酸锂"      material  battery来源
    def: "电池级碳酸锂，是生产磷酸铁锂、三元材料等锂电池正极材料的核心锂源"
    sources: [{type: industry_report}]

N8  material-lfp-cathode       "磷酸铁锂正极材料" material  battery来源
    def: "以磷酸铁锂为主体的锂电池正极活性物质，是磷酸铁锂电池的关键材料"
    sources: [{type: industry_report}]

N9  material-graphite-anode    "石墨负极"     material  battery来源
    def: "以石墨类材料为活性物质的锂电池负极，嵌锂时储存锂离子"
    sources: [{type: industry_report}]

N10 material-artificial-graphite "人造石墨"   material  battery来源
    def: "以石油焦、针状焦为原料经石墨化处理得到的石墨材料，是目前锂电池石墨负极的主流类型"
    sources: [{type: industry_report}]
    注：这是N9石墨负极的主要子类，故意不设parent_type，测试B2

N11 material-battery-separator "电池隔膜"    material  battery来源
    def: "锂电池中置于正负极之间的聚乙烯/聚丙烯微孔膜，阻止电子通过同时允许锂离子通过"
    sources: [{type: industry_report}]
    aliases: [{term: "锂电隔膜", context: "行业简称"}]

N12 product-separator-membrane "隔膜"        product   battery来源（故意标product，与N11类型不一致问题？）
    def: "电池中用于隔离正负极的微孔薄膜"
    sources: [{type: cninfo, desc: "某隔膜企业年报中简称"}]
    注：B1测试点：与N11同物异名；但类型错误(product/material)需要被发现

N13 product-lfp-cell          "磷酸铁锂电芯" product   battery来源
    def: "以磷酸铁锂为正极、石墨为负极的方形/软包/圆柱锂电池单体"
    sources: [{type: industry_report}]

N14 product-battery-pack      "电池包"       product   battery来源
    def: "由多个电芯通过串并联组合、配合BMS和热管理系统组成的电池系统"
    sources: [{type: industry_report}]

===== 跨链共用节点 =====
N15 material-aluminum-alloy    "铝合金"      material  pv+battery来源
    def: "以铝为基加入其他元素的合金材料，在光伏中用于制造边框，在电池中用于制造壳体"
    sources: [{type: industry_report, desc: "有色金属行业报告"}]
    注：B6测试点

===== 脏数据：国标文档名 =====
N16 product-gb-pv-module-spec "地面用晶体硅光伏组件总规范" product gb来源
    def: "国家标准GB/T 9535-2018规定的地面用晶体硅光伏组件的技术要求和试验方法"
    sources: [{type: standard, desc: "GB/T 9535-2018 地面用晶体硅光伏组件总规范", url: "openstd..."}]
    注：B5测试点：这是文档名不是实体名
```

### 1.4 边数据（15条原始边）

```
===== 光伏链主轴（upstream_to_downstream）=====
E1  material-polysilicon → material-silicon-wafer    can_be_processed_into   pv来源 [proposed]
E2  material-silicon-wafer → product-solar-cell      can_be_processed_into   pv来源 [proposed]
E3  product-solar-cell → product-pv-module           can_be_processed_into   pv来源 [proposed]

===== 光伏链支链 =====
E4  material-eva-film → product-pv-module            applied_in              pv来源 [proposed]
    注：EVA胶膜应用于光伏组件封装
E5  equipment-laminator → product-pv-module          equipment_for           pv来源 [proposed]
    注：层压机是光伏组件生产设备
E6  material-aluminum-alloy → product-pv-module      raw_material_for        pv来源 [proposed]
    注：铝合金作为边框原料

===== 电池链主轴 =====
E7  material-lithium-carbonate → material-lfp-cathode   raw_material_for   battery来源 [proposed]
E8  material-lfp-cathode → product-lfp-cell             can_be_processed_into  battery来源 [proposed]
E9  material-graphite-anode → product-lfp-cell          raw_material_for       battery来源 [proposed]
E10 material-battery-separator → product-lfp-cell       raw_material_for       battery来源 [proposed]
E11 product-lfp-cell → product-battery-pack             can_be_processed_into  battery来源 [proposed]

===== 电池链重复边（B8）=====
E12 material-lithium-carbonate → material-lfp-cathode   raw_material_for   cninfo来源 [proposed]
    evidence: [{type: cninfo, desc: "某锂盐企业年报：碳酸锂用于生产磷酸铁锂"}]
    注：与E7重复，来源不同

===== 电池链反向边（B7，made_of方向）=====
E13 product-battery-pack → material-aluminum-alloy      made_of             battery来源 [proposed]
    evidence: [{type: cninfo, desc: "某电池企业年报：电池包外壳采用铝合金材料"}]
    注：source=电池包(成品)，target=铝合金(原料)，made_of是反向边(downstream_to_upstream)

===== 跨链边（十字交叉核心）=====
E14 product-pv-module → product-battery-pack            applied_in          pv+battery [proposed]
    evidence: [{type: industry_report, desc: "光储一体化：光伏组件发电输入储能电池包存储"}]
    注：光伏组件应用于储能电池系统

===== 脏数据：悬空边（B10）=====
E15 material-copper-foil → product-lfp-cell             raw_material_for      battery来源 [proposed]
    注：material-copper-foil节点不存在（未定义），测试V2完整性验证
```

### 1.5 预置ChainDef（使用方案中定义的初版）

使用方案文档中定义的pv_chain和battery_chain配置，不做特殊修改。

---

## 二、Pipeline逐阶段模拟走查

### 阶段0：爬取（Crawl）

测试数据直接从raw JSON读取，跳过真实网络爬取。输出标准化CrawlResult。

**检查点**：CrawlerSource接口正常加载pv和battery两条链数据 ✅

---

### 阶段N1：名称规范化

对每个name生成norm_name，标记is_document_title：

| 节点ID | 原name | norm_name | is_document_title |
|--------|--------|-----------|-------------------|
| N1 多晶硅料 | "多晶硅料" | "多晶硅料" | false |
| N2 硅片 | "硅片" | "硅片" | false |
| N3 光伏电池片 | "光伏电池片" | "光伏电池片" | false |
| N4 EVA胶膜 | "EVA胶膜" | "eva胶膜" | false |
| N5 光伏组件 | "光伏组件" | "光伏组件" | false |
| N6 层压机 | "层压机" | "层压机" | false |
| N7 碳酸锂 | "碳酸锂" | "碳酸锂" | false |
| N8 磷酸铁锂正极材料 | "磷酸铁锂正极材料" | "磷酸铁锂正极材料" | false |
| N9 石墨负极 | "石墨负极" | "石墨负极" | false |
| N10 人造石墨 | "人造石墨" | "人造石墨" | false |
| N11 电池隔膜 | "电池隔膜" | "电池隔膜" | false |
| N12 隔膜 | "隔膜" | "隔膜" | false |
| N13 磷酸铁锂电芯 | "磷酸铁锂电芯" | "磷酸铁锂电芯" | false |
| N14 电池包 | "电池包" | "电池包" | false |
| N15 铝合金 | "铝合金" | "铝合金" | false |
| N16 地面用晶体硅光伏组件总规范 | "地面用晶体硅光伏组件总规范" | "地面用晶体硅光伏组件" | **true**（含"总规范"且source_type=standard） |

**检查点**：
- 英文EVA→小写eva（规范化不丢失信息） ✅
- N16正确识别为文档名 ✅
- 其他名称无全角/空格/繁简问题 ✅

**发现问题1（非阻断）**：当前规则只标记source_type=standard的文档名，但N12（隔膜）source_type=cninfo不标记，没问题。但如果未来有非国标来源引用标准全名（如cninfo年报引用标准名），可能漏标记。这是低优先级改进项，当前不阻断。

---

### 阶段N2：候选重复对检测

按node_type分组+多策略打分：

#### material组（N1,N2,N4,N7,N8,N9,N10,N11,N15）

| 候选对 | 策略命中 | 得分 |
|--------|---------|------|
| N9(石墨负极) vs N10(人造石墨) | 子串包含？不（"石墨负极"不包含"人造石墨"，反之亦然）。共同邻居？两者都连N13磷酸铁锂电芯，Jaccard=1/(1+1)=0.5（都只连一个共同邻居N13，但各有其他邻居吗？N9只连N13，N10没有边！因为N10未被连接）。所以共同邻居Jaccard低。编辑距离：4字vs4字，"石墨负极"vs"人造石墨"编辑距离=3/4=0.25，不触发。ID相似：material-graphite-anode vs material-artificial-graphite，不相似。 | **综合分<0.6，不进候选？** ⚠️ |

Wait——这里发现一个问题！N9(石墨负极)和N10(人造石墨)名称差异较大（不含相同前缀后缀），按纯字符串策略分数低，但它们是父子关系。**这暴露了候选检测的一个盲区：仅凭字符串相似度无法识别语义上的父子关系/同物异名。**

不过——N10(parent_type=null)和N9之间没有字符串相似，N10也没有raw_material_for边连到N13（电芯），所以：
- 在现有规则下N9 vs N10分数低可能**漏检**
- 但N3(权威来源验证)阶段有没有补救？

让我重新看——N10的definition写的是"是目前锂电池石墨负极的主流类型"，这是强语义线索，但纯字符串策略捕捉不到。这确实是个问题。

继续看其他候选：

| 候选对 | 策略命中 | 得分 |
|--------|---------|------|
| N11(电池隔膜) vs N12(隔膜) | ⚠️ node_type不同：N11是material，N12是product | **跨类型不比较！** |

又是一个问题！N12故意标成product，真实应该是material。按"仅同类型比较"规则，这对被过滤，**漏检**！

| 候选对 | 策略命中 | 得分 |
|--------|---------|------|
| N5(光伏组件) vs N16(地面用晶体硅光伏组件总规范) | 子串包含："光伏组件"包含在"地面用晶体硅光伏组件总规范"中，长度差>>4，按规则权重0.6但长度差>4所以子串包含不触发？文档名处理是N3阶段的事，N2阶段只按字符串。norm_name是"地面用晶体硅光伏组件"，包含"光伏组件"，长度差=11-4=7>4，所以按规则不触发子串包含策略。**可能漏检？** | 综合分低 |

| 候选对 | 策略命中 | 得分 |
|--------|---------|------|
| N13(磷酸铁锂电芯) vs N14(电池包) | 否 | <0.6 |
| N1(多晶硅料) vs N2(硅片) | 无相似 | <0.6 |
| N8(磷酸铁锂正极材料) vs N7(碳酸锂) | 无相似 | <0.6 |
| 其他material对 | 无命中 | <0.6 |

#### product组（N3,N5,N12,N13,N14,N16）

| 候选对 | 策略命中 | 得分 |
|--------|---------|------|
| N5(光伏组件) vs N16(地面用晶体硅光伏组件) | 子串包含"光伏组件"，长度差=7-4=3≤4！权重0.6 | **0.6**（中置信度） |
| N12(隔膜) vs 其他product | 无特别相似 | <0.6 |
| N3 vs N5 | "光伏电池片"vs"光伏组件"，共同前缀"光伏"，但长度差≤4，子串不包含 | 共同前缀命中不了现策略，编辑距离=4/5=0.2，低 | <0.6 |
| N13 vs N14 | "磷酸铁锂电芯"vs"电池包"，无相似 | <0.6 |

**N2阶段候选检测结果**：
- **候选对1**：N5 vs N16，得分0.6（中置信度）✅
- **漏检1**：N9 vs N10（石墨负极vs人造石墨）——字符串差异大但语义是父子关系
- **漏检2**：N11 vs N12（电池隔膜vs隔膜）——因**node_type不一致**（material vs product）被过滤
- **漏检3**：N16作为文档名，在N2阶段只与N5弱匹配，但实际上应该在N3权威验证阶段通过is_document_title标记+剥离匹配处理

**⚠️ 发现方案漏洞A**：候选检测阶段"仅同node_type比较"规则过严。当不同来源对同一物质的类型标注不一致（一个叫material一个叫product），会导致同物异名被漏检。

**修正建议**：候选检测阶段放宽到允许**相近类型比较**——material和product在中文语境里经常混用（"电池隔膜"是材料，有时也被称作产品），应该允许跨material/product比较，但权重降档（如系数0.7）。industry/equipment/process类型保持严格不跨类型。

**⚠️ 发现方案漏洞B**：仅凭字符串相似度无法捕捉definition中明确表述的"是XX的子类/又名/简称"关系。

**修正建议**：N2阶段增加一个**definition语义线索策略**——解析definition中出现的模式：
- "是XX的子类/主流类型/一种" → 候选parent_child对
- "又名XX/简称XX/俗称XX/行业称XX" → 候选merge对（如果XX能匹配到其他节点name）
- "即XX/也就是XX/亦称XX" → 候选merge对

这个策略不需要NLP，简单正则匹配中文提示词即可，对人工撰写的definition非常有效。

---

### 阶段N3：权威来源验证

按方案中的判词表执行：

**N5 vs N16（光伏组件 vs 地面用晶体硅光伏组件总规范）**：
- N16.source_type=standard，is_document_title=true
- norm_name剥离文档后缀后="地面用晶体硅光伏组件"
- 这仍比N5 name"光伏组件"长，"地面用晶体硅"是技术修饰词
- 判词：这是国标对**具体一类**光伏组件（地面用、晶体硅类）的规范，不是整个光伏组件的通用名
- **结论**：不是merge，是parent_child候选（地面用晶体硅光伏组件是光伏组件的子类）
- 但N16是文档名而非实体名，正确处理应是：将N16标记为review（建议降级为source引用，不保留为图节点），文档全名作为N5的contextual_name(gb_standard)
- **决策**：manual_review（降级为source的建议），因为需要人确认是否要建立"晶体硅光伏组件"子节点

Wait——这暴露了一个问题：N16本身描述的是"一个标准文档"，不是"一个实体"。方案中说"若剥离后无匹配且definition<5字→review建议降级"，但N16的definition有完整描述（"GB/T 9535-2018规定的..."），不会被<5字规则触发。需要改进文档名识别。

**⚠️ 发现方案漏洞C**：文档名节点判定条件不够充分。definition以"国家标准""GB/T""规定...技术要求""规范规定"等开头/结尾的节点，即使definition很长，也应该标记为"标准文档引用"而非实体节点。

**N9 vs N10（石墨负极 vs 人造石墨）**：
- 两者都来自industry_report（不是判词级权威）
- N10.definition明确说"是目前锂电池石墨负极的主流类型"——这是文本线索
- 如果采用漏洞B的修正（definition语义线索策略），这里会在N2阶段被候选检测命中（parent_child候选）
- 在N3阶段：无国标/统计局判词直接覆盖（数据中未引入石墨分类国标）
- **结论**：manual_review（中置信度parent_child），在报告中列出definition证据，由人确认
- 如果有判词修正：假设我们通过联网查到GB/T 30835-20XX定义"锂电池负极分为人造石墨类、天然石墨类..."，则直接判parent_child

**N11 vs N12（电池隔膜 vs 隔膜）**：
- 采用漏洞A修正后（允许material/product弱比较），进入权威验证
- N12.sources=[{type: cninfo}]，是线索级不是判词级
- N11.sources=[{type: industry_report}]，也是线索级
- 没有直接判词覆盖
- 但N12.definition="电池中用于隔离正负极的微孔薄膜"——明确指向电池隔膜，与N11.definition语义高度重叠
- N11已有alias "锂电隔膜"，"隔膜"是更短的简称
- **风险点**："隔膜"是否可能指别的？本测试数据中没有其他隔膜节点（如工业隔膜、隔膜阀），但真实数据里会有
- **决策**：在本测试数据中，manual_review，建议merge（因为definition明确指电池隔膜），name="电池隔膜"，"隔膜"作为alias(context="电池行业简称")
- 若真实数据中存在其他"隔膜"类节点 → 判not_duplicate，N12应明确命名为"电池隔膜"

**处理N12的类型错误**：merge时主节点是N11(material)，所以N12被合并后节点类型以主节点为准(material)，N12之前错误的product类型会被消除。

**N4(EVA胶膜)简称识别**：
- name本身包含"EVA"，但alias没填"EVA"
- 现有方案中alias填充主要依靠权威来源和上下文推断，N4的EVA识别依赖：name中首字母大写英文缩写常见模式
- **结论**：建议在N5命名分层阶段增加英文缩写自动识别（name中含连续大写英文+中文，英文部分作为alias候选）

---

### 阶段N4：联网验证（可选）

本测试假设无网络，跳过。所有中置信度候选维持manual_review。

---

### 阶段N5：命名分层

对每个节点确定name/aliases/contextual_names/chains/primary_chain：

| 节点 | name | aliases新增 | contextual_names | chains | primary_chain | 决策依据 |
|------|------|------------|-----------------|--------|--------------|---------|
| N1 多晶硅料 | 多晶硅料 | ["多晶硅"(已有)] | — | [pv_chain] | pv_chain | 类型material但来源只有pv，按来源链 |
| N2 硅片 | 硅片 | — | — | [pv_chain] | pv_chain | 同上 |
| N3 光伏电池片 | 光伏电池片 | ["电池片"] | — | [pv_chain] | pv_chain | "电池片"是光伏行业简称，作alias |
| N4 EVA胶膜 | EVA胶膜 | ["EVA"] | — | [pv_chain] | pv_chain | EVA是行业通用简称 |
| N5 光伏组件 | 光伏组件 | ["光伏板"] | (battery_chain: "太阳能板") | [pv_chain,battery_chain] | pv_chain | 行业通用名最短；battery_chain/民用场景叫"太阳能板"；跨链 |
| N6 层压机 | 层压机 | — | — | [pv_chain] | pv_chain | 设备主要服务光伏 |
| N7 碳酸锂 | 碳酸锂 | ["电池级碳酸锂"] | — | [battery_chain] | battery_chain | |
| N8 磷酸铁锂正极材料 | 磷酸铁锂正极材料 | ["LFP正极","铁锂正极"] | — | [battery_chain] | battery_chain | 行业简称 |
| N9 石墨负极 | 石墨负极 | ["负极石墨"] | — | [battery_chain] | battery_chain | |
| N10 人造石墨 | 人造石墨 | — | — | [battery_chain]（待parent_child确认后） | battery_chain | |
| N11 电池隔膜 | 电池隔膜 | ["锂电隔膜"(已有),"隔膜"] | — | [battery_chain] | battery_chain | merge N12后"隔膜"加入alias |
| N12 隔膜 | (被merge到N11) | — | — | — | — | |
| N13 磷酸铁锂电芯 | 磷酸铁锂电芯 | ["LFP电芯","铁锂电芯"] | — | [battery_chain] | battery_chain | |
| N14 电池包 | 电池包 | ["锂电池包"] | — | [battery_chain,pv_chain] | battery_chain | 应用层节点，pv_chain通过applied_in连入 |
| N15 铝合金 | 铝合金 | — | — | [pv_chain,battery_chain] | **null** | 两链各1条边密度相等，无法自动判定，人工设定 |
| N16 国标文档 | (建议降级为source，不保留为节点) | — | (若保留，其全名作为N5的gb_standard contextual_name) | — | — | manual_review |

**⚠️ 发现问题**：
- N5的contextual_name(battery_chain, "太阳能板")——这个信息从哪里来？当前raw数据里N5没有battery_chain来源，它的sources只有pv行业报告，contextual_name(battery_chain="太阳能板")无法从现有数据自动推断。
- **这是一个重要认知**：contextual_names有两个来源——(a) 该节点在battery_chain数据中实际以"太阳能板"名字出现（即battery_chain的raw数据里有一个叫"太阳能板"的节点连到电池包）；(b) 人工或AI补充。
- 在当前测试数据中，battery_chain数据里并没有一个叫"太阳能板"的节点连到电池包，所以N5不会自动获得battery_chain的contextual_name。
- **修正理解**：contextual_names是**数据驱动**的，从不同来源/产业链数据中发现同一实体的不同叫法，不是凭空推断。如果要让"太阳能板"这个叫法被记录，必须在battery_chain数据（或民用/光储行业数据）中有节点以"太阳能板"名字出现，并通过消歧合并到N5。

**这意味着**：B3测试点（光伏组件→太阳能板）在当前"仅两条产业链数据"的场景下不会自动触发，除非battery_chain数据里真有"太阳能板"节点。这不是方案缺陷，而是正确的数据驱动行为。如果要测试跨链命名，需要在battery_chain数据里真的放一个"太阳能板"节点。

**更新测试数据**：增加一个N17节点测试跨链contextual_name：
```
N17 product-solar-panel  "太阳能板"  product  battery/cninfo来源
    def: "民用和光储场景对光伏发电组件的俗称，即光伏组件"
    sources: [{type: cninfo, desc: "某房车改装企业年报：车顶安装太阳能板供电"}]
    edges: N17→N14 applied_in（太阳能板应用于电池包储电）
```

这样pipeline才能识别N17和N5是同一实体，merge后"太阳能板"成为N5在battery_chain的contextual_name。

**验证修正**：更新后N5的contextual_names就有了数据驱动来源 ✅

N15(铝合金) primary_chain=null问题：这是正确的行为——当算法无法判断时不猜，留给人。符合"不擅自选边"原则。

**关于N3光伏电池片的alias"电池片"**：当前方案的alias自动填充需要识别"光伏电池片"在行业里简称"电池片"。但"电池片"在电池行业可能指电芯极片，存在歧义。所以不能自动加为全局alias，应该作为contextual_name(pv_chain)或带note的alias。

**修正**：歧义简称不应自动加入aliases，应该加入contextual_names并标记chain_id，或在aliases里加note说明歧义。

---

### 阶段N6：产业链归属

重新审视chains/primary_chain推断：

| 节点 | 来源链 | 邻居链分布 | chains | primary_chain |
|------|--------|-----------|--------|--------------|
| N1 多晶硅料 | pv | pv链邻居 | [pv_chain] | pv_chain |
| N5 光伏组件(+N17合并后) | pv + cninfo(battery) | pv链邻居+battery链邻居(N14) | [pv_chain,battery_chain] | pv_chain（主要来源链+边密度pv>battery） |
| N14 电池包 | battery | battery链邻居+pv链邻居(N5) | [battery_chain,pv_chain] | battery_chain |
| N15 铝合金 | 双来源 | pv(1边)+battery(1边)密度相等 | [pv_chain,battery_chain] | **null（人工设定）** |

**判断**：
- N5的primary_chain推断：来源数据主要来自pv，pv链中N5作为主轴核心节点（度>2），battery链中N5是支链节点（度=1，applied_in→N14），按"边连接密度最高的可切换链"规则，primary_chain=pv_chain正确 ✅
- N14对称，primary_chain=battery_chain正确 ✅
- N15在两链各只有1条raw_material_for边，密度完全相等，primary_chain=null正确 ✅

---

### 阶段N7：撞名检测

检查contextual_name是否撞名其他节点：

- 假设N5合并N17后contextual_name(battery_chain)="太阳能板"
- 检查是否有其他节点name/contextual_name="太阳能板"：无
- N11 merge N12后alias "隔膜"：是否有其他节点叫"隔膜"？在本测试中无，通过
- 真实数据中若有"工业隔膜""隔膜阀"等节点，会被撞名检测发现，标记review

✅ 本测试数据无撞名问题

---

### 阶段E1：关系提取

**来源边**：E1-E6,E8-E14,E15（E7/E12是重复对）+新增E16(太阳能板→电池包)
- N16(国标文档)被降级为source，不参与边生成
- N17(太阳能板)merge到N5后，其边E16重定向到N5，与E14(PV→battery-pack applied_in)形成重复边

**parent_type派生边**：
- N10 parent_type=N9（假设manual_review后确认人造石墨→石墨负极）
- node_type pair: material→material → 按PARENT_RELATION_MAP取can_be_processed_into
- 派生边：N10→N9 can_be_processed_into（人造石墨可加工为石墨负极？）等等，方向不对！

**⚠️ 发现方案漏洞D**：PARENT_RELATION_MAP的方向搞反了。parent_type的语义是"child.parent_type=parent"，即child是parent的子类。边方向应该是child→parent表示"is a kind of"或"subclass of"，但现有关联是parent→child的原料/加工关系。

再仔细想：人造石墨是石墨负极的一种（子类），石墨负极是父类。这种关系**不是**原料流向关系（人造石墨不是"加工成"石墨负极，人造石墨"就是"一种石墨负极）。parent_type表达的是**分类学关系**，不是**产业链流转关系**。

所以parent_type不应该派生raw_material_for/can_be_processed_into这类产业链流向边，而应该派生一种分类关系，或者根本不派生边（分类关系已经由parent_type字段表达）。

**修正**：parent_type派生边的规则需要重新审视——
- parent_type本身就是父子分类关系，在图遍历中可以通过parent_type字段直接访问，不需要再生成一条冗余边
- 当前merge-data.ts中generateBasicEdges的做法（为parent_type硬编码生成downstream_of/can_be_processed_into/applied_in边）是**错误的语义混淆**——分类关系≠产业链流转关系
- 正确做法：parent_type派生边应该是一种**分类学边**（如`is_subclass_of`或直接不生成边），不能复用产业链关系类型

**但**这引入一个新的RelationType：is_subclass_of（或类似分类关系）。是否需要新增？

**方案决策**：
1. **短期**：parent_type不派生产业链边（raw_material_for/can_be_processed_into/applied_in等），避免语义混乱。parent_type字段本身足够表达分类层级。
2. **中期**：新增`is_subclass_of`关系类型（flow=horizontal），用于明确的分类层级边，渲染层可以选择是否显示
3. **现有merge-data.ts的generateBasicEdges是错误的**，新pipeline需要修正

这是一个重要的bug修复！当前代码会生成错误方向/类型的边。

修正后本测试中N10→N9不自动生成产业链边，需要在数据中明确有"人造石墨 raw_material_for 磷酸铁锂电芯"这样的边（因为人造石墨确实是制造电芯的原料），而不是通过parent_type间接生成。

观察测试数据：N9(石墨负极)有边E9 raw_material_for→N13(电芯)，但N10(人造石墨)没有边连N13，这是数据缺失（因为人造石墨确实用于制造电芯）。pipeline不应该通过parent_type自动补这条边（可能出错），而是应该在报告中提示"N10无产业链边，且是N9的子类，是否需要补raw_material_for边？"作为review项。

---

### 阶段E2：关系流向标注

按RELATION_FLOW为每条边标注effective_flow：

| 边 | type | flow | source位置 | target位置 |
|----|------|------|-----------|-----------|
| E1 polysilicon→silicon-wafer | can_be_processed_into | upstream→downstream | 左 | 右 |
| E2 wafer→cell | can_be_processed_into | upstream→downstream | 左 | 右 |
| E3 cell→module | can_be_processed_into | upstream→downstream | 左 | 右 |
| E4 eva→module | applied_in | upstream→downstream | 左(EVA是组件封装投入) | 右 |
| E5 laminator→module | equipment_for | downstream→upstream | 右(层压机是设备，服务于组件生产) | 左 |
| E6 aluminum→module | raw_material_for | upstream→downstream | 左 | 右 |
| E7(+E12合并) carbonate→lfp-cathode | raw_material_for | upstream→downstream | 左 | 右 |
| E8 lfp→cell | can_be_processed_into | upstream→downstream | 左 | 右 |
| E9 graphite→cell | raw_material_for | upstream→downstream | 左 | 右 |
| E10 separator→cell | raw_material_for | upstream→downstream | 左 | 右 |
| E11 cell→pack | can_be_processed_into | upstream→downstream | 左 | 右 |
| E13 pack→aluminum made_of | made_of | downstream→upstream | 右(pack成品) | 左(aluminum原料) |
| E14(+E16合并) module→pack applied_in | applied_in | upstream→downstream | 左(组件作为储能输入) | 右(储能系统) |

**验证**：
- E5(equipment_for)正确识别为反向，层压机作为设备在布局时不会被错误地放到组件右侧
- E13(made_of)正确识别为反向，铝合金在电池包左侧 ✅
- E14(applied_in)按默认flow=upstream→downstream，光伏组件应用于储能，组件在左，储能在右——这在光储一体化视角下合理（光伏发电→储能）✅

---

### 阶段E3：重复边合并

E7和E12（carbonate→lfp-cathode raw_material_for）重复：
- evidence合并：[industry_report证据, cninfo证据]
- verification_status保持proposed（两个都是proposed）
- 输出为一条边，无冲突 ✅

E14和E16（module→pack applied_in，N17合并到N5后）重复：
- evidence合并
- 一条边 ✅

---

### 阶段E4：关系验证

- **端点存在**：E15的target material-copper-foil不存在 → **V2引用完整性失败，阻断apply** ✅
  - 处理：E15应被报告为错误边，人工确认是补节点material-copper-foil还是删除E15
- **类型合法**：所有relation_type在枚举中 ✅
- **流向无环（主轴）**：pv_chain主轴 E1-E2-E3 单向无环 ✅；battery_chain主轴 E7-E8-E11, E9-E11, E10-E11 无环 ✅
- **parent_type无环**：N10→N9无反向引用，无环 ✅
- **E13 made_of跨type检查**：product(pack) made_of material(aluminum)，合理 ✅
- **无merged节点端点**：N12和N17被合并后，其边(E16)已重定向到N5，不会指向merged节点 ✅

---

### 阶段V：验证层综合

| 验证项 | 结果 |
|--------|------|
| V1 Schema | 待类型扩展后通过 |
| V2 引用完整性 | E15悬空边 → **失败阻断** |
| V3 语义一致性 | N12类型错误(product vs material) → merge时以主节点类型修正；N10缺产业链边警告 |
| V4 流向无环 | 通过 |
| V5 撞名 | 本测试通过 |

**结论**：V2失败阻断apply，必须先修复E15（补铜箔节点或删除悬空边）才能继续。这是正确的安全行为。

假设人工修复E15（补N18 material-copper-foil "铜箔"节点，边E15有效），重新验证全部通过。

---

### 阶段R：审核报告输出

**auto-decisions摘要**：
- auto_merge: 2组（N11+N12电池隔膜合并、N5+N17光伏组件+太阳能板合并）
- auto_parent_child: 0组（N9+N10无权威判词，走manual_review）
- auto_not_duplicate: 0组
- manual_review: 2组（N9+N10父子关系确认、N16国标文档降级）
- edge_merge: 2组（E7+E12、E14+E16）
- edge_conflicts: 0
- validation_errors: 1（E15悬空边，修复后0）
- name_collisions: 0

**review-report.md包含**：
- 自动合并列表（含N11+N12依据、N5+N17依据）
- 父子关系建议（N9+N10，definition证据）
- 国标文档降级建议（N16）
- 悬空边错误（E15）
- 产业链归属预览（N15 primary_chain=null待设定）
- 命名变更预览（"隔膜"→alias, "太阳能板"→battery contextual_name）

---

### 阶段A：应用合并

人工确认review-report，修正决策后--apply：

1. 备份 ✅
2. N12 merged_into=N11，stage=merged；N11 merged_from=[N12]；"隔膜"加入N11.aliases
3. N17 merged_into=N5，stage=merged；N5 merged_from=[N17]；"太阳能板"成为N5.contextual_names(battery_chain)
4. N10 parent_type=N9（人工确认后）
5. N16降级处理：不合并为节点，其source信息附加到N5.sources；全名"地面用晶体硅光伏组件总规范"加入N5.contextual_names(gb_standard)
6. E15修复后，N18铜箔节点加入，E15有效
7. E7+E12合并，E14+E16合并（N17合并后E16 source重定向到N5，再与E14合并）
8. 更新所有updated_at
9. 全量验证通过
10. 输出resolved-graph-data.json

**合并后节点统计**：
- 输入17节点（N1-N17+N18）→ 输出15节点（N12/N17被merge，N16降级为source移除）
- 边：16-2重复+1(N10无产业链边，不加)=14条（E15保留，E12/E16合并）

---

## 三、十字交叉交互场景走查（DAL验证）

清洗完成后的数据，验证DAL能否支撑用户描述的交互场景。

**前置说明**：走查中发现ChainDef初版配置会产生"Y形主轴"（多个上游原料汇聚到同一节点），这是符合真实产业链结构的——光伏组件的上游确实既有硅料主线，也有铝合金、EVA等辅材并行输入。布局层需要处理同一跳多个节点的y轴偏移，数据层正确返回这种树状结构即可。同时走查也暴露了ChainDef需要调优的地方（见第五节补充观察）。

### 场景1：点击"光伏组件"(N5)，默认展开光伏链

| 交互查询 | DAL函数调用 | 预期结果 | 是否正确 |
|---------|-----------|---------|---------|
| 默认展开哪条链？ | getNodePrimaryChain("product-pv-module") | "pv_chain" | ✅ |
| 主轴上游节点（有序） | getMainAxisNodes("product-pv-module", "pv_chain").upstream | 跳1: [N3(光伏电池片, via can_be_processed_into), N15(铝合金, via raw_material_for)]<br>跳2: [N2(硅片, via can_be_processed_into←N3)]<br>跳3: [N1(多晶硅料, via can_be_processed_into←N2)]<br>（N15铝合金没有更上游的主轴边） | ⚠️ 见下方观察 |
| 主轴下游节点 | getMainAxisNodes("product-pv-module", "pv_chain").downstream | []（N5在pv_chain主轴末端，下游是光伏电站但本测试没放） | ✅ |
| 支链节点 | getBranchNodes(mainAxisSet, "pv_chain") | N4(EVA胶膜, via applied_in)、N6(层压机, via equipment_for) | ✅ |
| 真正的跨链支链节点 | branch nodes中primary_chain !== "pv_chain" | N14?不，N14是否在主轴？看E14: module→pack applied_in，applied_in在pv_chain.branch_relations中，所以N14(电池包)是支链节点！其primary_chain="battery_chain" → **N14是跨链支链节点** ✅ |
| N4显示名 | getDisplayName("material-eva-film", "pv_chain") | "EVA胶膜"（无pv_chain contextual_name，用name） | ✅ |
| N5自己显示名 | getDisplayName("product-pv-module", "pv_chain") | "光伏组件" | ✅ |
| 搜索"太阳能板"命中N5 | matchesSearch(N5, "太阳能板") | true（"太阳能板"在contextual_names中） | ✅ |
| 搜索"EVA"命中N4 | matchesSearch(N4, "EVA") | true（"EVA"在aliases中） | ✅ |

**⚠️ 重要观察**：getMainAxisNodes返回的主轴是一个**以中心节点为根的BFS树**，不一定是单线。N5的主轴上游有两条并行路径：
- 硅料路径：N1(多晶硅料)→N2(硅片)→N3(电池片)→N5（核心技术路径）
- 辅材路径：N15(铝合金)→N5（结构件路径）

这是数据层返回的正确结构，但对渲染层提出了要求：同一跳(rank)的多个节点需要沿y轴偏移排列，不能重叠。**数据层不负责y轴位置**，只返回按跳数分层的节点集合，具体偏移是布局层职责。

**🔍 ChainDef调优发现**：按初版ChainDef，raw_material_for全部在main_axis_relations中，导致铝合金辅材被拉入主轴。如果产品决策想让"主轴"严格对应核心技术路径（硅→硅片→电池→组件），铝合金/EVA/玻璃等辅材应该作为支链。有两种调优方案：
- 方案a：main_axis_relations只保留`can_be_processed_into`（核心加工转化），raw_material_for降级到branch_relations。但这样碳酸锂→磷酸铁锂(原料)也会被踢出电池链主轴，不合理。
- 方案b：不按relation_type一刀切，而是通过边的属性或子图遍历权重决定主轴。这需要未来引入"主路径权重"概念，v2阶段暂不做。
- **结论**：初版ChainDef配置（raw_material_for在主轴）可接受，产生Y形主轴是真实的，布局层处理并行分支即可。后续ChainDef可根据实际展示效果迭代。

**补充**：getMainAxisNodes返回**按跳数分层的有序结构**（`upstream: Array<Array<nodeId>>`，外层按跳数，内层同跳节点），布局层以此决定x坐标（rank）和y偏移。

### 场景2：点击跨链支链节点N14(电池包)，切换到battery_chain视角

N14(电池包)在pv_chain下是支链节点（通过E14 applied_in连入），其primary_chain="battery_chain"。按照交互设计，点击primary_chain !== currentChainId的支链节点应触发视角切换。

| 交互查询 | 预期结果 | 是否正确 |
|---------|---------|---------|
| N14的primary_chain | "battery_chain" | ✅ |
| 渲染层切换全局currentChainId="battery_chain" | 交互层行为 | ✅ |
| N14在battery_chain的主轴上游（按跳分层） | 跳1:[N13(磷酸铁锂电芯, via can_be_processed_into←N14), N15(铝合金, via made_of反向→N14)]<br>跳2(从N13):[N8(磷酸铁锂正极, via can_be_processed_into←N13), N9(石墨负极, via raw_material_for←N13), N11(电池隔膜, via raw_material_for←N13)]<br>跳3(从N8):[N7(碳酸锂, via raw_material_for←N8)]<br>N15(铝合金)无更上游主轴边 | ✅ |
| N14在battery_chain的主轴下游 | []（本测试N14是末端） | ✅ |
| N14在battery_chain的支链节点 | N5(光伏组件/太阳能板, via E14 applied_in反向——因为applied_in在battery_chain.branch_relations中) | ✅ |
| N5显示名（切换后） | getDisplayName("product-pv-module", "battery_chain")="太阳能板" | ✅（N5在battery_chain有contextual_name"太阳能板"） |
| N5角色判定（核心验证） | classifyEdgeForChain(E14, "battery_chain", mainAxisSet):<br>E14.relation_type=applied_in ∈ battery_chain.branch_relations（不在main_axis）<br>E14.target=N14在主轴，source=N5不在主轴 → E14是支链边 → **N5在battery_chain下是支链节点（隐约可见）** | ✅ 完美匹配"跨链节点隐约可见"的交互！ |

**🎯 核心验证成功**：
- pv_chain视角：N5(光伏组件)是主轴中心，N14(电池包)是隐约可见的跨链支链
- 点击N14 → 切换到battery_chain视角
- battery_chain视角：N14(电池包)是主轴中心，N5(太阳能板)变成隐约可见的跨链支链
- 名称随视角自动切换：光伏组件↔太阳能板
- 两条链通过E14(applied_in)形成十字交叉：X轴是各自的主轴，交叉点就是视角切换的"虫洞"

这完全吻合用户描述的十字交叉交互模型 ✅

### 场景3：N15(铝合金)双归属节点的行为

N15同时在pv_chain和battery_chain的主轴中（pv: E6 raw_material_for, battery: E13 made_of反向），primary_chain=null。

| 交互查询 | pv_chain视角下 | battery_chain视角下 |
|---------|---------------|-------------------|
| 角色 | 主轴上游节点（跳1辅材） | 主轴上游节点（跳1结构材） |
| 显示名 | "铝合金"（两链都无contextual_name，均显示name） | "铝合金" |
| 点击后行为 | primary_chain=null → 不自动切换视角（交互层决定：flyTo或弹出选择） | 同左 |

**这是正确行为**：共用材节点不属于任何单一链，在两个视角都出现在主轴但不触发视角切换。数据层返回primary_chain=null明确告知渲染层这一点 ✅

### 场景4：搜索测试（battery_chain视角下）

| 查询 | 命中节点（按排序） | 排序依据 | 正确 |
|------|------------------|---------|------|
| "隔膜" | [N11(显示为"电池隔膜")] | N11.aliases含"隔膜"，唯一命中 | ✅ |
| "太阳能板" | [N5(显示为"太阳能板")] | N5.contextual_names(battery_chain)匹配 → 高优先 | ✅ |
| "电池" | [N14(电池包), N11(电池隔膜), N13(磷酸铁锂电芯)...] | N14.name精确包含"电池" > 其他name包含 > alias/contextual匹配 | ✅ |
| "EVA" | [N4(EVA胶膜)] | N4.aliases含"EVA" | ✅ |
| "PE" | 无结果 | 本测试无聚乙烯节点 | ✅ |
| "铝合金" | [N15(铝合金)] | name精确匹配 | ✅ |

搜索排序逻辑正确 ✅

### 场景5：边方向验证（关键易出错点）

| 边 | type | 存储方向 | effective_flow | 布局主轴方向 | 正确 |
|----|------|---------|----------------|------------|------|
| E5 laminator→module | equipment_for | 设备→成品 | downstream→upstream | target(组件)在右，source(层压机)在左？**不对**——flow是downstream_to_upstream，即source在下游（右），target在上游（左）。层压机是组件生产的设备，层压机服务于组件，组件生产是核心流向，层压机是支链（非主轴）| equipment_for在pv_chain.branch_relations中 → E5是支链边，不参与主轴方向计算，沿Y/Z轴排布即可 | ✅ |
| E6 aluminum→module | raw_material_for | 铝合金→组件 | upstream→downstream | 铝在左(上游)，组件在右(下游) | ✅ 主轴方向正确 |
| E13 pack→aluminum | made_of | 电池包→铝合金 | downstream→upstream | 电池包(source,成品)在右，铝合金(target,原料)在左 | ✅ 在battery_chain中made_of是main_axis关系，方向正确 |
| E14 module→pack | applied_in | 组件→电池包 | upstream→downstream | 组件(光伏输入)在左，电池包(储能应用)在右 | ✅ 但applied_in在两链都是branch关系，这条边在两链都是支链边，构成十字交叉的"桥梁" |

**关键验证E13**：made_of方向是反向边，`电池包 made_of 铝合金`存储为source=电池包、target=铝合金。按RELATION_FLOW=downstream_to_upstream，source(电池包)在下游(右)，target(铝合金)在上游(左)。布局时铝合金在电池包左侧——这是正确的，铝合金是原料在上游。

**关键验证E14**：applied_in方向是正向，`光伏组件 applied_in 电池包`存储为source=组件、target=电池包。RELATION_FLOW=upstream_to_downstream，组件在左(上游)，电池包在右(下游)。这条边虽然在两链都是支链边，但它正确地连接了两条主轴，成为十字交叉的桥梁。

---

## 四、发现的问题汇总与修正方案

走查中发现了**4个方案漏洞**和**3个需要明确的边界**：

### 漏洞A：候选检测仅比较同node_type导致类型标注错误的同物异名漏检

**问题**：N11(material 电池隔膜) vs N12(product 隔膜) 因类型不同被过滤。
**修正**：候选检测阶段允许 material↔product 跨类型比较（权重系数0.7），其他类型组合保持严格；或者候选检测阶段node_type不一致的候选标记为`type_conflict`进入manual_review而非直接丢弃。

### 漏洞B：字符串相似度无法捕捉definition中的明确语义线索

**问题**：N10(人造石墨) definition明确说"是石墨负极的主流类型"，但纯字符串策略无法识别这是父子关系。
**修正**：N2阶段增加`definition_patterns`策略——用中文模式词正则匹配：
- `/是(.+)的(子类|主流类型|一种|分支|细分)/` → parent_child候选
- `/又名|简称|俗称|亦称|也称|行业称|俗称(.+)/` → merge候选
- `/即|也就是|亦即(.+)/` → merge候选
匹配到的术语若能在节点列表中找到对应name/alias，作为候选对加入。

### 漏洞C：文档名识别条件不充分

**问题**：N16(国标总规范) definition较长，不满足"definition<5字"的降级触发条件，但本质仍是文档名而非实体节点。
**修正**：文档名识别增加多重信号：
- source_type=standard + name含"规范/标准/规程/方法/技术条件"后缀 → is_document_title
- definition包含"GB/T""国家标准""规定了...的技术要求""规定了...的试验方法" → 加`is_standard_document`强标记
- 对is_document_title+is_standard_document的节点默认建议降级为source引用，原始全名作为被引用实体的gb_standard contextual_name

### 漏洞D（严重）：parent_type派生边逻辑错误，混淆了分类关系和产业链流转关系

**问题**：现有merge-data.ts的generateBasicEdges为parent_type硬编码生成downstream_of/can_be_processed_into/applied_in边，这是语义错误——分类关系(is-a)≠产业链流转(part-of/used-for)。
**修正**：
1. parent_type字段本身表达分类层级，**不自动派生产业链边**（raw_material_for等）
2. 新增relation_type `is_subclass_of`(flow=horizontal)用于显式分类边，但不强制生成
3. 新pipeline移除错误的generateBasicEdges逻辑
4. 对有parent_type但无产业链边的节点（如N10人造石墨），在报告中提示"该节点是XX的子类但无独立产业链边，请确认是否需要补充"，由人工确认，不猜测

### 边界明确

**边界1**：contextual_names必须数据驱动，不凭空推断。如果battery_chain数据里没有"太阳能板"名称的节点，N5就不会自动获得battery_chain contextual_name。这是正确行为，避免AI幻觉式填名。

**边界2**：primary_chain=null是合法状态，表示无法自动判断，必须人工设定，不猜。

**边界3**：material/product跨类型是唯一允许的跨类型候选比较，industry/equipment/process保持严格。理由：中文产业语境下"XX材料"和"XX产品"经常混用（隔膜/电极/箔材），但行业(industry)和设备(equipment)边界清晰。

### 其他改进点

1. **英文缩写自动识别**：name中"连续大写英文字母+中文"模式，英文部分自动作alias候选（加note）
2. **歧义简称处理**：可能跨领域歧义的简称（如"PC""隔膜"），不放入全局aliases，放入特定chain的contextual_names或带note的alias
3. **歧义检测**：alias.term等于其他节点的name时标记撞名警告
4. **getMainAxisNodes返回分层结构**：返回`{upstream: Array<Array<nodeId>>, downstream: Array<Array<nodeId>>}`——外层数组按到中心节点的跳数(rank)索引，内层数组是同一跳的节点集合（用于布局层x坐标定位和y偏移计算），而非扁平列表
5. **悬空边阻断apply**：V2验证失败阻断发布是正确行为，不放宽
6. **边角色判定统一封装**：`classifyEdgeForChain(edge, chainId, mainAxisSet)`应封装为DAL的核心辅助函数，返回`{role: 'main_axis'|'branch'|'cross_chain', direction: 'upstream'|'downstream'|'lateral', upstreamNode, downstreamNode}`——避免前端/布局层各自重新实现RELATION_FLOW方向逻辑导致方向错算（E5/E13/E14走查证明方向推理极易出错）
7. **跨链节点识别规则**：当边的两个端点primary_chain不同且边不在当前链的main_axis中，该边标记为cross_chain边；其远端节点标记为跨链节点（交互上做隐约可见/高亮可点击处理）
8. **ChainDef初版接受Y形主轴**：raw_material_for全在main_axis导致多个辅材并行进入主轴是可接受的v1行为，布局层处理同跳y偏移即可；v2再考虑主路径权重

---

## 五、方案可靠性评估

### 修复后方案对12个测试点的处理结果

| 编号 | 测试点 | 修复前结果 | 修复后结果 |
|------|--------|-----------|-----------|
| B1 | 电池隔膜 vs 隔膜（同物异名+类型不一致） | ❌ 漏检（类型不同过滤） | ✅ 跨类型候选→manual_review→建议merge |
| B2 | 石墨负极 vs 人造石墨（父子） | ❌ 漏检（字符串不相似） | ✅ definition线索→parent_child候选→manual_review确认 |
| B3 | 光伏组件→太阳能板（跨链语境名） | ⚠️ 无数据驱动无法推断 | ✅ 需battery链真有太阳能板节点→merge后contextual_name正确 |
| B4 | EVA胶膜→EVA（英文简称） | ⚠️ 无自动识别 | ✅ 英文缩写模式识别→alias候选 |
| B5 | 国标文档名误入节点 | ⚠️ 识别不充分 | ✅ 多信号文档识别→建议降级为source |
| B6 | 铝合金双归属 | ✅ primary_chain=null（人工设定） | ✅ 同左（正确行为） |
| B7 | made_of反向边方向 | ⚠️ 走查前方向推理易出错 | ✅ RELATION_FLOW机制正确，classifyEdgeForChain统一封装 |
| B8 | 重复边 | ✅ evidence合并 | ✅ 同左 |
| B9 | parent_type派生边 | ❌ 生成错误产业链边 | ✅ 不自动生成，改提示人工确认 |
| B10 | 悬空边 | ✅ V2阻断 | ✅ 同左 |
| B11 | 跨链支链节点视角切换 | ✅ 数据层完全支撑 | ✅ 光伏链↔电池链切换、名称切换、角色切换全部正确 |
| B12 | 主轴Y形结构(多上游汇聚) | ⚠️ 原设计默认单线链 | ✅ BFS分层返回支持树状主轴，布局层处理y偏移 |

### 十字交叉场景验证总结

通过5个交互子场景的逐一走查，数据层设计对用户描述的交互模型**完全支撑**：

| 交互行为 | 数据层支撑 | 结果 |
|---------|-----------|------|
| 点击节点默认展开主产业链 | getNodePrimaryChain → primary_chain字段 | ✅ |
| 主轴节点按顺序横向排列 | getMainAxisNodes按跳分层返回 | ✅ |
| 支链节点可见 | getBranchNodes返回支链集合 | ✅ |
| 跨链支链节点"隐约可见" | primary_chain !== currentChainId → 跨链标记 | ✅ |
| 点击跨链节点切换视角 | 渲染层用primary_chain切换currentChainId | ✅ |
| 切换后名称变为该产业链叫法 | getDisplayName(nodeId, chainId) → contextual_name优先 | ✅ |
| 切换后原中心节点变支链 | classifyEdgeForChain → 交叉边始终是branch角色 | ✅ |
| 搜索命中别名/语境名 | matchesSearch覆盖name/aliases/contextual_names | ✅ |

### 总体结论

1. **方案核心架构可靠**：流水线分层、判词原则、ChainDef、RelationFlow、三层命名体系、DAL接口设计都能正确支撑十字交叉场景。
2. **发现4个流水线漏洞**（A/B/C/D），其中D（parent_type派生边）是现有代码中真实存在的bug，A/B/C是候选检测和文档识别的盲区，都有明确修正方案，修正后不影响架构。
3. **发现3个交互支撑要点**（边角色统一封装、主轴分层结构、Y形主轴接受度），属于DAL实现细节补充，已在"其他改进点"中明确。
4. **12个测试点**（10个数据pipeline问题+2个交互场景问题）修复后全部通过。
5. **十字交叉交互核心场景走查通过**：光伏链(N5中心)→点击支链N14(电池包)→切换电池链(N14中心)→N5显示名为"太阳能板"且变为支链节点，整个流程数据层都能正确回答，与用户描述的交互完全吻合。
6. **安全机制有效**：V2引用完整性验证能阻断脏数据发布；dry-run默认+人工确认+备份+回滚机制可靠。
7. **ChainDef v1可接受**：Y形主轴是真实产业链结构的反映，布局层处理并行分支即可，v2再考虑主路径权重等优化。

### 建议优先级

- **P0（实施前必须修复）**：漏洞D（parent_type派生边逻辑错误）、漏洞A（跨类型候选比较）、扩展schema/types（NodeStage.merged, ChainDef等类型）
- **P1（首版pipeline应实现）**：漏洞B（definition语义线索）、漏洞C（文档名识别改进）、英文缩写识别、classifyEdgeForChain辅助函数、getMainAxisNodes分层返回结构
- **P2（可在迭代中完善）**：歧义简称检测、撞名警告增强、ChainDef主路径权重、跨链节点视觉标记辅助字段
