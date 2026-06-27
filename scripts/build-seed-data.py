#!/usr/bin/env python3
"""
根据产业调研修正并扩充种子数据。
变更点：
1. 修正事实错误：银浆下游是电池片，不是硅片
2. 银浆归为 raw_material_for（功能性辅材，进入产品成电极）
3. 新增银浆产业：白银/硝酸银/银粉/玻璃粉/有机载体/正背面银浆，形成独立产业链
4. 用 canonical_id 把光伏侧的"银浆"和银浆产业的"银浆"折叠为同一节点（跨产业连接点）
5. 四个应用场景重新归类：BIPV/光伏交通/光伏供热=product，光伏制氢=process
6. 新增需求节点：用电需求/居住需求/供热需求/能源需求/化工原料需求，用 satisfies 连接
所有边仍为 proposed（待人工确认升级 verified），符合"判断真假归人"。
"""
import json
from datetime import datetime, timezone

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def node(id_, name, ntype, definition, aliases=None, parent=None, canonical=None):
    n = {
        'id': id_, 'name': name, 'definition': definition,
        'node_type': ntype, 'stage': 'draft',
        'parent_type': parent, 'canonical_id': canonical or id_,
        'sources': [{'source_type':'other','description':'初始示例数据，待补充权威来源'}],
        'created_at': now, 'updated_at': now,
    }
    if aliases: n['aliases'] = [{'term': a} for a in aliases]
    return n

def edge(id_, s, t, rt, reasoning):
    return {
        'id': id_, 'source': s, 'target': t, 'relation_type': rt,
        'verification_status': 'proposed',
        'proposed_by': {'method':'editorial_research','reasoning':reasoning,'proposed_at':now},
        'reviewed_by': None, 'reviewed_at': None,
        'created_at': now, 'updated_at': now,
    }

nodes, edges = [], []

# ============ 一、光伏主产业链 ============
pv_nodes = [
    ('material-industrial-silicon','工业硅','material','金属硅/工业硅，硅料上游',['金属硅']),
    ('material-polysilicon','多晶硅','material','太阳能级多晶硅料，铸锭/拉棒原料',['太阳能级多晶硅']),
    ('product-silicon-wafer','硅片','product','多晶硅料经拉棒/铸锭+切片得到的硅片，电池片基板'),
    ('product-pv-cell','光伏电池片','product','硅片经制绒/扩散/镀膜/金属化印刷烧结形成的电池片'),
    ('product-pv-laminate','光伏层压件','product','电池片与辅材层压后的半成品'),
    ('product-pv-module','光伏组件','product','层压件加装边框/接线盒等后的成品组件'),
    ('product-pv-power-station','光伏电站','product','光伏组件系统化集成形成的发电站'),
    # 辅材
    ('material-mono-silicon','单晶硅','material','直拉法生长的单晶硅，硅片的一种原料形态'),
    ('material-eva-film','EVA胶膜','material','乙烯-醋酸乙烯共聚物胶膜，封装胶膜原料'),
    ('material-poe-film','POE胶膜','material','聚烯烃弹性体胶膜，封装胶膜原料'),
    ('material-ethylene','乙烯','material','EVA/POE 的上游化工原料'),
    ('material-vinyl-acetate','醋酸乙烯','material','EVA 的共聚单体'),
    ('material-high-carbon-alpha-olefin','高碳α烯烃','material','POE 的共聚单体'),
    ('material-pv-encapsulant-film','光伏封装胶膜','material','EVA/POE 加工成的封装胶膜成品'),
    ('product-pv-backsheet','光伏背板','product','层压件背面的保护层'),
    ('material-pet-film','PET基膜','material','背板的上游基材'),
    ('material-fluoropolymer-film','氟膜','material','背板的耐候层材料'),
    ('material-pv-glass','光伏玻璃','material','层压件正面超白压延玻璃'),
    ('material-soda-ash-quartz-sand','纯碱石英砂','material','光伏玻璃的上游原料'),
    ('product-tinned-copper-ribbon','光伏涂锡焊带','product','电池片互联焊接用的涂锡铜带'),
    ('product-pv-junction-box','光伏接线盒','product','组件引出电流的接线装置'),
    ('material-sealant','密封胶','material','组件边框密封用胶'),
    ('material-aluminum-frame','铝边框','material','组件边框铝材'),
    # 设备
    ('equipment-pv-mounting-structure','光伏支架','equipment','组件支撑结构'),
    ('equipment-pv-inverter','光伏逆变器','equipment','直流转交流的电力变换设备'),
    ('equipment-combiner-box','汇流箱','equipment','多路组件电流汇流装置'),
    ('equipment-energy-storage-battery','储能蓄电池','equipment','电站储能单元'),
    ('equipment-pv-tracker','光伏跟踪系统','equipment','跟踪太阳的支架系统'),
    ('equipment-pv-controller','光伏控制器','equipment','充放电控制设备'),
    # 应用场景（调研后归类：BIPV/光伏交通/光伏供热=产品形态，光伏制氢=工艺）
    ('product-bipv','光伏建筑一体化','product','光伏组件作为建筑构件（瓦/幕墙/采光顶）的应用形态，兼具发电与建材功能'),
    ('product-pv-transportation','光伏交通','product','光伏在交通设施（路灯/车棚/声屏障）上的应用形态集合'),
    ('product-pv-heating','光伏供热','product','PVT热电联供组件构成的光伏供能系统',['PVT']),
    ('process-pv-hydrogen','光伏制氢','process','光伏发电耦合电解水制氢的工艺路线'),
]
for n in pv_nodes:
    nodes.append(node(*n))

# 光伏主链边（工艺转化）
pv_main = [
    ('material-industrial-silicon','material-polysilicon'),
    ('material-polysilicon','product-silicon-wafer'),
    ('product-silicon-wafer','product-pv-cell'),
    ('product-pv-cell','product-pv-laminate'),
    ('product-pv-laminate','product-pv-module'),
    ('product-pv-module','product-pv-power-station'),
]
for i,(s,t) in enumerate(pv_main,1):
    edges.append(edge(f'pv-main-{i}', s, t, 'can_be_processed_into', '光伏主链工艺转化关系'))

# 单晶硅→硅片
edges.append(edge('pv-raw-1','material-mono-silicon','product-silicon-wafer','raw_material_for','单晶硅棒切片得到单晶硅片'))
# 辅材→层压件/组件（raw_material_for：进入产品）
edges.append(edge('pv-raw-2','product-tinned-copper-ribbon','product-pv-laminate','raw_material_for','焊带用于电池片互联'))
edges.append(edge('pv-raw-3','product-pv-backsheet','product-pv-laminate','raw_material_for','背板是层压件背面保护层'))
edges.append(edge('pv-raw-4','material-pv-glass','product-pv-laminate','raw_material_for','玻璃是层压件正面盖板'))
edges.append(edge('pv-raw-5','material-pv-encapsulant-film','product-pv-laminate','raw_material_for','封装胶膜包裹电池片'))
edges.append(edge('pv-raw-6','product-pv-junction-box','product-pv-module','equipment_for','接线盒引出组件电流'))  # 算设备还是辅材待定，暂equipment_for
edges.append(edge('pv-raw-7','material-sealant','product-pv-module','raw_material_for','密封胶用于边框密封'))
edges.append(edge('pv-raw-8','material-aluminum-frame','product-pv-module','raw_material_for','铝边框保护组件边缘'))
# 封装胶膜上游
edges.append(edge('pv-raw-9','material-eva-film','material-pv-encapsulant-film','raw_material_for','EVA是封装胶膜原料之一'))
edges.append(edge('pv-raw-10','material-poe-film','material-pv-encapsulant-film','raw_material_for','POE是封装胶膜原料之一'))
edges.append(edge('pv-raw-11','material-ethylene','material-eva-film','raw_material_for','乙烯是EVA聚合单体'))
edges.append(edge('pv-raw-12','material-ethylene','material-poe-film','raw_material_for','乙烯是POE聚合单体'))
edges.append(edge('pv-raw-13','material-vinyl-acetate','material-eva-film','raw_material_for','醋酸乙烯是EVA共聚单体'))
edges.append(edge('pv-raw-14','material-high-carbon-alpha-olefin','material-poe-film','raw_material_for','高碳α烯烃是POE共聚单体'))
# 背板/玻璃上游
edges.append(edge('pv-raw-15','material-pet-film','product-pv-backsheet','raw_material_for','PET基膜是背板基材'))
edges.append(edge('pv-raw-16','material-fluoropolymer-film','product-pv-backsheet','raw_material_for','氟膜是背板耐候层'))
edges.append(edge('pv-raw-17','material-soda-ash-quartz-sand','material-pv-glass','raw_material_for','石英砂是玻璃主要原料'))
# 设备→电站（equipment_for）
for i,(s,reasoning) in enumerate([
    ('equipment-pv-mounting-structure','支架支撑组件'),
    ('equipment-pv-inverter','逆变器完成直流转交流'),
    ('equipment-combiner-box','汇流箱汇聚多路电流'),
    ('equipment-energy-storage-battery','蓄电池储能'),
    ('equipment-pv-tracker','跟踪系统提高发电量'),
    ('equipment-pv-controller','控制器管理充放电'),
],1):
    edges.append(edge(f'pv-eq-{i}', s, 'product-pv-power-station', 'equipment_for', reasoning))
# 电站→应用场景（applied_in）
for i,(t,reasoning) in enumerate([
    ('product-bipv','BIPV是光伏电站在建筑上的分布式应用形态'),
    ('product-pv-transportation','光伏交通是光伏在交通设施上的应用'),
    ('product-pv-heating','PVT是光伏组件的热电联供变体'),
    ('process-pv-hydrogen','光伏制氢是光伏电站下游的电-氢转换工艺'),
],1):
    edges.append(edge(f'pv-app-{i}', 'product-pv-power-station', t, 'applied_in', reasoning))

# ============ 二、银浆产业（新增，跨产业连接）============
sp_nodes = [
    # 银浆产业链节点
    ('material-silver','白银','material','银金属，银浆上游主原料，占银浆成本88-91%'),
    ('material-silver-nitrate','硝酸银','material','白银溶于硝酸得到的银盐，制备银粉的中间体'),
    ('material-silver-powder','银粉','material','硝酸银还原得到的微米级球形银粉，银浆导电相',['球形银粉']),
    ('material-glass-powder','玻璃粉','material','铋锌硼系无机粉料，银浆粘结剂兼刻蚀剂',['无铅玻璃粉']),
    ('material-organic-vehicle','有机载体','material','松油醇+乙基纤维素等组成的有机相，烧结时挥发'),
    ('material-terpineol','松油醇','material','有机载体的溶剂组分'),
    ('material-ethyl-cellulose','乙基纤维素','material','有机载体的树脂组分'),
    # 银浆成品：与光伏侧的 silver-paste 同一 canonical_id（跨产业合并点）
    # 注意：用 dict 直接构造，避免元组位置参数错位
    {'id':'material-silver-paste','name':'银浆(光伏视角)','node_type':'material',
     'definition':'银粉+玻璃粉+有机载体配制成的导电浆料，烧结形成电极',
     'canonical_id':'material-silver-paste-sp'},
    {'id':'material-silver-paste-sp','name':'银浆','node_type':'material',
     'definition':'【规范节点】银浆：银粉+玻璃粉+有机载体配制成的导电浆料',
     'canonical_id':'material-silver-paste-sp'},
    ('product-front-silver-paste','正面银浆','product','印在电池片受光面的银浆，技术门槛最高，银含量约85%',['正银']),
    ('product-rear-silver-paste','背面银浆','product','印在电池片背光面的银浆，起焊接锚点作用',['背银']),
    # 银浆产业节点
    ('industry-silver-paste','银浆产业','industry','导电银浆产业的归类型节点'),
]
for n in sp_nodes:
    if isinstance(n, dict):
        # dict 形式：直接补全字段
        nd = {
            'id': n['id'], 'name': n['name'], 'definition': n['definition'],
            'node_type': n['node_type'], 'stage': 'draft',
            'parent_type': n.get('parent_type'),
            'canonical_id': n.get('canonical_id', n['id']),
            'sources': [{'source_type':'other','description':'初始示例数据，待补充权威来源'}],
            'created_at': now, 'updated_at': now,
        }
        nodes.append(nd)
    else:
        nodes.append(node(*n))

# 银浆产业边
edges.append(edge('sp-ind-1','industry-silver-paste','material-silver-paste-sp','upstream_of','银浆产业包含银浆生产'))
# 上游链条
edges.append(edge('sp-1','material-silver','material-silver-nitrate','can_be_processed_into','白银溶于硝酸生成硝酸银'))
edges.append(edge('sp-2','material-silver-nitrate','material-silver-powder','can_be_processed_into','硝酸银还原反应生成银粉'))
edges.append(edge('sp-3','material-silver-powder','material-silver-paste-sp','raw_material_for','银粉是银浆主原料（占成本88-91%）'))
edges.append(edge('sp-4','material-glass-powder','material-silver-paste-sp','raw_material_for','玻璃粉是银浆无机粘结剂'))
edges.append(edge('sp-5','material-organic-vehicle','material-silver-paste-sp','raw_material_for','有机载体是银浆有机相'))
edges.append(edge('sp-6','material-terpineol','material-organic-vehicle','raw_material_for','松油醇是有机载体溶剂'))
edges.append(edge('sp-7','material-ethyl-cellulose','material-organic-vehicle','raw_material_for','乙基纤维素是有机载体树脂'))
# 银浆→正/背面银浆
edges.append(edge('sp-8','material-silver-paste-sp','product-front-silver-paste','can_be_processed_into','银浆按用途分为正银'))
edges.append(edge('sp-9','material-silver-paste-sp','product-rear-silver-paste','can_be_processed_into','银浆按用途分为背银'))

# ============ 三、跨产业连接：银浆 → 光伏电池片 ============
# 这是核心理念里"被行业分类切断的连接"的典型：
# 银浆在银浆产业是成品，在光伏产业是电池片辅材
# 用 silver-paste-sp 作为规范节点连到光伏电池片
# 光伏侧 material-silver-paste 通过 canonical_id 已折叠到 silver-paste-sp
edges.append(edge('cross-1','material-silver-paste-sp','product-pv-cell','raw_material_for',
    '【跨产业连接】银浆经丝网印刷+烧结在电池片表面形成银电极，是电池片功能性辅材（非耗材：银变成电极永久留在电池片上）。依据：华西证券研报、专利文献'))

# 正/背面银浆也连到电池片（更细颗粒度的跨产业连接）
edges.append(edge('cross-2','product-front-silver-paste','product-pv-cell','raw_material_for',
    '正面银浆印在电池片受光面形成正电极栅线'))
edges.append(edge('cross-3','product-rear-silver-paste','product-pv-cell','raw_material_for',
    '背面银浆印在电池片背光面形成背电极焊接锚点'))

# ============ 四、需求节点（核心理念第五章）============
demand_nodes = [
    ('demand-electricity','用电需求','demand','人对电力的需求，光伏电站/BIPV/光伏交通等最终满足此需求'),
    ('demand-housing','居住需求','demand','人对建筑空间的需求，BIPV 同时服务于居住与发电'),
    ('demand-heating','供热需求','demand','人对热能（采暖/热水）的需求，PVT 光伏供热满足此需求'),
    ('demand-energy','能源需求','demand','人对能源载体的需求，氢能作为能源载体满足此需求'),
    ('demand-chemical-feedstock','化工原料需求','demand','工业对化工原料的需求，光伏制氢产的氢可用于合成氨/甲醇'),
]
for n in demand_nodes:
    nodes.append(node(*n))

# satisfies 关系：应用场景 → 需求
edges.append(edge('sat-1','product-pv-power-station','demand-electricity','satisfies','光伏电站满足用电需求'))
edges.append(edge('sat-2','product-bipv','demand-electricity','satisfies','BIPV 发电满足用电需求'))
edges.append(edge('sat-3','product-bipv','demand-housing','satisfies','BIPV 作为建筑构件满足居住需求'))
edges.append(edge('sat-4','product-pv-transportation','demand-electricity','satisfies','光伏交通设施发电满足交通用电'))
edges.append(edge('sat-5','product-pv-heating','demand-electricity','satisfies','PVT 发电满足用电需求'))
edges.append(edge('sat-6','product-pv-heating','demand-heating','satisfies','PVT 收集热量满足供热需求'))
edges.append(edge('sat-7','process-pv-hydrogen','demand-energy','satisfies','光伏制氢产出氢能满足能源需求'))
edges.append(edge('sat-8','process-pv-hydrogen','demand-chemical-feedstock','satisfies','绿氢可作为合成氨/甲醇的化工原料'))

# ============ 输出 ============
graph = {'nodes': nodes, 'edges': edges}
with open('data/seed/pv-chain.json','w',encoding='utf-8') as f:
    json.dump(graph, f, ensure_ascii=False, indent=2)

# 统计
from collections import Counter
print(f"=== 种子数据修正完成 ===")
print(f"节点: {len(nodes)}  边: {len(edges)}")
print(f"\n节点类型分布: {dict(Counter(n['node_type'] for n in nodes))}")
print(f"关系类型分布: {dict(Counter(e['relation_type'] for e in edges))}")
print(f"\n跨产业连接（silver-paste 相关）:")
for e in edges:
    if 'silver-paste' in e['source'] or 'silver-paste' in e['target']:
        if e['source'].startswith('material-silver') or e['target'].startswith('product-pv'):
            print(f"  {e['source']} --{e['relation_type']}--> {e['target']}")
print(f"\n需求节点 + satisfies 关系:")
print(f"  需求节点: {[n['name'] for n in nodes if n['node_type']=='demand']}")
print(f"  satisfies 边数: {sum(1 for e in edges if e['relation_type']=='satisfies')}")
print(f"\n所有边仍为 proposed 状态（待人工确认升级 verified）")
