const fs = require('fs');
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const force3D = require('d3-force-3d');

const DATA_PATH = path.join(__dirname, '..', 'data', 'graph-data.json');
const OUT_PATH = DATA_PATH;

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

// Use a built-in BFS like graph-data.ts does to compute chain membership
function computeChains(data) {
  const nodeMap = new Map();
  const outEdges = new Map();
  const inEdges = new Map();
  for (const n of data.nodes) {
    nodeMap.set(n.id, n);
    outEdges.set(n.id, []);
    inEdges.set(n.id, []);
  }
  for (const e of data.edges) {
    if (outEdges.has(e.source)) outEdges.get(e.source).push(e);
    if (inEdges.has(e.target)) inEdges.get(e.target).push(e);
  }
  const chains = Object.values(data.chains).filter(c => c.is_viewable);

  function isInChain(nodeId, chain) {
    const mainAxis = new Set(chain.start_substance_ids);
    const q = [...chain.start_substance_ids];
    while (q.length) {
      const cur = q.shift();
      const cn = nodeMap.get(cur);
      if (!cn) continue;
      if (cn.node_type === 'substance' || cn.node_type === 'facility') {
        if (cur === chain.end_facility_id) continue;
        for (const e of outEdges.get(cur) || []) {
          if (e.edge_type === 'input' && !mainAxis.has(e.target)) {
            const tn = nodeMap.get(e.target);
            if (tn && tn.node_type === 'process') { mainAxis.add(e.target); q.push(e.target); }
          }
        }
      } else if (cn.node_type === 'process') {
        for (const e of outEdges.get(cur) || []) {
          if (e.edge_type === 'output' && !mainAxis.has(e.target)) {
            const tn = nodeMap.get(e.target);
            if (tn && (tn.node_type === 'substance' || tn.node_type === 'facility')) { mainAxis.add(e.target); q.push(e.target); }
          }
        }
      }
    }
    if (mainAxis.has(nodeId)) return true;
    const belong = new Set(mainAxis);
    const auxQ = [];
    for (const pid of mainAxis) {
      const pn = nodeMap.get(pid);
      if (!pn) continue;
      if (pn.node_type === 'process') {
        for (const e of inEdges.get(pid) || []) {
          if (e.edge_type === 'input' && !belong.has(e.source)) {
            const sn = nodeMap.get(e.source);
            if (sn && sn.node_type === 'substance') { belong.add(e.source); auxQ.push(e.source); }
          }
        }
      }
      if (pn.node_type === 'substance' || pn.node_type === 'facility') {
        for (const e of outEdges.get(pid) || []) {
          if (e.edge_type === 'composed_of' && !belong.has(e.target)) { belong.add(e.target); auxQ.push(e.target); }
        }
      }
    }
    while (auxQ.length) {
      const cur = auxQ.shift();
      const cn = nodeMap.get(cur);
      if (!cn) continue;
      if (cn.node_type === 'substance') {
        for (const e of inEdges.get(cur) || []) {
          if (e.edge_type === 'output' && !belong.has(e.source)) {
            const pn = nodeMap.get(e.source);
            if (pn && pn.node_type === 'process') { belong.add(e.source); auxQ.push(e.source); }
          }
        }
        for (const e of outEdges.get(cur) || []) {
          if (e.edge_type === 'composed_of' && !belong.has(e.target)) { belong.add(e.target); auxQ.push(e.target); }
        }
      } else if (cn.node_type === 'process') {
        for (const e of inEdges.get(cur) || []) {
          if (e.edge_type === 'input' && !belong.has(e.source)) {
            const sn = nodeMap.get(e.source);
            if (sn && sn.node_type === 'substance') { belong.add(e.source); auxQ.push(e.source); }
          }
        }
      }
    }
    return belong.has(nodeId);
  }

  for (const n of data.nodes) {
    const belonging = [];
    for (const c of chains) {
      if (isInChain(n.id, c)) belonging.push(c.id);
    }
    n.chains = belonging;
    n.primary_chain = belonging[0];
  }
}

computeChains(data);

const nodes = data.nodes.map(n => ({
  id: n.id,
  name: n.name,
  node_type: n.node_type,
  chains: n.chains || [],
  primary_chain: n.primary_chain,
}));

const edges = data.edges.map(e => ({
  source: e.source,
  target: e.target,
  edge_type: e.edge_type,
}));

const linkStrength = e => {
  if (e.edge_type === 'input' || e.edge_type === 'output') {
    const sn = nodes.find(n => n.id === (typeof e.source === 'object' ? e.source.id : e.source));
    const tn = nodes.find(n => n.id === (typeof e.target === 'object' ? e.target.id : e.target));
    if (sn && tn) {
      if (sn.primary_chain && tn.primary_chain && sn.primary_chain === tn.primary_chain) return 0.9;
      if ((sn.chains?.length > 1 || tn.chains?.length > 1)) return 0.5;
    }
    return 0.7;
  }
  if (e.edge_type === 'composed_of') return 0.25;
  if (e.edge_type === 'equipment_for') return 0.15;
  if (e.edge_type === 'is_a') return 0.05;
  return 0.2;
};

const linkDistance = e => {
  if (e.edge_type === 'input' || e.edge_type === 'output') {
    const sn = nodes.find(n => n.id === (typeof e.source === 'object' ? e.source.id : e.source));
    const tn = nodes.find(n => n.id === (typeof e.target === 'object' ? e.target.id : e.target));
    const isCross = sn && tn && sn.primary_chain && tn.primary_chain && sn.primary_chain !== tn.primary_chain;
    return isCross ? 5 : 3.5;
  }
  if (e.edge_type === 'composed_of') return 1.8;
  if (e.edge_type === 'equipment_for') return 2.2;
  return 3.5;
};

const nodeRadius = n => {
  if (n.node_type === 'facility') return 1.3;
  if (n.node_type === 'process') return 0.8;
  if (n.node_type === 'substance') {
    if (n.chains?.length > 1) return 1.0;
    return 0.7;
  }
  if (n.node_type === 'equipment') return 0.45;
  return 0.5;
};

const simulation = force3D.forceSimulation(nodes, 3)
  .numDimensions(3)
  .force('charge', force3D.forceManyBody()
    .strength(-80)
    .distanceMax(35)
    .theta(0.5)
  )
  .force('link', force3D.forceLink()
    .id(d => d.id)
    .links(edges)
    .strength(linkStrength)
    .distance(linkDistance)
  )
  .force('center', force3D.forceCenter(0, 0, 0).strength(0.04))
  .force('collide', force3D.forceCollide().radius(nodeRadius).strength(0.5))
  .alpha(1)
  .alphaDecay(0.015)
  .velocityDecay(0.35);

const ITERATIONS = 600;
for (let i = 0; i < ITERATIONS; i++) {
  simulation.tick();
}
simulation.stop();

// Center
let cx = 0, cy = 0, cz = 0;
for (const n of nodes) { cx += n.x; cy += n.y; cz += n.z; }
cx /= nodes.length; cy /= nodes.length; cz /= nodes.length;

let maxR = 0;
for (const n of nodes) {
  n.x -= cx; n.y -= cy; n.z -= cz;
  const r = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
  if (r > maxR) maxR = r;
}
const scale = 30 / maxR;
for (const n of nodes) {
  n.x *= scale; n.y *= scale; n.z *= scale;
}

// PCA align pv_chain main axis along X
function pcaAlign(chainIds) {
  const chainSet = new Set();
  for (const n of nodes) {
    for (const c of (n.chains||[])) {
      if (chainIds.includes(c)) { chainSet.add(n.id); break; }
    }
  }
  const main = nodes.filter(n => chainSet.has(n.id) && (n.node_type==='substance'||n.node_type==='process'||n.node_type==='facility'));
  if (main.length < 4) return;
  let mx=0,my=0,mz=0;
  for (const n of main) { mx+=n.x; my+=n.y; mz+=n.z; }
  mx/=main.length; my/=main.length; mz/=main.length;
  let xx=0,xy=0,xz=0,yy=0,yz=0,zz=0;
  for (const n of main) {
    const dx=n.x-mx, dy=n.y-my, dz=n.z-mz;
    xx+=dx*dx; xy+=dx*dy; xz+=dx*dz; yy+=dy*dy; yz+=dy*dz; zz+=dz*dz;
  }
  const N = main.length;
  xx/=N; xy/=N; xz/=N; yy/=N; yz/=N; zz/=N;
  // Power iteration for principal eigenvector
  let vx=1, vy=0, vz=0;
  for (let i=0;i<100;i++) {
    const nx=xx*vx+xy*vy+xz*vz;
    const ny=xy*vx+yy*vy+yz*vz;
    const nz=xz*vx+yz*vy+zz*vz;
    const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    vx=nx/len; vy=ny/len; vz=nz/len;
  }
  // Build rotation that maps v -> target=(1,0,0)
  // axis = normalize(v × target)
  const tx=1, ty=0, tz=0;
  let ax = vy*tz - vz*ty;
  let ay = vz*tx - vx*tz;
  let az = vx*ty - vy*tx;
  let aLen = Math.sqrt(ax*ax+ay*ay+az*az);
  if (aLen < 1e-6) {
    // v already parallel to X, nothing to do
    return;
  }
  ax/=aLen; ay/=aLen; az/=aLen;
  const cosT = Math.max(-1, Math.min(1, vx*tx + vy*ty + vz*tz));
  const angle = Math.acos(cosT);
  // If vy*az - vz*ay... sign matters: rotate around axis by angle
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1-c;
  // Rodrigues rotation matrix
  const m00 = c + ax*ax*t,      m01 = ax*ay*t - az*s,   m02 = ax*az*t + ay*s;
  const m10 = ay*ax*t + az*s,   m11 = c + ay*ay*t,      m12 = ay*az*t - ax*s;
  const m20 = az*ax*t - ay*s,   m21 = az*ay*t + ax*s,   m22 = c + az*az*t;
  for (const n of nodes) {
    const x=n.x-mx, y=n.y-my, z=n.z-mz;
    n.x = m00*x + m01*y + m02*z + mx;
    n.y = m10*x + m11*y + m12*z + my;
    n.z = m20*x + m21*y + m22*z + mz;
  }
}
pcaAlign(['pv_chain']);

// Re-center
cx=0;cy=0;cz=0;
for (const n of nodes) { cx+=n.x; cy+=n.y; cz+=n.z; }
cx/=nodes.length; cy/=nodes.length; cz/=nodes.length;
for (const n of nodes) { n.x-=cx; n.y-=cy; n.z-=cz; }

const positions = {};
for (const n of nodes) {
  positions[n.id] = {
    x: +n.x.toFixed(3),
    y: +n.y.toFixed(3),
    z: +n.z.toFixed(3),
    r: +nodeRadius(n).toFixed(2),
  };
}

data.positions = positions;
fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));

console.log(`Layout computed: ${nodes.length} nodes, ${edges.length} edges`);
let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
for (const n of nodes) {
  if (n.x<minX)minX=n.x; if (n.x>maxX)maxX=n.x;
  if (n.y<minY)minY=n.y; if (n.y>maxY)maxY=n.y;
  if (n.z<minZ)minZ=n.z; if (n.z>maxZ)maxZ=n.z;
}
console.log(`BBox X:[${minX.toFixed(1)},${maxX.toFixed(1)}] Y:[${minY.toFixed(1)},${maxY.toFixed(1)}] Z:[${minZ.toFixed(1)},${maxZ.toFixed(1)}]`);
const cross = nodes.filter(n => (n.chains||[]).length>1 && n.node_type==='substance');
console.log('Cross-chain substances:', cross.map(n=>`${n.name}(${n.chains.join(',')})`).join('; '));
const pvNodes = nodes.filter(n=>(n.chains||[]).includes('pv_chain')).length;
const batNodes = nodes.filter(n=>(n.chains||[]).includes('battery_chain')).length;
console.log(`pv nodes: ${pvNodes}, battery nodes: ${batNodes}`);
