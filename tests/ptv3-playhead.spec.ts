/**
 * ProfessionalTimeline V3 — Playhead-First Proof Test
 *
 * Validates:
 * 1. V3 timeline is mounted (data-testid="ptv3-root")
 * 2. Playhead element exists in DOM (data-testid="ptv3-playhead")
 * 3. Playhead has non-zero bounding box
 * 4. Playhead is child of .ptv3-right (viewport overlay, NOT inside scroll)
 * 5. Playhead is NOT a descendant of .ptv3-scroll or .ptv3-content
 * 6. Playhead cap is vertically within the ruler strip
 * 7. Playhead line starts at ruler bottom edge
 */

import { test, expect } from '@playwright/test';

test.describe('ProfessionalTimeline V3 — Playhead-First', () => {

  test.beforeEach(async ({ page }) => {
    // V3 has its own route at /#/clipper-v3
    await page.goto('/#/clipper-v3');
    await page.waitForLoadState('domcontentloaded');
  });

  test('V3 timeline is mounted', async ({ page }) => {
    const v3Root = page.locator('[data-testid="ptv3-root"]');
    await expect(v3Root).toBeAttached({ timeout: 10_000 });
  });

  test('playhead element exists in DOM', async ({ page }) => {
    const playhead = page.locator('[data-testid="ptv3-playhead"]');
    await expect(playhead).toBeAttached({ timeout: 10_000 });
  });

  test('playhead has non-zero bounding box', async ({ page }) => {
    const playhead = page.locator('[data-testid="ptv3-playhead"]');
    await expect(playhead).toBeAttached({ timeout: 10_000 });
    const box = await playhead.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(0);
  });

  test('playhead is child of right-column wrapper (viewport overlay)', async ({ page }) => {
    // Playhead's parent should be .ptv3-right — the stacking context
    const parentClass = await page.locator('[data-testid="ptv3-playhead"]')
      .evaluate((el) => el.parentElement?.className || '');
    expect(parentClass).toContain('ptv3-right');
  });

  test('playhead is NOT inside scroll container', async ({ page }) => {
    // The key V3 invariant: playhead must NOT be a descendant of .ptv3-scroll or .ptv3-content
    const isInsideScroll = await page.locator('[data-testid="ptv3-playhead"]')
      .evaluate((el) => {
        let node = el.parentElement;
        while (node) {
          if (node.classList.contains('ptv3-scroll') || node.classList.contains('ptv3-content')) {
            return true;
          }
          node = node.parentElement;
        }
        return false;
      });
    expect(isInsideScroll).toBe(false);
  });

  test('playhead cap is vertically within ruler strip', async ({ page }) => {
    const ruler = page.locator('[data-testid="ptv3-ruler"]');
    const cap = page.locator('[data-testid="ptv3-playhead-cap"]');
    await expect(ruler).toBeAttached({ timeout: 10_000 });
    await expect(cap).toBeAttached({ timeout: 10_000 });

    const rulerBox = await ruler.boundingBox();
    const capBox = await cap.boundingBox();
    expect(rulerBox).not.toBeNull();
    expect(capBox).not.toBeNull();

    // Cap should be vertically within the ruler strip (2px tolerance)
    expect(capBox!.y).toBeGreaterThanOrEqual(rulerBox!.y - 2);
    expect(capBox!.y + capBox!.height).toBeLessThanOrEqual(rulerBox!.y + rulerBox!.height + 2);
  });

  test('playhead line starts at ruler bottom edge', async ({ page }) => {
    const ruler = page.locator('[data-testid="ptv3-ruler"]');
    const line = page.locator('[data-testid="ptv3-playhead-line"]');
    await expect(ruler).toBeAttached({ timeout: 10_000 });
    await expect(line).toBeAttached({ timeout: 10_000 });

    const rulerBox = await ruler.boundingBox();
    const lineBox = await line.boundingBox();
    expect(rulerBox).not.toBeNull();
    expect(lineBox).not.toBeNull();

    // Line top should be approximately at ruler bottom (within 2px tolerance)
    const rulerBottom = rulerBox!.y + rulerBox!.height;
    expect(Math.abs(lineBox!.y - rulerBottom)).toBeLessThanOrEqual(2);
  });
});
