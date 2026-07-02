// Chainable mock of the supabase-js query builder.
//
// Usage:
//   const m = createSupabaseMock();
//   m.queue('rooms', { data: { id: 'r1', code: 'ABC123' }, error: null });
//   ... route awaits sb.from('rooms').select('*').eq(...).single() → shifts
//   the next queued response for that table (FIFO per table).
//
// Every builder method is recorded, so tests can assert on the exact chain:
//   m.calls[0] → { table: 'rooms', chain: [{ method: 'select', args: ['*'] }, ...] }
export function createSupabaseMock() {
  const queues = new Map();
  const calls = [];

  const client = {
    from(table) {
      const rec = { table, chain: [] };
      calls.push(rec);
      const builder = new Proxy(function () {}, {
        get(_, prop) {
          if (prop === 'then') {
            return (resolve, reject) => {
              const q = queues.get(table) || [];
              const res = q.length ? q.shift() : { data: null, error: null, count: null };
              return Promise.resolve(typeof res === 'function' ? res(rec) : res).then(resolve, reject);
            };
          }
          if (prop === Symbol.toPrimitive || prop === 'toJSON') return undefined;
          return (...args) => {
            rec.chain.push({ method: String(prop), args });
            return builder;
          };
        },
      });
      return builder;
    },
    auth: {
      async getUser() { return { data: { user: null } }; },
      async exchangeCodeForSession() { return { error: null }; },
    },
  };

  return {
    client,
    calls,
    queue(table, response) {
      if (!queues.has(table)) queues.set(table, []);
      queues.get(table).push(response);
    },
    chainOf(table, index = 0) {
      const found = calls.filter(c => c.table === table);
      return found[index]?.chain.map(c => c.method) || [];
    },
  };
}
