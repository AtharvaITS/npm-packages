const seen = new WeakMap<object, Set<string>>();
const globalKey = {};

/**
 * Development-only warning (research R12), printed at most once per instance
 * and message. Host bundlers replace `process.env.NODE_ENV`, so this is a no-op
 * in production builds.
 */
export function warn(instanceKey: object | undefined, message: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  const key = instanceKey ?? globalKey;
  let set = seen.get(key);
  if (!set) {
    set = new Set();
    seen.set(key, set);
  }
  if (set.has(message)) return;
  set.add(message);
  console.warn('[ReactDataGrid] ' + message);
}
