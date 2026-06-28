/**
 * scripts/test-state-machine.ts
 *
 * 状态机自测 — 用种子数据 + 模拟的转换动作验证：
 *   1. 合法转换: proposed → verified-community
 *   2. 合法转换: verified-community → verified-expert
 *   3. 合法转换: any → disputed
 *   4. 非法转换: auto-extracted → verified-expert（应抛 StateMachineError）
 *   5. 非法转换: deprecated → anything（终态，应抛）
 *   6. 同状态转换: proposed → proposed（应抛）
 *   7. 种子数据一致性: pv-chain.json 中所有 verified-* 边都应通过 validateEdgeStateConsistency
 *
 * 运行: npx tsx scripts/test-state-machine.ts
 */

import {
  canTransition,
  applyTransition,
  validateEdgeStateConsistency,
  StateMachineError,
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
} from '../src/lib/state-machine';
import type { GraphEdge, VerificationStatus } from '../src/lib/types';
import seedData from '../data/seed/pv-chain.json';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    const msg = e instanceof Error ? e.message : String(e);
    failures.push(`${name}: ${msg}`);
    console.log(`  ✗ ${name}\n      ${msg}`);
  }
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function assertThrows<E extends Error>(
  fn: () => unknown,
  ctor: new (...args: never[]) => E,
  msgIncludes?: string
): void {
  try {
    fn();
  } catch (e) {
    if (!(e instanceof ctor)) {
      throw new Error(`expected ${ctor.name}, got ${e instanceof Error ? e.constructor.name : typeof e}`);
    }
    if (msgIncludes && !e.message.includes(msgIncludes)) {
      throw new Error(`error message "${e.message}" does not include "${msgIncludes}"`);
    }
    return;
  }
  throw new Error('expected throw, got success');
}

console.log('--- 1. 合法转换 canTransition ---');
test('proposed → verified-community 合法', () => {
  assert(canTransition('proposed', 'verified-community') === true);
});
test('verified-community → verified-expert 合法', () => {
  assert(canTransition('verified-community', 'verified-expert') === true);
});
test('auto-extracted → proposed 合法', () => {
  assert(canTransition('auto-extracted', 'proposed') === true);
});
test('any → disputed 合法（disputed 是复核入口）', () => {
  for (const from of ['proposed', 'verified-community', 'verified-expert'] as VerificationStatus[]) {
    assert(canTransition(from, 'disputed') === true, `${from} → disputed 应合法`);
  }
});

console.log('\n--- 2. 非法转换 canTransition ---');
test('auto-extracted → verified-expert 非法（跳级）', () => {
  assert(canTransition('auto-extracted', 'verified-expert') === false);
});
test('auto-extracted → verified-community 非法（跳级）', () => {
  assert(canTransition('auto-extracted', 'verified-community') === false);
});
test('proposed → auto-extracted 非法（逆向）', () => {
  assert(canTransition('proposed', 'auto-extracted') === false);
});
test('proposed → proposed 非法（同状态）', () => {
  assert(canTransition('proposed', 'proposed') === false);
});
test('deprecated 终态：任何转换都非法', () => {
  for (const to of ['proposed', 'disputed', 'verified-community', 'verified-expert'] as VerificationStatus[]) {
    assert(canTransition('deprecated', to) === false, `deprecated → ${to} 应非法`);
  }
  assert(ALLOWED_TRANSITIONS.deprecated.length === 0, 'deprecated 应为空数组');
  assert(TERMINAL_STATUSES.has('deprecated'), 'deprecated 应在终态集合');
});

console.log('\n--- 3. applyTransition 副作用 ---');

const sampleEdge: GraphEdge = {
  id: 'test-1',
  source: 'a',
  target: 'b',
  relation_type: 'raw_material_for',
  verification_status: 'proposed',
  evidence: [],
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

test('proposed → verified-community 写 reviewed_by / reviewed_at', () => {
  const next = applyTransition({
    edge: sampleEdge,
    to: 'verified-community',
    actor_id: 'reviewer-001',
    actor_role: 'community',
    action: 'approved',
    reason: 'evidence 充分',
    at: '2026-06-28T00:00:00Z',
  });
  assert(next.verification_status === 'verified-community', 'status 应为 verified-community');
  assert(next.reviewed_by === 'reviewer-001', 'reviewed_by 应为 reviewer-001');
  assert(next.reviewed_at === '2026-06-28T00:00:00Z', 'reviewed_at 应为 at');
  assert((next.transitions ?? []).length === 1, 'transitions 应有 1 条');
  assert((next.reviewer_chain ?? []).length === 1, 'reviewer_chain 应有 1 条');
  assert(next.reviewer_chain![0].from_status === 'proposed', 'from_status 应为 proposed');
  assert(next.reviewer_chain![0].to_status === 'verified-community', 'to_status 应为 verified-community');
});

test('verified-community → disputed 清空 reviewed_by / reviewed_at', () => {
  const v: GraphEdge = {
    ...sampleEdge,
    verification_status: 'verified-community',
    reviewed_by: 'r1',
    reviewed_at: '2026-06-28T00:00:00Z',
    transitions: [],
    reviewer_chain: [],
  };
  const next = applyTransition({
    edge: v,
    to: 'disputed',
    actor_id: 'challenger-007',
    actor_role: 'community',
    action: 'disputed',
    reason: 'evidence 链接失效',
    at: '2026-06-29T00:00:00Z',
  });
  assert(next.verification_status === 'disputed', 'status 应为 disputed');
  assert(next.reviewed_by === null, 'disputed 时 reviewed_by 应清空');
  assert(next.reviewed_at === null, 'disputed 时 reviewed_at 应清空');
});

test('非法转换抛 StateMachineError', () => {
  assertThrows(
    () => applyTransition({
      edge: { ...sampleEdge, verification_status: 'auto-extracted' },
      to: 'verified-expert',
      actor_id: 'x',
      actor_role: 'expert',
      action: 'approved',
    }),
    StateMachineError,
    'auto-extracted → verified-expert'
  );
});

test('deprecated 终态任何转换都抛错', () => {
  assertThrows(
    () => applyTransition({
      edge: { ...sampleEdge, verification_status: 'deprecated' },
      to: 'proposed',
      actor_id: 'x',
      actor_role: 'admin',
      action: 'restored',
    }),
    StateMachineError,
    '终态'
  );
});

console.log('\n--- 4. 种子数据一致性 ---');
const edges = (seedData as { edges: GraphEdge[] }).edges;
let inconsistent = 0;
for (const e of edges) {
  const r = validateEdgeStateConsistency(e);
  if (!r.ok) {
    inconsistent++;
    console.log(`  ✗ edge ${e.id}: ${r.reason}`);
  }
}
test(`种子数据 ${edges.length} 条边全部一致`, () => {
  assert(inconsistent === 0, `发现 ${inconsistent} 条不一致`);
});

console.log('\n--- 5. 统计 ---');
const statusCount = new Map<VerificationStatus, number>();
for (const e of edges) {
  statusCount.set(e.verification_status, (statusCount.get(e.verification_status) ?? 0) + 1);
}
console.log('  verification_status 分布:');
for (const [s, n] of statusCount) console.log(`    ${s}: ${n}`);

console.log(`\n=== 总结: ${pass} pass / ${fail} fail ===`);
if (fail > 0) {
  console.log('失败详情:');
  failures.forEach((f) => console.log('  -', f));
  process.exit(1);
}
