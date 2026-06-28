const fs = require('fs');
const path = require('path');

const TS = '2026-06-28T00:00:00Z';
const SRC_ENC = { source_type: 'encyclopedia', description: '维基百科/百度百科相关词条' };
const SRC_TXT = { source_type: 'textbook', description: '行业教材/工艺手册' };
const SRC_RPT = { source_type: 'industry_report', description: '券商行业研报产业链梳理' };

function node(id, name, type, def, ext, chains, primary, attrs) {
  const n = {
    id, name, node_type: type, definition: def, stage: 'reviewed',
    sources: [SRC_ENC, SRC_TXT, SRC_RPT].slice(0, type === 'equipment' ? 2 : 2),
    created_at: TS, updated_at: TS
  };
  if (ext) n.external_input = true;
  if (chains) n.chains = chains;
  if (primary) n.primary_chain = primary;
  if (attrs) n.attributes = attrs;
  return n;
}

function edge(id, src, tgt, type, note) {
  return {
    id, source: src, target: tgt, edge_type: type,
    verification_status: 'verified',
    evidence: [SRC_TXT],
    ...(note ? { note } : {}),
    created_at: TS, updated_at: TS
  };
}

const nodes = [];
const edges = [];

// ========== PV CHAIN SUBSTANCES (main) ==========
nodes.push(node('silica_sand','石英砂','substance','高纯度硅石（SiO₂），光伏产业链最上游硅质原料',true,['pv_chain'],'pv_chain'));
nodes.push(node('metallurgical_silicon','工业硅','substance','又称金属硅，由石英砂碳热还原冶炼得到，纯度约98-99%',false,['pv_chain'],'pv_chain'));
nodes.push(node('crude_trichlorosilane','粗三氯氢硅','substance','工业硅与氯化氢反应合成的粗产物，含杂质需精馏提纯',false,['pv_chain'],'pv_chain'));
nodes.push(node('pure_trichlorosilane','高纯三氯氢硅','substance','经精馏提纯后纯度达9N以上的三氯氢硅，用于多晶硅生产',false,['pv_chain'],'pv_chain'));
nodes.push(node('polysilicon','高纯多晶硅','substance','西门子法还原生产的高纯多晶硅料，纯度达9-11N，是拉制单晶硅的原料',false,['pv_chain'],'pv_chain'));
nodes.push(node('monocrystalline_ingot','单晶硅棒','substance','直拉法（CZ法）生长的圆柱形单晶硅棒，是硅片制造的基材',false,['pv_chain'],'pv_chain'));
nodes.push(node('silicon_square_brick','单晶硅方棒','substance','单晶硅棒经截断、开方后得到的方形硅棒，用于切片',false,['pv_chain'],'pv_chain'));
nodes.push(node('silicon_wafer','硅片','substance','硅方棒经金刚线切割及后续制绒、扩散、刻蚀、镀膜处理后的薄片，是电池片的基底',false,['pv_chain'],'pv_chain'));
nodes.push(node('solar_cell','光伏电池片','substance','硅片经印刷电极、高温烧结后形成的具有光伏发电功能的电池片',false,['pv_chain'],'pv_chain'));
nodes.push(node('cell_string','电池串','substance','多片电池片通过焊带串联焊接形成的电池串，是组件的中间单元',false,['pv_chain'],'pv_chain'));
nodes.push(node('module_layup','组件叠层件','substance','电池串与玻璃、EVA胶膜、背板按顺序叠放后的待层压组件',false,['pv_chain'],'pv_chain'));
nodes.push(node('laminated_module','层压件','substance','叠层件经真空层压后，EVA交联固化形成的层压件',false,['pv_chain'],'pv_chain'));
nodes.push(node('pv_module','光伏组件','substance','层压件装框、安装接线盒后的成品光伏组件，可直接用于发电系统',false,['pv_chain'],'pv_chain'));
nodes.push(node('pv_power_station','光伏电站','facility','由光伏组件、逆变器、支架、汇流箱、电缆等组成的光伏发电终端设施',false,['pv_chain'],'pv_chain'));

// ========== PV AUX SUBSTANCES ==========
nodes.push(node('carbon_reductant','碳还原剂','substance','工业硅冶炼用碳质还原剂，通常为石油焦、木炭、洗精煤等',true,['pv_chain'],'pv_chain'));
nodes.push(node('hydrogen_chloride','氯化氢','substance','化学式HCl，用于与工业硅反应合成三氯氢硅',true,['pv_chain'],'pv_chain'));
nodes.push(node('hydrogen_gas','氢气','substance','化学式H₂，用于西门子法还原三氯氢硅沉积多晶硅',true,['pv_chain'],'pv_chain'));
nodes.push(node('dopant','掺杂剂','substance','用于单晶硅掺杂的硼/磷族元素，调整硅晶体导电类型和电阻率',true,['pv_chain'],'pv_chain'));
nodes.push(node('argon_gas','氩气','substance','化学式Ar，直拉单晶过程中作为保护气氛使用',true,['pv_chain'],'pv_chain'));
nodes.push(node('silver_paste','银浆','substance','含银粉的导电浆料，印刷于电池片正面形成栅线电极',true,['pv_chain'],'pv_chain'));
nodes.push(node('aluminum_paste','铝浆','substance','含铝粉的导电浆料，印刷于电池片背面形成背电场和背电极',true,['pv_chain'],'pv_chain'));
nodes.push(node('pv_glass','光伏玻璃','substance','低铁超白压花钢化玻璃，覆盖于组件正面起透光和保护作用',true,['pv_chain'],'pv_chain'));
nodes.push(node('eva_film','EVA胶膜','substance','乙烯-醋酸乙烯酯共聚物胶膜，层压后交联固化粘结电池片与玻璃/背板',true,['pv_chain'],'pv_chain'));
nodes.push(node('backsheet','背板','substance','光伏组件背面的耐候绝缘保护层，通常为TPT/KPK等复合结构',true,['pv_chain'],'pv_chain'));
nodes.push(node('junction_box','接线盒','substance','安装于组件背面的电气连接装置，内含旁路二极管保护电池串',true,['pv_chain'],'pv_chain'));
nodes.push(node('sealant','密封胶','substance','用于铝边框与层压件之间、接线盒与背板之间的密封粘接硅胶',true,['pv_chain'],'pv_chain'));
nodes.push(node('mounting_structure','支架','substance','用于固定和支撑光伏组件或储能设备的金属结构件',true,['pv_chain','battery_chain'],'pv_chain'));
nodes.push(node('inverter','并网逆变器','substance','将光伏组件产生的直流电转换为交流电并并入电网的电力电子设备',true,['pv_chain'],'pv_chain'));
nodes.push(node('combiner_box','汇流箱','substance','将多路光伏组串直流电汇流后输出至逆变器的配电装置',true,['pv_chain'],'pv_chain'));

// Cross-chain metals
nodes.push(node('aluminum_ingot','电解铝','substance','电解法生产的铝锭，是铝型材、铝箔等铝加工材的上游原料，跨链共享节点',true,['pv_chain','battery_chain'],'pv_chain'));
nodes.push(node('copper_ingot','电解铜','substance','电解法精炼的阴极铜，是铜带、铜箔、电缆等铜加工材的上游原料，跨链共享节点',true,['pv_chain','battery_chain'],'pv_chain'));

// PV Al/Cu processing intermediates
nodes.push(node('copper_strip','铜带','substance','电解铜经轧制后得到的薄铜带，是焊带和电缆铜芯的原料',false,['pv_chain'],'pv_chain'));
nodes.push(node('aluminum_frame','铝边框','substance','铝合金型材经挤压成型、阳极氧化后制成的光伏组件边框',false,['pv_chain'],'pv_chain'));
nodes.push(node('solder_ribbon','焊带','substance','表面镀锡的铜带，用于电池片之间以及电池串与引出线之间的焊接连接',false,['pv_chain'],'pv_chain'));
nodes.push(node('pv_cable','光伏电缆','substance','光伏电站专用耐候铜芯电缆，用于组件间及组串至汇流箱/逆变器的电气连接',false,['pv_chain'],'pv_chain'));

// ========== PV PROCESSES ==========
nodes.push(node('smelting','工业硅冶炼','process','石英砂与碳还原剂在电弧炉中经高温碳热还原反应生产工业硅',false,['pv_chain'],'pv_chain'));
nodes.push(node('tcs_synthesis','三氯氢硅合成','process','工业硅粉与氯化氢在流化床反应器中反应合成粗三氯氢硅',false,['pv_chain'],'pv_chain'));
nodes.push(node('rectification','精馏提纯','process','利用粗三氯氢硅中各组分沸点差异，通过精馏塔分离提纯得到高纯三氯氢硅',false,['pv_chain'],'pv_chain'));
nodes.push(node('cvd_reduction','CVD还原（西门子法）','process','高纯三氯氢硅与氢气在西门子还原炉中化学气相沉积生长多晶硅',false,['pv_chain'],'pv_chain'));
nodes.push(node('crystal_pulling','直拉单晶','process','将多晶硅料在单晶炉中熔化，用直拉法生长单晶硅棒',false,['pv_chain'],'pv_chain'));
nodes.push(node('ingot_preparation','晶棒处理','process','单晶硅棒经截断、外径滚磨、开方等工序加工成方形硅棒',false,['pv_chain'],'pv_chain'));
nodes.push(node('wafer_slicing','硅片切割','process','使用金刚线将方形硅棒切割成规定厚度的薄硅片',false,['pv_chain'],'pv_chain'));
nodes.push(node('wafer_post_process','硅片后处理','process','硅片经制绒、扩散制结、周边刻蚀、减反射膜镀膜等处理',false,['pv_chain'],'pv_chain'));
nodes.push(node('cell_metallization','电池金属化','process','在硅片上丝网印刷银浆/铝浆电极，经高温烧结形成光伏电池片',false,['pv_chain'],'pv_chain'));
nodes.push(node('cell_stringing','电池串焊','process','使用串焊机将电池片通过焊带串联焊接成电池串',false,['pv_chain'],'pv_chain'));
nodes.push(node('lay_up','组件叠层','process','按照玻璃-EVA-电池串-EVA-背板顺序叠放成组件叠层件',false,['pv_chain'],'pv_chain'));
nodes.push(node('lamination','真空层压','process','将叠层件放入真空层压机加热使EVA熔融交联固化为层压件',false,['pv_chain'],'pv_chain'));
nodes.push(node('framing_jbox','装框与接线盒安装','process','给层压件安装铝边框打密封胶、安装接线盒完成光伏组件',false,['pv_chain'],'pv_chain'));
nodes.push(node('power_station_installation','光伏电站安装','process','将光伏组件安装在支架上，连接逆变器、汇流箱、电缆等建设光伏电站',false,['pv_chain'],'pv_chain'));
nodes.push(node('aluminum_extrusion','铝型材挤压','process','电解铝锭加热后通过挤压机挤压成型材制成铝边框',false,['pv_chain'],'pv_chain'));
nodes.push(node('copper_rolling','铜轧制','process','电解铜经轧制/拉丝加工成铜带',false,['pv_chain'],'pv_chain'));
nodes.push(node('tin_plating','镀锡','process','在铜带表面电镀锡层制成可焊接的光伏焊带',false,['pv_chain'],'pv_chain'));
nodes.push(node('cable_stranding','电缆绞合','process','将铜带绞合成铜芯导体制成光伏电缆',false,['pv_chain'],'pv_chain'));

// ========== PV EQUIPMENT ==========
nodes.push(node('electric_arc_furnace','电弧炉','equipment','利用电弧产生高温熔炼炉料的工业炉，用于工业硅冶炼',false,['pv_chain'],'pv_chain'));
nodes.push(node('fluidized_bed_reactor','流化床反应器','equipment','使硅粉呈流态化与氯化氢气体反应的反应器',false,['pv_chain'],'pv_chain'));
nodes.push(node('rectification_column','精馏塔','equipment','利用气液两相传质分离的塔设备，用于三氯氢硅精馏提纯',false,['pv_chain'],'pv_chain'));
nodes.push(node('siemens_reduction_furnace','西门子还原炉','equipment','西门子法多晶硅生产用化学气相沉积炉',false,['pv_chain'],'pv_chain'));
nodes.push(node('cz_crystal_puller','直拉单晶炉','equipment','Czochralski法直拉单晶硅生长设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('ingot_processing_machine','晶棒加工设备','equipment','单晶硅棒截断、滚磨、开方的专用加工设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('diamond_wire_slicer','金刚线切片机','equipment','使用金刚石涂层钢线切割硅棒的专用切片设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('cell_production_line','电池片生产线','equipment','硅片制绒、扩散、刻蚀、镀膜等连续自动化生产设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('screen_printer_sinter','丝网印刷烧结炉','equipment','丝网印刷机和高温烧结炉，用于电池片电极印刷与烧结',false,['pv_chain'],'pv_chain'));
nodes.push(node('stringer_soldering_machine','串焊机','equipment','自动将焊带焊接到电池片上串联成串的设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('lay_up_machine','叠层机','equipment','自动铺设玻璃、EVA、电池串、背板各层的叠层设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('vacuum_laminator','真空层压机','equipment','真空加热条件下将叠层件压合成一体的层压设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('framing_machine','装框机','equipment','自动给层压件安装铝边框并注胶的专用设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('construction_equipment','施工设备','equipment','电站建设用打桩机、起重机、混凝土设备等施工机械',false,['pv_chain','battery_chain'],'pv_chain'));
nodes.push(node('aluminum_extrusion_press','铝型材挤压机','equipment','将加热铝锭通过模具挤压成型材的液压挤压设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('copper_rolling_mill','铜轧机','equipment','将铜锭轧制成薄铜带的轧制设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('electroplating_line','电镀生产线','equipment','在铜带表面连续电镀锡层的自动化电镀设备',false,['pv_chain'],'pv_chain'));
nodes.push(node('stranding_machine','绞线机','equipment','将多根铜导体绞合成电缆芯的绞线设备',false,['pv_chain'],'pv_chain'));

// ========== BATTERY CHAIN SUBSTANCES (main) ==========
nodes.push(node('spodumene_ore','锂辉石原矿','substance','含锂矿物锂辉石的原矿石，是提锂的主要矿石原料',true,['battery_chain'],'battery_chain'));
nodes.push(node('lithium_concentrate','锂精矿','substance','锂辉石原矿经浮选后得到的高品位锂辉石精矿',false,['battery_chain'],'battery_chain'));
nodes.push(node('lithium_sulfate_solution','硫酸锂溶液','substance','锂精矿经硫酸焙烧浸出后得到的硫酸锂溶液，沉锂前中间产物',false,['battery_chain'],'battery_chain'));
nodes.push(node('lithium_carbonate','电池级碳酸锂','substance','化学式Li₂CO₃，电池级纯度99.5%以上，锂电池正极材料核心锂源',false,['battery_chain'],'battery_chain'));
nodes.push(node('lithium_hydroxide','电池级氢氧化锂','substance','化学式LiOH·H₂O，由碳酸锂苛化制得，用于高镍三元正极',false,['battery_chain'],'battery_chain'));
nodes.push(node('lfp_cathode','磷酸铁锂正极','substance','化学式LiFePO₄（LFP），橄榄石结构正极材料，安全性高成本低',false,['battery_chain'],'battery_chain'));
nodes.push(node('ncm_cathode','三元正极NCM','substance','镍钴锰酸锂（LiNiₓCoᵧMn_zO₂）三元层状正极材料',false,['battery_chain'],'battery_chain'));
nodes.push(node('artificial_graphite_anode','人造石墨负极','substance','以针状焦为原料经粉碎、造粒、碳化、石墨化制成的负极材料',false,['battery_chain'],'battery_chain'));
nodes.push(node('electrolyte','电解液','substance','锂盐(LiPF₆)溶解于有机溶剂并加添加剂形成的离子传导介质',false,['battery_chain'],'battery_chain'));
nodes.push(node('separator','隔膜','substance','聚乙烯(PE)/聚丙烯(PP)微孔膜，分隔正负极同时允许锂离子通过',false,['battery_chain'],'battery_chain'));
nodes.push(node('copper_foil','电解铜箔','substance','电解法生产的超薄铜箔（6-8μm），锂电池负极集流体',false,['battery_chain'],'battery_chain'));
nodes.push(node('aluminum_foil','铝箔','substance','电解铝轧制的超薄铝箔（10-15μm），锂电池正极集流体',false,['battery_chain'],'battery_chain'));
nodes.push(node('battery_cell','电芯','substance','正负极、隔膜、电解液经卷绕/叠片、注液、封装后的最小电化学单元',false,['battery_chain'],'battery_chain'));
nodes.push(node('battery_pack','动力电池包','substance','多个电芯经串并联组装、搭配BMS和热管理系统形成的电池包总成',false,['battery_chain'],'battery_chain'));
nodes.push(node('energy_storage_power_station','储能电站','facility','由动力电池包、储能变流器等组成的电化学储能终端设施',false,['battery_chain'],'battery_chain'));

// ========== BATTERY AUX SUBSTANCES ==========
nodes.push(node('sulfuric_acid','硫酸','substance','化学式H₂SO₄，用于锂辉石焙烧后的酸浸工序',true,['battery_chain'],'battery_chain'));
nodes.push(node('soda_ash','纯碱','substance','化学式Na₂CO₃，用于沉锂工序沉淀碳酸锂',true,['battery_chain'],'battery_chain'));
nodes.push(node('quicklime','生石灰','substance','化学式CaO，用于锂盐净化除杂工序',true,['battery_chain'],'battery_chain'));
nodes.push(node('iron_source','铁源','substance','LFP正极材料生产用铁源，通常为草酸亚铁或氧化铁',true,['battery_chain'],'battery_chain'));
nodes.push(node('phosphate_source','磷源','substance','LFP正极材料生产用磷源，通常为磷酸氢二铵或磷酸',true,['battery_chain'],'battery_chain'));
nodes.push(node('carbon_source_lfp','碳源（LFP用）','substance','LFP正极包覆用碳源，通常为葡萄糖、蔗糖等有机碳源',true,['battery_chain'],'battery_chain'));
nodes.push(node('nickel_sulfate','硫酸镍','substance','化学式NiSO₄，三元正极NCM的镍源前驱体',true,['battery_chain'],'battery_chain'));
nodes.push(node('cobalt_sulfate','硫酸钴','substance','化学式CoSO₄，三元正极NCM的钴源前驱体',true,['battery_chain'],'battery_chain'));
nodes.push(node('manganese_sulfate','硫酸锰','substance','化学式MnSO₄，三元正极NCM的锰源前驱体',true,['battery_chain'],'battery_chain'));
nodes.push(node('needle_coke','针状焦','substance','各向异性优质焦炭，人造石墨负极主要原料',true,['battery_chain'],'battery_chain'));
nodes.push(node('coal_tar_pitch','煤沥青','substance','煤焦油蒸馏产物，人造石墨负极生产的粘结剂',true,['battery_chain'],'battery_chain'));
nodes.push(node('lipf6','六氟磷酸锂','substance','化学式LiPF₆，锂电池电解液最常用导电锂盐',true,['battery_chain'],'battery_chain'));
nodes.push(node('ec_dmc_emc_solvents','EC/DMC/EMC溶剂','substance','碳酸乙烯酯/二甲酯/甲乙酯等有机溶剂混合物',true,['battery_chain'],'battery_chain'));
nodes.push(node('electrolyte_additives','电解液添加剂','substance','VC、FEC等成膜添加剂及其他功能性添加剂',true,['battery_chain'],'battery_chain'));
nodes.push(node('pe_resin','PE树脂','substance','聚乙烯树脂，隔膜生产的基础原料',true,['battery_chain'],'battery_chain'));
nodes.push(node('ceramic_coating','陶瓷涂层材料','substance','氧化铝、勃姆石等陶瓷涂覆材料，提高隔膜耐热性',true,['battery_chain'],'battery_chain'));
nodes.push(node('conductive_agent','导电剂','substance','导电炭黑/碳纳米管/石墨烯等，构建电极导电网络',true,['battery_chain'],'battery_chain'));
nodes.push(node('pvdf_binder','PVDF粘结剂','substance','聚偏氟乙烯，正极浆料常用粘结剂',true,['battery_chain'],'battery_chain'));
nodes.push(node('cmc_sbr_binder','CMC/SBR粘结剂','substance','羧甲基纤维素钠/丁苯橡胶组合，负极水性粘结剂体系',true,['battery_chain'],'battery_chain'));
nodes.push(node('nmp_solvent','NMP溶剂','substance','N-甲基吡咯烷酮，正极PVDF浆料的溶剂',true,['battery_chain'],'battery_chain'));
nodes.push(node('tab_material','极耳','substance','电芯正负极引出的金属导电端子',true,['battery_chain'],'battery_chain'));
nodes.push(node('aluminum_laminated_film','铝塑膜','substance','尼龙/铝箔/PP复合膜，软包电芯封装材料',true,['battery_chain'],'battery_chain'));
nodes.push(node('steel_case','钢壳','substance','镀镍钢壳，圆柱电芯封装外壳',true,['battery_chain'],'battery_chain'));
nodes.push(node('aluminum_case','铝壳','substance','铝合金拉伸壳，方形电芯封装外壳',true,['battery_chain'],'battery_chain'));
nodes.push(node('battery_bms','电池管理系统','substance','BMS，监控电池状态并进行均衡保护的电子控制系统',true,['battery_chain'],'battery_chain'));
nodes.push(node('thermal_management','热管理系统','substance','液冷板/风冷/相变材料等散热加热组件',true,['battery_chain'],'battery_chain'));
nodes.push(node('busbar','汇流排','substance','电池包内电芯间大电流连接用铜/铝导体排',true,['battery_chain'],'battery_chain'));
nodes.push(node('energy_storage_inverter','储能逆变器','substance','储能变流器(PCS)，实现电池直流与电网交流双向转换',true,['battery_chain'],'battery_chain'));

// ========== BATTERY PROCESSES ==========
nodes.push(node('mining_flotation','采矿浮选','process','锂辉石矿石经破碎磨矿后浮选富集得到锂精矿',false,['battery_chain'],'battery_chain'));
nodes.push(node('roasting_leaching','焙烧浸出','process','锂精矿经硫酸焙烧转型后水浸得到硫酸锂溶液',false,['battery_chain'],'battery_chain'));
nodes.push(node('precipitation','沉淀沉锂','process','硫酸锂溶液净化后加入纯碱沉淀得到碳酸锂',false,['battery_chain'],'battery_chain'));
nodes.push(node('causticization','苛化反应','process','碳酸锂经苛化反应转化为氢氧化锂',false,['battery_chain'],'battery_chain'));
nodes.push(node('lfp_sintering','LFP烧结','process','碳酸锂、铁源、磷源、碳源混合后高温烧结制备LFP正极',false,['battery_chain'],'battery_chain'));
nodes.push(node('ncm_sintering','NCM烧结','process','氢氧化锂与镍钴锰前驱体混合后高温烧结制备NCM正极',false,['battery_chain'],'battery_chain'));
nodes.push(node('graphite_processing','石墨加工','process','针状焦经粉碎、造粒、碳化、石墨化制备人造石墨负极',false,['battery_chain'],'battery_chain'));
nodes.push(node('electrolyte_mixing','电解液配制','process','锂盐溶解于混合有机溶剂并加入添加剂配制电解液',false,['battery_chain'],'battery_chain'));
nodes.push(node('separator_production','隔膜生产','process','PE树脂经挤出拉伸成孔，可选涂覆陶瓷涂层制备隔膜',false,['battery_chain'],'battery_chain'));
nodes.push(node('copper_foil_production','电解铜箔生产','process','电解铜经溶铜、生箔电解、表面处理生产电解铜箔',false,['battery_chain'],'battery_chain'));
nodes.push(node('aluminum_foil_production','铝箔轧制','process','电解铝经多道次冷轧轧制到目标厚度的电池铝箔',false,['battery_chain'],'battery_chain'));
nodes.push(node('cell_assembly','电芯装配','process','正负极匀浆涂布辊压分切后与隔膜卷绕/叠片、注液封装制成电芯',false,['battery_chain'],'battery_chain'));
nodes.push(node('formation_aging','化成分容','process','电芯首次充电活化、老化、容量检测分选',false,['battery_chain'],'battery_chain'));
nodes.push(node('pack_assembly','电池包组装','process','电芯经模组串并联、安装BMS、热管理、汇流排组装为电池包',false,['battery_chain'],'battery_chain'));
nodes.push(node('storage_installation','储能电站安装','process','将动力电池包、储能逆变器等设备集成安装建设储能电站',false,['battery_chain'],'battery_chain'));

// ========== BATTERY EQUIPMENT ==========
nodes.push(node('flotation_machine','浮选机','equipment','利用气泡浮选分离矿物的选矿设备',false,['battery_chain'],'battery_chain'));
nodes.push(node('rotary_kiln','回转窑','equipment','倾斜旋转的圆筒形煅烧设备，用于锂精矿硫酸焙烧',false,['battery_chain'],'battery_chain'));
nodes.push(node('precipitation_reactor','沉淀反应釜','equipment','带搅拌的耐腐蚀反应釜，用于沉锂反应',false,['battery_chain'],'battery_chain'));
nodes.push(node('causticization_reactor','苛化反应釜','equipment','碳酸锂苛化制备氢氧化锂的专用反应设备',false,['battery_chain'],'battery_chain'));
nodes.push(node('lfp_sintering_furnace','LFP烧结炉','equipment','惰性气氛高温烧结LFP正极材料的辊道窑',false,['battery_chain'],'battery_chain'));
nodes.push(node('ncm_sintering_furnace','NCM烧结炉','equipment','氧气气氛高温烧结NCM正极材料的辊道窑',false,['battery_chain'],'battery_chain'));
nodes.push(node('graphitization_furnace','石墨化炉','equipment','2800-3000℃高温将碳材料石墨化的艾奇逊炉',false,['battery_chain'],'battery_chain'));
nodes.push(node('electrolyte_mixing_tank','电解液搅拌釜','equipment','干燥气氛下搅拌混合电解液组分的不锈钢反应釜',false,['battery_chain'],'battery_chain'));
nodes.push(node('separator_extrusion_line','隔膜挤出生产线','equipment','PE树脂挤出铸片、双向拉伸成孔的隔膜生产线',false,['battery_chain'],'battery_chain'));
nodes.push(node('copper_foil_machine','铜箔电解机','equipment','阴极辊表面电沉积铜箔的生箔机及后处理设备',false,['battery_chain'],'battery_chain'));
nodes.push(node('aluminum_foil_mill','铝箔轧机','equipment','将铝冷轧至超薄规格的多机架铝箔冷轧机',false,['battery_chain'],'battery_chain'));
nodes.push(node('cell_assembly_line','电芯装配线','equipment','匀浆、涂布、辊压、卷绕/叠片、注液、封装的电芯自动化线',false,['battery_chain'],'battery_chain'));
nodes.push(node('formation_aging_cabinet','化成柜','equipment','电芯首次充电化成及老化测试的多通道充放电设备',false,['battery_chain'],'battery_chain'));
nodes.push(node('pack_assembly_line','电池包组装线','equipment','电芯模组组装、BMS安装、PACK测试的自动化装配线',false,['battery_chain'],'battery_chain'));

// ========== PV EDGES: main chain flow ==========
function addFlow(inputs, proc, outputs) {
  inputs.forEach(s => edges.push(edge(`e_in_${s}_${proc}`, s, proc, 'input')));
  outputs.forEach(t => edges.push(edge(`e_out_${proc}_${t}`, proc, t, 'output')));
}
function addEquip(eq, proc) {
  edges.push(edge(`e_eq_${eq}_${proc}`, eq, proc, 'equipment_for'));
}
function addComp(parent, child) {
  edges.push(edge(`e_comp_${parent}_${child}`, parent, child, 'composed_of'));
}

// PV main chain
addFlow(['silica_sand','carbon_reductant'], 'smelting', ['metallurgical_silicon']);
addFlow(['metallurgical_silicon','hydrogen_chloride'], 'tcs_synthesis', ['crude_trichlorosilane']);
addFlow(['crude_trichlorosilane'], 'rectification', ['pure_trichlorosilane']);
addFlow(['pure_trichlorosilane','hydrogen_gas','argon_gas'], 'cvd_reduction', ['polysilicon']);
addFlow(['polysilicon','dopant','argon_gas'], 'crystal_pulling', ['monocrystalline_ingot']);
addFlow(['monocrystalline_ingot'], 'ingot_preparation', ['silicon_square_brick']);
addFlow(['silicon_square_brick'], 'wafer_slicing', ['silicon_wafer']);
addFlow(['silicon_wafer','dopant'], 'wafer_post_process', ['silicon_wafer']);
addFlow(['silicon_wafer','silver_paste','aluminum_paste'], 'cell_metallization', ['solar_cell']);
addFlow(['solar_cell','solder_ribbon'], 'cell_stringing', ['cell_string']);
addFlow(['cell_string','pv_glass','eva_film','backsheet'], 'lay_up', ['module_layup']);
addFlow(['module_layup'], 'lamination', ['laminated_module']);
addFlow(['laminated_module','aluminum_frame','junction_box','sealant'], 'framing_jbox', ['pv_module']);
addFlow(['pv_module','mounting_structure','inverter','combiner_box','pv_cable'], 'power_station_installation', ['pv_power_station']);

// PV Al/Cu processing
addFlow(['aluminum_ingot'], 'aluminum_extrusion', ['aluminum_frame']);
addFlow(['copper_ingot'], 'copper_rolling', ['copper_strip']);
addFlow(['copper_strip'], 'tin_plating', ['solder_ribbon']);
addFlow(['copper_strip'], 'cable_stranding', ['pv_cable']);

// PV equipment
addEquip('electric_arc_furnace','smelting');
addEquip('fluidized_bed_reactor','tcs_synthesis');
addEquip('rectification_column','rectification');
addEquip('siemens_reduction_furnace','cvd_reduction');
addEquip('cz_crystal_puller','crystal_pulling');
addEquip('ingot_processing_machine','ingot_preparation');
addEquip('diamond_wire_slicer','wafer_slicing');
addEquip('cell_production_line','wafer_post_process');
addEquip('screen_printer_sinter','cell_metallization');
addEquip('stringer_soldering_machine','cell_stringing');
addEquip('lay_up_machine','lay_up');
addEquip('vacuum_laminator','lamination');
addEquip('framing_machine','framing_jbox');
addEquip('construction_equipment','power_station_installation');
addEquip('aluminum_extrusion_press','aluminum_extrusion');
addEquip('copper_rolling_mill','copper_rolling');
addEquip('electroplating_line','tin_plating');
addEquip('stranding_machine','cable_stranding');

// PV composed_of
addComp('pv_module','pv_glass');
addComp('pv_module','eva_film');
addComp('pv_module','solar_cell');
addComp('pv_module','backsheet');
addComp('pv_module','aluminum_frame');
addComp('pv_module','junction_box');
addComp('pv_module','solder_ribbon');
addComp('pv_power_station','pv_module');
addComp('pv_power_station','mounting_structure');
addComp('pv_power_station','inverter');
addComp('pv_power_station','combiner_box');
addComp('pv_power_station','pv_cable');
addComp('cell_string','solar_cell');
addComp('cell_string','solder_ribbon');
addComp('module_layup','pv_glass');
addComp('module_layup','eva_film');
addComp('module_layup','cell_string');
addComp('module_layup','backsheet');
addComp('laminated_module','pv_glass');
addComp('laminated_module','eva_film');
addComp('laminated_module','solar_cell');
addComp('laminated_module','backsheet');
addComp('laminated_module','solder_ribbon');

// ========== BATTERY EDGES: main chain flow ==========
addFlow(['spodumene_ore'], 'mining_flotation', ['lithium_concentrate']);
addFlow(['lithium_concentrate','sulfuric_acid'], 'roasting_leaching', ['lithium_sulfate_solution']);
addFlow(['lithium_sulfate_solution','soda_ash','quicklime'], 'precipitation', ['lithium_carbonate']);
addFlow(['lithium_carbonate'], 'causticization', ['lithium_hydroxide']);
addFlow(['lithium_carbonate','iron_source','phosphate_source','carbon_source_lfp'], 'lfp_sintering', ['lfp_cathode']);
addFlow(['lithium_hydroxide','nickel_sulfate','cobalt_sulfate','manganese_sulfate'], 'ncm_sintering', ['ncm_cathode']);
addFlow(['needle_coke','coal_tar_pitch'], 'graphite_processing', ['artificial_graphite_anode']);
addFlow(['lipf6','ec_dmc_emc_solvents','electrolyte_additives'], 'electrolyte_mixing', ['electrolyte']);
addFlow(['pe_resin','ceramic_coating'], 'separator_production', ['separator']);
addFlow(['copper_ingot'], 'copper_foil_production', ['copper_foil']);
addFlow(['aluminum_ingot'], 'aluminum_foil_production', ['aluminum_foil']);
addFlow(['lfp_cathode','ncm_cathode','artificial_graphite_anode','electrolyte','separator','copper_foil','aluminum_foil','conductive_agent','pvdf_binder','cmc_sbr_binder','nmp_solvent','tab_material','aluminum_laminated_film','steel_case','aluminum_case'], 'cell_assembly', ['battery_cell']);
addFlow(['battery_cell'], 'formation_aging', ['battery_cell']);
addFlow(['battery_cell','battery_bms','thermal_management','busbar'], 'pack_assembly', ['battery_pack']);
addFlow(['battery_pack','energy_storage_inverter','mounting_structure'], 'storage_installation', ['energy_storage_power_station']);

// Battery equipment
addEquip('flotation_machine','mining_flotation');
addEquip('rotary_kiln','roasting_leaching');
addEquip('precipitation_reactor','precipitation');
addEquip('causticization_reactor','causticization');
addEquip('lfp_sintering_furnace','lfp_sintering');
addEquip('ncm_sintering_furnace','ncm_sintering');
addEquip('graphitization_furnace','graphite_processing');
addEquip('electrolyte_mixing_tank','electrolyte_mixing');
addEquip('separator_extrusion_line','separator_production');
addEquip('copper_foil_machine','copper_foil_production');
addEquip('aluminum_foil_mill','aluminum_foil_production');
addEquip('cell_assembly_line','cell_assembly');
addEquip('formation_aging_cabinet','formation_aging');
addEquip('pack_assembly_line','pack_assembly');
addEquip('construction_equipment','storage_installation');

// Battery composed_of
addComp('battery_pack','battery_cell');
addComp('battery_pack','battery_bms');
addComp('battery_pack','thermal_management');
addComp('battery_pack','busbar');
addComp('energy_storage_power_station','battery_pack');
addComp('energy_storage_power_station','energy_storage_inverter');
addComp('battery_cell','lfp_cathode');
addComp('battery_cell','ncm_cathode');
addComp('battery_cell','artificial_graphite_anode');
addComp('battery_cell','electrolyte');
addComp('battery_cell','separator');
addComp('battery_cell','copper_foil');
addComp('battery_cell','aluminum_foil');
addComp('battery_cell','tab_material');
addComp('battery_cell','aluminum_laminated_film');
addComp('battery_cell','steel_case');
addComp('battery_cell','aluminum_case');
addComp('electrolyte','lipf6');
addComp('electrolyte','ec_dmc_emc_solvents');
addComp('electrolyte','electrolyte_additives');
addComp('solder_ribbon','copper_strip');
addComp('pv_cable','copper_strip');
addComp('separator','pe_resin');
addComp('separator','ceramic_coating');
addComp('pv_module','sealant');
addComp('battery_cell','conductive_agent');
addComp('battery_cell','pvdf_binder');
addComp('battery_cell','cmc_sbr_binder');
addComp('energy_storage_power_station','mounting_structure');

// ========== BUILD FINAL DATA ==========
const graphData = {
  version: '2.0.0',
  published_at: TS,
  chains: {
    pv_chain: {
      id: 'pv_chain',
      name: '光伏产业链',
      description: '从石英砂到光伏电站的晶硅光伏主产业链',
      start_substance_ids: ['silica_sand'],
      end_facility_id: 'pv_power_station',
      main_path_through: ['polysilicon','silicon_wafer','solar_cell','pv_module'],
      color: '#FF8C00',
      is_viewable: true
    },
    battery_chain: {
      id: 'battery_chain',
      name: '锂电池产业链',
      description: '从锂矿到储能电站的锂电池主产业链',
      start_substance_ids: ['spodumene_ore'],
      end_facility_id: 'energy_storage_power_station',
      main_path_through: ['lithium_carbonate','lfp_cathode','battery_cell','battery_pack'],
      color: '#3B82F6',
      is_viewable: true
    }
  },
  nodes,
  edges
};

// Validate: ensure no duplicate node IDs
const nodeIds = new Set(nodes.map(n => n.id));
if (nodeIds.size !== nodes.length) {
  const dupes = nodes.map(n => n.id).filter((id, i, arr) => arr.indexOf(id) !== i);
  console.error('DUPLICATE NODE IDs:', dupes);
  process.exit(1);
}

// Validate: ensure no duplicate edge IDs
const edgeIds = new Set(edges.map(e => e.id));
if (edgeIds.size !== edges.length) {
  const dupes = edges.map(e => e.id).filter((id, i, arr) => arr.indexOf(id) !== i);
  console.error('DUPLICATE EDGE IDs:', dupes);
  process.exit(1);
}

// Validate: all edge source/target refer to existing nodes
const missingRefs = [];
edges.forEach(e => {
  if (!nodeIds.has(e.source)) missingRefs.push(`edge ${e.id}: source ${e.source} not found`);
  if (!nodeIds.has(e.target)) missingRefs.push(`edge ${e.id}: target ${e.target} not found`);
});
if (missingRefs.length) {
  console.error('MISSING NODE REFS:', missingRefs);
  process.exit(1);
}

// Validate: every process has at least 1 input and 1 output
const procNodeIds = new Set(nodes.filter(n => n.node_type === 'process').map(n => n.id));
const inputCount = {}, outputCount = {};
edges.forEach(e => {
  if (e.edge_type === 'input' && procNodeIds.has(e.target)) inputCount[e.target] = (inputCount[e.target]||0)+1;
  if (e.edge_type === 'output' && procNodeIds.has(e.source)) outputCount[e.source] = (outputCount[e.source]||0)+1;
});
const procsWithoutInput = [], procsWithoutOutput = [];
procNodeIds.forEach(pid => {
  if (!inputCount[pid]) procsWithoutInput.push(pid);
  if (!outputCount[pid]) procsWithoutOutput.push(pid);
});
if (procsWithoutInput.length) console.error('PROCS WITHOUT INPUT:', procsWithoutInput);
if (procsWithoutOutput.length) console.error('PROCS WITHOUT OUTPUT:', procsWithoutOutput);

// Validate: no isolated nodes (every node appears in at least one edge)
const connectedNodes = new Set();
edges.forEach(e => { connectedNodes.add(e.source); connectedNodes.add(e.target); });
const isolated = nodes.filter(n => !connectedNodes.has(n.id)).map(n => n.id);
if (isolated.length) console.error('ISOLATED NODES:', isolated);

// Validate: golden chain - no process-to-process edges
const procToProc = edges.filter(e => procNodeIds.has(e.source) && procNodeIds.has(e.target));
if (procToProc.length) console.error('PROCESS-TO-PROCESS EDGES:', procToProc.map(e=>e.id));

const outPath = path.join(__dirname, 'graph-data.json');
fs.writeFileSync(outPath, JSON.stringify(graphData, null, 2), 'utf-8');
console.log(`SUCCESS: ${nodes.length} nodes, ${edges.length} edges written to ${outPath}`);
console.log(`Node types: substance=${nodes.filter(n=>n.node_type==='substance').length}, process=${nodes.filter(n=>n.node_type==='process').length}, equipment=${nodes.filter(n=>n.node_type==='equipment').length}, facility=${nodes.filter(n=>n.node_type==='facility').length}`);
console.log(`Edge types: input=${edges.filter(e=>e.edge_type==='input').length}, output=${edges.filter(e=>e.edge_type==='output').length}, equipment_for=${edges.filter(e=>e.edge_type==='equipment_for').length}, composed_of=${edges.filter(e=>e.edge_type==='composed_of').length}, is_a=${edges.filter(e=>e.edge_type==='is_a').length}`);
