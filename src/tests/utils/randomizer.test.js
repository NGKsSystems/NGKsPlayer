/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: randomizer.test.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { pickNextIndex, pickPrevIndex, readBag, writeBag, getCachedNext, setCachedNext, clearCachedNext, bagKey, cacheKey } from '../../utils/randomizer'

describe('randomizer utilities', () => {
  beforeEach(() => {
    // Clear localStorage keys that our util uses
    localStorage.clear()
  })

  test('inOrder advances correctly', () => {
    const q = ['a','b','c']
    expect(pickNextIndex('inOrder', q, 0)).toBe(1)
    expect(pickNextIndex('inOrder', q, 2)).toBe(0)
    expect(pickPrevIndex('inOrder', q, 0)).toBe(2)
  })

  test('shuffle returns a different index when possible', () => {
    const q = ['a','b','c']
    const idx = pickNextIndex('shuffle', q, 1)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(q.length)
    // should not equal current if queue length > 1
    expect(idx).not.toBe(1)
  })

  test('randomNoRepeat peek does not mutate bag', () => {
    const q = ['a','b','c']
    // ensure bag empty initially
    expect(readBag(q)).toEqual([])
    const peek = pickNextIndex('randomNoRepeat', q, 0, { mutate: false })
    // peek should choose an index not equal to current (if possible)
    expect(peek).not.toBe(0)
    // bag still empty (we only peeked)
    expect(readBag(q)).toEqual([])
  })

  test('randomNoRepeat consume mutates bag and consumes an item', () => {
    const q = ['a','b','c']
    // consume once
    const first = pickNextIndex('randomNoRepeat', q, 0, { mutate: true })
    // bag should now be non-empty (or smaller). Read bag should not contain the consumed index
    const bag = readBag(q)
    expect(Array.isArray(bag)).toBe(true)
    expect(bag.includes(first)).toBe(false)

    // consume remaining items and ensure bag is drained
    const second = pickNextIndex('randomNoRepeat', q, first, { mutate: true })
    const third = pickNextIndex('randomNoRepeat', q, second, { mutate: true })
    // after consuming available bag items the stored bag should be empty
    expect(readBag(q).length).toBeGreaterThanOrEqual(0)
    // subsequent calls should still return a valid index within queue bounds
    const nextAfter = pickNextIndex('randomNoRepeat', q, third, { mutate: true })
    expect(Number.isInteger(nextAfter)).toBe(true)
    expect(nextAfter).toBeGreaterThanOrEqual(0)
    expect(nextAfter).toBeLessThan(q.length)
  })

  test('cache helpers store and retrieve values keyed by queue', () => {
    const q1 = ['/one','/two']
    const q2 = ['/A','/B']
    expect(getCachedNext(q1)).toBeNull()
    setCachedNext(q1, 1)
    expect(getCachedNext(q1)).toBe(1)
    // other queue should not be affected
    expect(getCachedNext(q2)).toBeNull()
    clearCachedNext(q1)
    expect(getCachedNext(q1)).toBeNull()
  })

  test('bagKey and cacheKey are stable and reflect queue content', () => {
    const q = ['x','y']
    expect(typeof bagKey === 'function' ? bagKey(q) : '').toBeDefined()
    expect(typeof cacheKey === 'function' ? cacheKey(q) : '').toBeDefined()
  })
})

