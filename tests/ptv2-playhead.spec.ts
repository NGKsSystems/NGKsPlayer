/**
 * ProfessionalTimeline V2 — Playhead Proof Test
 *
 * Validates:
 * 1. V2 timeline is mounted (data-testid="ptv2-mounted-flag")
 * 2. Playhead element exists in DOM (data-testid="ptv2-playhead")
 * 3. Playhead is visible and has non-zero bounding box
 * 4. Playhead is a viewport overlay (sibling of scroll, not inside canvas)
 */

import { test, expect } from '@playwright/test';

test.describe('ProfessionalTimeline V2 — Playhead', () => {

  test.beforeEach(async ({ page }) => {
    // ProAudioClipper lives at /#/clipper (hash router)
    await page.goto('/#/clipper');
    await page.waitForLoadState('domcontentloaded');
  });

  test('V2 timeline is mounted', async ({ page }) => {
    // The V2 root element must exist with the proof marker
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
    // The playhead wrapper is 2px wide and spans full height
    expect(box!.height).toBeGreaterThan(0);
  });

  test('playhead is viewport overlay (sibling of scroll container)', async ({ page }) => {
    // Verify DOM structure: playhead's parent should be .ptv2-scroll-viewport,
    // NOT .ptv2-canvas (scroll content). This proves the viewport overlay pattern.
    const parentClass = await page.locator('[data-testid="ptv2-playhead"]')
      .evaluate((el) => el.parentElement?.className || '');
    expect(parentClass).toContain('ptv2-scroll-viewport');
  });
});
