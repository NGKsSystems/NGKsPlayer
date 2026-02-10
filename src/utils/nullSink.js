/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: nullSink.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
export const NULL_SINK = process.platform === 'win32' ? 'NUL' : '/dev/null';

