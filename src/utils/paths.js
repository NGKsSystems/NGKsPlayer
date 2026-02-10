/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: paths.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/utils/paths.js
export function toLocal(p) {
  if (!p) return p;
  // if it's already a URL, normalize file:// → file://
  if (/^(local|file|https?):\/\//i.test(p)) {
    return p.replace(/^local:\/\//i, 'file://').replace(/\\/g, '/');
  }
  // raw Windows path → file://C:/...
  return `file://${p.replace(/\\/g, '/')}`;
}

