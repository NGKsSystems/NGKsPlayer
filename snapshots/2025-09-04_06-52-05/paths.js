// src/utils/paths.js
export function toLocal(p) {
  if (!p) return p;
  // if it's already a URL, normalize file:// → local://
  if (/^(local|file|https?):\/\//i.test(p)) {
    return p.replace(/^file:\/\//i, 'local://').replace(/\\/g, '/');
  }
  // raw Windows path → local://C:/...
  return `local://${p.replace(/\\/g, '/')}`;
}
