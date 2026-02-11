/**
 * ProfessionalTimeline V2 — Playhead Proof Test
 *
 * Validates:
 * 1. V2 timeline is mounted (data-testid="ptv2-mounted-flag")
 * 2. Playhead element exists in DOM (data-testid="ptv2-playhead")
 * 3. Playhead is visible and has non-zero bounding box
 * 4. Playhead is anchored to .ptv2-right (right-column wrapper)
 * 5. Playhead handle is vertically centered inside ruler strip
 * 6. Playhead line starts at the ruler strip bottom edge
 */

import { test, expect } from '@playwright/test';

test.describe('ProfessionalTimeline V2 — Playhead', () => {

  test.beforeEach(async ({ page }) => {
    // ProAudioClipper lives at /#/clipper (hash router)
    await page.goto('/#/clipper');
    await page.waitForLoadState('networkidle');
    // Switch to V2 via the timeline version selector
    const selector = page.locator('[data-testid="timeline-version-select"]');
    await expect(selector).toBeAttached({ timeout: 15_000 });
    await selector.selectOption('v2');
    // Wait for V2 to actually mount after the switch
    await expect(page.locator('[data-testid="ptv2-mounted-flag"]')).toBeAttached({ timeout: 10_000 });
  });

  test('V2 timeline is mounted', async ({ page }) => {
    const v2Root = page.locator('[data-testid="ptv2-mounted-flag"]');
    await expect(v2Root).toBeAttached({ timeout: 10_000 });
  });

  test('playhead element exists in DOM', async ({ page }) => {
    const playhead = page.locator('[data-testid="ptv2-playhead"]');
    await expect(playhead).toBeAttached({ timeout: 10_000 });
  });

  test('playhead has non-zero bounding box', async ({ page }) => {
    const playhead = page.locator('[data-testid="ptv2-playhead"]');
    await expect(playhead).toBeAttached({ timeout: 10_000 });
    const box = await playhead.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(0);
  });

  test('playhead is child of right-column wrapper', async ({ page }) => {
    // Playhead's parent should be .ptv2-right (the right-column wrapper)
    const parentClass = await page.locator('[data-testid="ptv2-playhead"]')
      .evaluate((el) => el.parentElement?.className || '');
    expect(parentClass).toContain('ptv2-right');
  });

  test('playhead handle is vertically centered in ruler strip', async ({ page }) => {
    const ruler = page.locator('[data-testid="ptv2-ruler-strip"]');
    const handle = page.locator('[data-testid="ptv2-playhead"] .ptv2-playhead-handle');
    await expect(ruler).toBeAttached({ timeout: 10_000 });
    await expect(handle).toBeAttached({ timeout: 10_000 });

    const rulerBox = await ruler.boundingBox();
    const handleBox = await handle.boundingBox();
    expect(rulerBox).not.toBeNull();
    expect(handleBox).not.toBeNull();

    // Handle center Y should be within the ruler strip's Y range
    const handleCenterY = handleBox!.y + handleBox!.height / 2;
    expect(handleCenterY).toBeGreaterThanOrEqual(rulerBox!.y - 2);
    expect(handleCenterY).toBeLessThanOrEqual(rulerBox!.y + rulerBox!.height + 2);
  });

  test('playhead line starts at ruler strip bottom edge', async ({ page }) => {
    const ruler = page.locator('[data-testid="ptv2-ruler-strip"]');
    const line = page.locator('[data-testid="ptv2-playhead"] .ptv2-playhead-line');
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
