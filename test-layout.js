// Mock THREE.Vector3
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    return this;
  }
  copy(v) {
    this.x = v.x; this.y = v.y; this.z = v.z;
    return this;
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
}

const THREE = { Vector3 };

// ==================================================================
// 1. 数据（光伏+银浆 交叉）
// ==================================================================
const RAW_NODES = [
  {id:'pv-ind', name:'光伏产业', type:'industry', chain:'pv'},
  {id:'pv-1',name:'工业硅',type:'main',chain:'pv'},
  {id:'pv-2',name:'多晶硅',type:'main',chain:'pv'},
  {id:'pv-3',name:'硅片',type:'main',chain:'pv'},
  {id:'pv-4',name:'电池片',type:'main',chain:'pv'},
  {id:'pv-5',name:'层压件',type:'main',chain:'pv'},
  {id:'pv-6',name:'光伏组件',type:'main',chain:'pv'},
  {id:'pv-7',name:'光伏电站',type:'main',chain:'pv'},
  {id:'n-dj',name:'单晶硅',type:'branch'},
  {id:'n-yj',name:'银浆',type:'branch'},
  {id:'n-hd',name:'涂锡焊带',type:'branch'},
  {id:'n-jm',name:'封装胶膜',type:'branch'},
  {id:'n-bb',name:'光伏背板',type:'branch'},
  {id:'n-bl',name:'光伏玻璃',type:'branch'},
  {id:'n-jxh',name:'接线盒',type:'branch'},
  {id:'n-mfj',name:'密封胶',type:'branch'},
  {id:'n-bk',name:'铝边框',type:'branch'},
  {id:'n-zj',name:'光伏支架',type:'branch'},
  {id:'n-nbq',name:'逆变器',type:'branch'},
  {id:'n-hlx',name:'汇流箱',type:'branch'},
  {id:'n-xn',name:'储能蓄电池',type:'branch'},
  {id:'n-gz',name:'跟踪系统',type:'branch'},
  {id:'n-kzq',name:'控制器',type:'branch'},
  {id:'n-jz',name:'建筑一体化',type:'app'},
  {id:'n-jt',name:'光伏交通',type:'app'},
  {id:'n-gr',name:'光伏供热',type:'app'},
  {id:'n-zq',name:'光伏制氢',type:'app'},
  {id:'n-eva',name:'EVA胶膜',type:'branch'},
  {id:'n-poe',name:'POE胶膜',type:'branch'},
  {id:'n-pet',name:'PET基膜',type:'branch'},
  {id:'n-fm',name:'氟膜',type:'branch'},
  {id:'n-syj',name:'纯碱石英砂',type:'branch'},
  {id:'n-yx',name:'乙烯',type:'branch'},
  {id:'n-csyx',name:'醋酸乙烯',type:'branch'},
  {id:'n-gxt',name:'高碳α烯烃',type:'branch'},
  {id:'sp-ind',name:'银浆产业',type:'industry',chain:'sp'},
  {id:'sp-1',name:'白银',type:'main',chain:'sp'},
  {id:'sp-2',name:'银粉',type:'main',chain:'sp'},
  {id:'sp-3',name:'玻璃粉',type:'main',chain:'sp'},
  {id:'sp-4',name:'有机载体',type:'main',chain:'sp'},
  {id:'sp-5',name:'银浆',type:'main',chain:'sp',alias:'n-yj'},
  {id:'sp-6',name:'正面银浆',type:'main',chain:'sp'},
  {id:'sp-7',name:'背面银浆',type:'main',chain:'sp'},
  {id:'n-xyy',name:'硝酸银',type:'branch'},
  {id:'n-qxy',name:'球形银粉',type:'branch'},
  {id:'n-pbl',name:'硼硅玻璃',type:'branch'},
  {id:'n-qbl',name:'铅玻璃',type:'branch'},
  {id:'n-syc',name:'松油醇',type:'branch'},
  {id:'n-yjxs',name:'乙基纤维素',type:'branch'},
];

const RAW_EDGES = [
  ['pv-1','pv-2'],['pv-2','pv-3'],['pv-3','pv-4'],['pv-4','pv-5'],['pv-5','pv-6'],['pv-6','pv-7'],
  ['pv-ind','pv-1'],['pv-ind','pv-2'],['pv-ind','pv-3'],['pv-ind','pv-4'],['pv-ind','pv-5'],['pv-ind','pv-6'],['pv-ind','pv-7'],
  ['n-dj','pv-3'],['n-yj','pv-3'],
  ['n-hd','pv-5'],['n-jm','pv-5'],['n-bb','pv-5'],['n-bl','pv-5'],
  ['n-jxh','pv-6'],['n-mfj','pv-6'],['n-bk','pv-6'],
  ['n-zj','pv-7'],['n-nbq','pv-7'],['n-hlx','pv-7'],['n-xn','pv-7'],['n-gz','pv-7'],['n-kzq','pv-7'],
  ['pv-7','n-jz'],['pv-7','n-jt'],['pv-7','n-gr'],['pv-7','n-zq'],
  ['n-eva','n-jm'],['n-poe','n-jm'],['n-pet','n-bb'],['n-fm','n-bb'],['n-syj','n-bl'],
  ['n-yx','n-eva'],['n-csyx','n-eva'],['n-yx','n-poe'],['n-gxt','n-poe'],
  ['sp-1','sp-2'],['sp-2','sp-5'],['sp-3','sp-5'],['sp-4','sp-5'],
  ['sp-5','sp-6'],['sp-5','sp-7'],
  ['sp-ind','sp-1'],['sp-ind','sp-2'],['sp-ind','sp-3'],['sp-ind','sp-4'],['sp-ind','sp-5'],['sp-ind','sp-6'],['sp-ind','sp-7'],
  ['n-xyy','sp-2'],['n-qxy','sp-2'],
  ['n-pbl','sp-3'],['n-qbl','sp-3'],
  ['n-syc','sp-4'],['n-yjxs','sp-4'],
  ['sp-5','pv-3'],
];

// ==================================================================
// 2. 图结构
// ==================================================================
const nodeMap = new Map();
RAW_NODES.forEach(n => nodeMap.set(n.id, {...n, ups:[], downs:[]}));
const aliasMap = new Map();
RAW_NODES.forEach(n=>{ if(n.alias) aliasMap.set(n.alias, n.id); });
aliasMap.forEach((canon,alias)=>{ nodeMap.delete(alias); });
RAW_EDGES.forEach(([s,t],i)=>{
  let sN = nodeMap.get(s) || nodeMap.get(aliasMap.get(s));
  let tN = nodeMap.get(t) || nodeMap.get(aliasMap.get(t));
  const sId = aliasMap.get(s) || s;
  const tId = aliasMap.get(t) || t;
  sN = nodeMap.get(sId); tN = nodeMap.get(tId);
  if(!sN||!tN) return;
  if(!sN.downs.includes(tId)) sN.downs.push(tId);
  if(!tN.ups.includes(sId)) tN.ups.push(sId);
});
const EDGES = [];
const edgeSeen = new Set();
RAW_EDGES.forEach(([s,t])=>{
  const sId=aliasMap.get(s)||s, tId=aliasMap.get(t)||t;
  if(!nodeMap.has(sId)||!nodeMap.has(tId)) return;
  const k=[sId,tId].sort().join('|');
  if(edgeSeen.has(k)) return; edgeSeen.add(k);
  EDGES.push([sId,tId]);
});

// ==================================================================
// 3. 产业定义
// ==================================================================
const CHAINS = {
  pv: { ind:'pv-ind', main:['pv-1','pv-2','pv-3','pv-4','pv-5','pv-6','pv-7'] },
  sp: { ind:'sp-ind', main:['sp-1','sp-2','sp-3','sp-4','sp-5','sp-6','sp-7'] },
};

// ==================================================================
// 4. 布局算法
// ==================================================================
const C = {
  mainGap: 1.8,
  mainZ: 0,
  indY: 2.8, indZ: -2.4,
  layerBack: 1.8,
  layerFront: 1.8,
  rBase: 0.9,
  rShrink: 0.72,
  rGrowth: 0.6,
  minGap: 1.0,
  relaxIter: 160,
  arcHalf: Math.PI * 0.42,
  yBiasUp: 0.45,
  yBiasDown: 0.45,
  maxHop: 8,
};

function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return(Math.abs(h)%10000)/10000;}

function isOnMain(id, mainIds){ return mainIds.includes(id); }

function findMainAncestor(nid, mainIds){
  const vis=new Set([nid]);let f=[nid];let h=0;
  while(f.length && h<10){h++;const n=[];
    for(const id of f){const nd=nodeMap.get(id);if(!nd)continue;
      for(const p of nd.ups){if(mainIds.includes(p))return{id:p,hops:h};if(!vis.has(p)){vis.add(p);n.push(p);}}
    }f=n;}
  return{id:mainIds[Math.floor(mainIds.length/2)],hops:99};
}

function computeMeta(mainIds, chainId){
  const meta = new Map();
  const placed = new Set(mainIds);

  mainIds.forEach(id=>meta.set(id,{hop:0,primaryParent:null,direction:null,siblings:mainIds,siblingIdx:mainIds.indexOf(id)}));

  let frontier = [...mainIds];
  let hop = 0;
  while(frontier.length && hop<C.maxHop){
    hop++;
    const recs = [];
    for(const pid of frontier){
      const pn = nodeMap.get(pid); if(!pn) continue;
      const pMeta = meta.get(pid);
      for(const cid of pn.ups){
        if(placed.has(cid) || isOnMain(cid,mainIds)) continue;
        const cn = nodeMap.get(cid); if(!cn) continue;
        if(cn.type==='industry') continue;
        recs.push({cid,pid,dir:'up'});
      }
      for(const cid of pn.downs){
        if(placed.has(cid) || isOnMain(cid,mainIds)) continue;
        const cn = nodeMap.get(cid); if(!cn) continue;
        if(cn.type==='industry') continue;
        recs.push({cid,pid,dir:'down'});
      }
    }

    const chosen = new Map();
    for(const r of recs){
      if(!chosen.has(r.cid)) chosen.set(r.cid,{pid:r.pid,dir:r.dir});
    }
    if(chosen.size===0) break;

    const groups = new Map();
    chosen.forEach((v,cid)=>{
      const k=v.pid+':'+v.dir;
      if(!groups.has(k)) groups.set(k,[]);
      groups.get(k).push(cid);
    });
    groups.forEach(children=>children.sort((a,b)=>hash(a)-hash(b)));

    groups.forEach((children,key)=>{
      const [pid,dir]=key.split(':');
      children.forEach((cid,i)=>{
        if(placed.has(cid)) return;
        meta.set(cid,{hop,primaryParent:pid,direction:dir,siblings:children,siblingIdx:i});
        placed.add(cid);
      });
    });
    frontier = Array.from(chosen.keys()).filter(id=>placed.has(id)&&meta.has(id));
  }
  return meta;
}

function computeLayout(chainId, focusId){
  const chain = CHAINS[chainId];
  const mainIds = chain.main;
  const indId = chain.ind;

  let focusIdx = mainIds.indexOf(focusId);
  const focusNode = nodeMap.get(focusId);
  const isInd = focusNode?.type==='industry';
  if(isInd) focusIdx = Math.floor((mainIds.length-1)/2);
  if(focusIdx===-1){
    const a = findMainAncestor(focusId, mainIds);
    focusIdx = mainIds.indexOf(a.id);
    if(focusIdx===-1) focusIdx = Math.floor((mainIds.length-1)/2);
  }

  const pos = new Map();
  const startX = -focusIdx * C.mainGap;
  mainIds.forEach((mid,i)=>pos.set(mid, new THREE.Vector3(startX+i*C.mainGap, 0, C.mainZ)));
  const centerMain = pos.get(mainIds[Math.floor((mainIds.length-1)/2)]);
  pos.set(indId, new THREE.Vector3(centerMain.x, C.indY, C.indZ));

  const meta = computeMeta(mainIds, chainId);

  const maxHop = Math.max(...Array.from(meta.values()).map(m=>m.hop), 0);

  function placeGroup(group, zPlane, sector){
    if(!group.length) return;
    const ideal = new Map();
    group.forEach(nid=>{
      const m = meta.get(nid);
      const pp = pos.get(m.primaryParent);
      if(!pp){ ideal.set(nid, new THREE.Vector3(0,0,zPlane)); return; }
      const sibs = m.siblings.filter(sid=>{
        const sm=meta.get(sid); return sm && sm.direction===m.direction;
      });
      const N = sibs.length;
      const idx = sibs.indexOf(nid);
      const shrink = Math.pow(C.rShrink, m.hop-1);
      const baseR = C.rBase * (1 + C.rGrowth*Math.sqrt(Math.max(0,N-1))) * shrink;
      const arcSp = N<=1?0 : C.arcHalf/(N-1);
      const minR = N<=1 ? baseR : (C.minGap*0.85)/(2*Math.sin(arcSp))*shrink;
      const r = Math.max(baseR, minR);
      const cA = sector==='up' ? Math.PI/2 : 3*Math.PI/2;
      let theta;
      if(N===1) theta = cA;
      else{
        const t = idx/(N-1);
        theta = cA - C.arcHalf + t*2*C.arcHalf;
        theta += (hash(nid)-0.5)*0.06;
      }
      const yE = sector==='up' ? C.yBiasUp*(m.hop-1) : -C.yBiasDown*(m.hop-1) - 0.15;
      ideal.set(nid, new THREE.Vector3(
        pp.x + r*Math.cos(theta),
        pp.y + r*Math.sin(theta) + yE,
        zPlane
      ));
    });

    const cur = new Map();
    ideal.forEach((v,k)=>cur.set(k, v.clone()));

    for(let it=0;it<C.relaxIter;it++){
      const fx=new Map(),fy=new Map();
      group.forEach(id=>{fx.set(id,0);fy.set(id,0);});
      for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
        const a=group[i],b=group[j];
        const pa=cur.get(a),pb=cur.get(b);
        const dx=pb.x-pa.x,dy=pb.y-pa.y;const d2=dx*dx+dy*dy;const mg=C.minGap;
        if(d2<mg*mg && d2>1e-6){
          const d=Math.sqrt(d2);const push=(mg-d)*0.5;const nx=dx/d,ny=dy/d;
          fx.set(a,fx.get(a)-nx*push);
          fy.set(a,fy.get(a)-ny*push*0.8);
          fx.set(b,fx.get(b)+nx*push);
          fy.set(b,fy.get(b)+ny*push*0.8);
        }
      }
      const sp=0.12;
      group.forEach(id=>{
        const p=cur.get(id),ip=ideal.get(id);
        p.x+=fx.get(id)+(ip.x-p.x)*sp;
        p.y+=fy.get(id)+(ip.y-p.y)*sp;
        p.z=zPlane;
      });
    }
    cur.forEach((v,k)=>pos.set(k,v.clone()));
  }

  for(let hop=1;hop<=maxHop;hop++){
    const zUp = C.mainZ - (hop-0.3)*C.layerBack;
    const zDown = C.mainZ - (hop-0.7)*C.layerBack;
    const uN=Array.from(meta.entries()).filter(([,m])=>m.hop===hop&&m.direction==='up').map(([id])=>id);
    const dN=Array.from(meta.entries()).filter(([,m])=>m.hop===hop&&m.direction==='down').map(([id])=>id);
    placeGroup(uN,zUp,'up');
    placeGroup(dN,zDown,'down');
  }

  nodeMap.forEach((n,id)=>{
    if(!pos.has(id)){
      const a=hash(id)*Math.PI*2;
      const d=20+hash(id+'d')*12;
      pos.set(id,new THREE.Vector3(Math.cos(a)*8,(hash(id+'y')-0.5)*8,C.mainZ-d));
    }
  });

  let lookAt;
  if(isInd){
    lookAt = new THREE.Vector3(centerMain.x, 0, C.mainZ - 1.5);
  } else {
    const fp=pos.get(focusId);
    lookAt = fp ? new THREE.Vector3(fp.x, fp.y*0.3, fp.z*0.5) : centerMain.clone();
  }
  const camDist=13, polar=Math.PI/3.4;
  const camPos = new THREE.Vector3(
    lookAt.x,
    lookAt.y + camDist*Math.cos(polar)+1,
    lookAt.z + camDist*Math.sin(polar)+1
  );
  return{pos,camPos,lookAt,mainIds,indId,meta};
}

// ==================================================================
// 运行测试
// ==================================================================
console.log('=== 运行 computeLayout("pv", "pv-ind") ===\n');

const layout = computeLayout('pv', 'pv-ind');
const { pos, mainIds, indId, meta } = layout;

// 1) 所有节点位置列表
console.log('1) 所有节点位置列表:');
console.log('------------------------------------------------------------');
console.log('ID\t\t名称\t\tX\t\tY\t\tZ\t\tHop\t方向');
console.log('------------------------------------------------------------');

const sortedNodes = Array.from(pos.keys()).sort((a,b) => {
  const ma = meta.get(a), mb = meta.get(b);
  const ha = ma?.hop ?? -1, hb = mb?.hop ?? -1;
  if (ha !== hb) return ha - hb;
  const na = nodeMap.get(a), nb = nodeMap.get(b);
  if (na?.type === 'industry' && nb?.type !== 'industry') return -1;
  if (nb?.type === 'industry' && na?.type !== 'industry') return 1;
  return a.localeCompare(b);
});

for (const id of sortedNodes) {
  const p = pos.get(id);
  const n = nodeMap.get(id);
  const m = meta.get(id);
  const name = n?.name || '';
  const hop = m?.hop ?? '(far)';
  const dir = m?.direction || (n?.type === 'industry' ? '(ind)' : '');
  console.log(
    `${id.padEnd(8)}\t${name.padEnd(10)}\t${p.x.toFixed(3).padStart(8)}\t${p.y.toFixed(3).padStart(8)}\t${p.z.toFixed(3).padStart(8)}\t${String(hop).padStart(6)}\t${dir}`
  );
}
console.log(`\n共 ${pos.size} 个节点\n`);

// 2) 检查 sp-ind(银浆产业) 是否只在远处
console.log('2) 检查 sp-ind(银浆产业) 位置:');
const spIndPos = pos.get('sp-ind');
const spIndDistFromCenter = Math.sqrt(spIndPos.x**2 + spIndPos.y**2 + (spIndPos.z - C.mainZ)**2);
const spIndInMeta = meta.has('sp-ind');
console.log(`   sp-ind 位置: x=${spIndPos.x.toFixed(3)}, y=${spIndPos.y.toFixed(3)}, z=${spIndPos.z.toFixed(3)}`);
console.log(`   距离主链平面(Z=0)的距离: ${Math.abs(spIndPos.z).toFixed(3)}`);
console.log(`   距离布局中心的距离: ${spIndDistFromCenter.toFixed(3)}`);
console.log(`   是否在meta中(即通过BFS放置): ${spIndInMeta ? '是 (错误！应该在远处)' : '否 (正确，放在远处)'}`);
const spIndIsFar = Math.abs(spIndPos.z) > 15;
console.log(`   检查结果: ${spIndIsFar ? '✓ PASS: sp-ind 在远处' : '✗ FAIL: sp-ind 不在远处'}\n`);

// 3) 检查主链节点位置是否沿X轴排列
console.log('3) 检查主链节点是否沿X轴排列 (Y=0, Z=0):');
let mainChainOk = true;
for (const mid of mainIds) {
  const p = pos.get(mid);
  const yOk = Math.abs(p.y) < 0.01;
  const zOk = Math.abs(p.z - C.mainZ) < 0.01;
  if (!yOk || !zOk) {
    console.log(`   ✗ ${mid}: y=${p.y.toFixed(4)}, z=${p.z.toFixed(4)}`);
    mainChainOk = false;
  }
}
let xOrderOk = true;
let prevX = -Infinity;
for (const mid of mainIds) {
  const p = pos.get(mid);
  if (p.x <= prevX) {
    console.log(`   ✗ X坐标顺序错误: ${mid} x=${p.x.toFixed(3)} <= 前一个节点 x=${prevX.toFixed(3)}`);
    xOrderOk = false;
  }
  prevX = p.x;
}
const xGaps = [];
for (let i = 1; i < mainIds.length; i++) {
  const dx = pos.get(mainIds[i]).x - pos.get(mainIds[i-1]).x;
  xGaps.push(dx);
}
const gapOk = xGaps.every(g => Math.abs(g - C.mainGap) < 0.01);
if (mainChainOk && xOrderOk && gapOk) {
  console.log(`   ✓ PASS: 所有主链节点 Y≈0, Z≈0, X轴等间距排列 (gap=${C.mainGap})`);
} else {
  console.log(`   ✗ FAIL: 主链排列有误`);
}
console.log(`   主链节点X坐标: ${mainIds.map(mid => pos.get(mid).x.toFixed(2)).join(', ')}\n`);

// 4) 检查 up 节点 Y>0、down 节点 Y<0
console.log('4) 检查 up 节点 Y>0、down 节点 Y<0:');
let upDownOk = true;
let upViolations = [];
let downViolations = [];
for (const [id, m] of meta.entries()) {
  if (!m.direction) continue;
  const p = pos.get(id);
  const n = nodeMap.get(id);
  if (m.direction === 'up' && p.y <= 0.001) {
    upViolations.push({id, name: n?.name, y: p.y.toFixed(3), hop: m.hop});
    upDownOk = false;
  }
  if (m.direction === 'down' && p.y >= 0.001) {
    downViolations.push({id, name: n?.name, y: p.y.toFixed(3), hop: m.hop});
    upDownOk = false;
  }
}
if (upViolations.length > 0) {
  console.log(`   ✗ up方向但Y≤0的节点 (${upViolations.length}个):`);
  upViolations.forEach(v => console.log(`     - ${v.id} (${v.name}): Y=${v.y}, hop=${v.hop}`));
}
if (downViolations.length > 0) {
  console.log(`   ✗ down方向但Y≥0的节点 (${downViolations.length}个):`);
  downViolations.forEach(v => console.log(`     - ${v.id} (${v.name}): Y=${v.y}, hop=${v.hop}`));
}
if (upDownOk) {
  console.log(`   ✓ PASS: 所有up节点Y>0，所有down节点Y<0`);
}
const indPos = pos.get(indId);
console.log(`   产业节点 ${indId} (光伏产业): Y=${indPos.y.toFixed(3)} (预期Y=${C.indY}>0)`);
console.log();

// 5) 检查是否有位置重叠的节点（距离<0.8）
console.log('5) 检查位置重叠节点 (3D距离 < 0.8):');
const allIds = Array.from(pos.keys());
let overlaps = [];
const minDist = 0.8;
for (let i = 0; i < allIds.length; i++) {
  for (let j = i+1; j < allIds.length; j++) {
    const a = allIds[i], b = allIds[j];
    const pa = pos.get(a), pb = pos.get(b);
    const dx = pa.x - pb.x, dy = pa.y - pb.y, dz = pa.z - pb.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist < minDist) {
      const na = nodeMap.get(a), nb = nodeMap.get(b);
      overlaps.push({
        a, b,
        nameA: na?.name, nameB: nb?.name,
        dist: dist.toFixed(3),
        sameLayer: Math.abs(pa.z - pb.z) < 0.1
      });
    }
  }
}
if (overlaps.length === 0) {
  console.log(`   ✓ PASS: 没有距离小于 ${minDist} 的节点对`);
} else {
  console.log(`   ✗ 发现 ${overlaps.length} 对距离<${minDist}的节点:`);
  overlaps.sort((x,y) => parseFloat(x.dist) - parseFloat(y.dist));
  overlaps.forEach(o => {
    const layerNote = o.sameLayer ? ' [同层!]' : ' [不同Z层]';
    console.log(`     - ${o.a}(${o.nameA}) ↔ ${o.b}(${o.nameB}): 距离=${o.dist}${layerNote}`);
  });
}
console.log();

console.log('=== 额外检查: sp-5(银浆/alias n-yj) 位置 ===');
const sp5Pos = pos.get('sp-5');
const sp5Meta = meta.get('sp-5');
const pv3Pos = pos.get('pv-3');
console.log(`sp-5 位置: x=${sp5Pos.x.toFixed(3)}, y=${sp5Pos.y.toFixed(3)}, z=${sp5Pos.z.toFixed(3)}`);
console.log(`sp-5 hop: ${sp5Meta?.hop}, direction: ${sp5Meta?.direction}`);
console.log(`pv-3 位置: x=${pv3Pos.x.toFixed(3)}, y=${pv3Pos.y.toFixed(3)}, z=${pv3Pos.z.toFixed(3)}`);
const distSp5Pv3 = Math.sqrt((sp5Pos.x-pv3Pos.x)**2 + (sp5Pos.y-pv3Pos.y)**2 + (sp5Pos.z-pv3Pos.z)**2);
console.log(`sp-5 到 pv-3 距离: ${distSp5Pv3.toFixed(3)}`);
console.log();

console.log('=== 测试汇总 ===');
console.log(`1. 节点总数: ${pos.size}`);
console.log(`2. sp-ind在远处: ${spIndIsFar && !spIndInMeta ? '✓' : '✗'}`);
console.log(`3. 主链沿X轴: ${mainChainOk && xOrderOk && gapOk ? '✓' : '✗'}`);
console.log(`4. up/down Y方向: ${upDownOk ? '✓' : '✗'}`);
console.log(`5. 无重叠(<0.8): ${overlaps.length === 0 ? '✓' : '✗ (有'+overlaps.length+'对)'}`);
