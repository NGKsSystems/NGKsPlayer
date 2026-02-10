/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: toFileUrl.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
export function toFileUrl(p) {
  return 'file:///' + p
    .replace(/\\\\/g, '/')
    .replace(/\\/g, '/')
    .replace(/#/g, '%23');
}

