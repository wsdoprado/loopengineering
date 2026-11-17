// Minimal dependency-free test harness (research.md R7).
const registry = [];

export function test(id, fn) {
  registry.push({ id, fn });
}

function fmt(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} expected ${fmt(expected)} but got ${fmt(actual)}`.trim());
  }
}

export function assertDeepEqual(actual, expected, msg = '') {
  if (fmt(actual) !== fmt(expected)) {
    throw new Error(`${msg} expected ${fmt(expected)} but got ${fmt(actual)}`.trim());
  }
}

export function assertTrue(value, msg = '') {
  if (!value) throw new Error(msg || 'expected truthy value');
}

export function assertThrows(fn, msg = '') {
  try { fn(); } catch { return; }
  throw new Error(msg || 'expected function to throw');
}

// Runs every registered test. Zero tests is a failure.
export async function run() {
  const failed = [];
  let passed = 0;
  for (const { id, fn } of registry) {
    try {
      await fn();
      passed += 1;
    } catch (err) {
      failed.push({ id, message: err && err.message ? err.message : String(err) });
    }
  }
  const total = registry.length;
  const ok = total > 0 && failed.length === 0;
  return { ok, total, passed, failed };
}
