/* ───────────────────────────────────────────────────────
   Project Adapter – save/load serialisation bridge
   PHASE 6 will implement real project persistence.
   ─────────────────────────────────────────────────────── */

export function createProjectAdapter() {
  return {
    save:    (state) => { /* TODO */ },
    load:    () => null,
    list:    () => [],
    remove:  (id) => { /* TODO */ },
  };
}
