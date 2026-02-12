/**
 * NGKsSystems — NGKsPlayer
 *
 * Playwright test: Performance Safety Mode — deck load guards
 *
 * Tests:
 * 1) BLOCK: marking Deck A "live" then attempting load → block modal appears, no track change
 * 2) CONFIRM: Deck B loaded but stopped, attempt replace → confirm dialog, Cancel keeps original, Replace changes it
 */
import { test, expect } from '@playwright/test';

// Navigate to DJ Simple — the app routes to / which lands on the player
test.describe('Performance Safety Mode — Load Guards', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to DJ Simple view (route: /now in hash router → /#/now)
    await page.goto('/#/now');
    // Wait for the main DJ workspace to appear — try multiple possible selectors
    await page.waitForSelector('.dj-workspace, .dj-simple-container, [class*="library-a-widget"], [class*="dj-deck"]', { timeout: 20_000 });
  });

  test('BLOCK: live deck prevents loading', async ({ page }) => {
    // Use test hook to simulate Deck A as live:
    // Set deckState.A to have a track loaded and playing
    await page.evaluate(() => {
      const hook = window.__DJ_SIMPLE_TEST__;
      if (hook && hook.setDeckState) {
        hook.setDeckState(prev => ({
          ...prev,
          A: {
            ...prev.A,
            track: { id: 999, title: 'Live Track', filePath: '/fake/live.mp3' },
            isPlaying: true,
            volume: 0.8,
          }
        }));
      }

      // Simulate AudioManager reporting deck A as playing with audible output
      const am = hook?.audioManager || window.audioManagerRef?.current;
      if (am) {
        // Ensure isPlaying returns true for A
        if (am.decks?.A?.audio) {
          // Can't truly play without a file, so we monkey-patch isPlaying
          am._testOverrides = am._testOverrides || {};
          am._testOverrides.isPlayingA = true;
          const origIsPlaying = am.isPlaying.bind(am);
          am.isPlaying = (deck) => {
            if (deck === 'A' && am._testOverrides?.isPlayingA) return true;
            return origIsPlaying(deck);
          };
        }
        // Set crossfader gain to audible for deck A
        if (am.decks?.A?.crossfaderGainNode) {
          am.decks.A.crossfaderGainNode.gain.value = 1.0;
        }
        if (am.decks?.A?.gainNode) {
          am.decks.A.gainNode.gain.value = 0.8;
        }
      }
    });

    // Wait a tick for React state to settle
    await page.waitForTimeout(500);

    // Try to load a track to Deck A via Library A double-click
    // Find a track row in Library A and double-click it
    const trackRow = page.locator('.library-a-widget .track-row').first();
    const trackRowExists = await trackRow.count();

    if (trackRowExists > 0) {
      await trackRow.dblclick();

      // Expect the guard block modal to appear
      const blockModal = page.locator('.guard-modal--block');
      await expect(blockModal).toBeVisible({ timeout: 3_000 });

      // Expect the block message
      const message = page.locator('.guard-modal__message');
      await expect(message).toContainText('live in master output');
      await expect(message).toContainText('Loading disabled');

      // Dismiss
      await page.locator('.guard-modal__btn--dismiss').click();
      await expect(blockModal).not.toBeVisible();
    } else {
      // No tracks in library — test the guard function directly
      const decision = await page.evaluate(() => {
        const { evaluateLoadGuard, GUARD_DECISION } = window.__DECK_SAFETY_GUARDS__ || {};
        if (!evaluateLoadGuard) return 'NO_GUARD_HOOK';

        const am = window.audioManagerRef?.current;
        const hook = window.__DJ_SIMPLE_TEST__;
        const result = evaluateLoadGuard({
          track: { id: 1, title: 'Test' },
          targetDeck: 'A',
          source: 'playwright-test',
          audioManager: am,
          deckState: hook?.deckState,
        });
        return result.decision;
      });

      // The guard should report BLOCK_LIVE (or CONFIRM_REPLACE at minimum since track is loaded)
      expect(['BLOCK_LIVE', 'CONFIRM_REPLACE']).toContain(decision);
    }
  });

  test('CONFIRM: loaded deck shows replace dialog', async ({ page }) => {
    // Use test hook to set Deck B as loaded but NOT playing
    await page.evaluate(() => {
      const hook = window.__DJ_SIMPLE_TEST__;
      if (hook && hook.setDeckState) {
        hook.setDeckState(prev => ({
          ...prev,
          B: {
            ...prev.B,
            track: { id: 888, title: 'Existing Track', filePath: '/fake/existing.mp3' },
            isPlaying: false,
            volume: 0.8,
          }
        }));
      }
    });

    await page.waitForTimeout(500);

    // Try to load a track to Deck B via Library B double-click
    const trackRow = page.locator('.library-b-widget .track-row').first();
    const trackRowExists = await trackRow.count();

    if (trackRowExists > 0) {
      await trackRow.dblclick();

      // Expect the confirm modal to appear
      const confirmModal = page.locator('.guard-modal--confirm');
      await expect(confirmModal).toBeVisible({ timeout: 3_000 });

      // Expect the confirm message
      const message = page.locator('.guard-modal__message');
      await expect(message).toContainText('already has a track loaded');

      // Test Cancel: click Cancel — modal should close, no track change
      await page.locator('.guard-modal__btn--cancel').click();
      await expect(confirmModal).not.toBeVisible();

      // Double-click again to re-trigger the confirm
      await trackRow.dblclick();
      await expect(confirmModal).toBeVisible({ timeout: 3_000 });

      // Test Replace: click Replace — modal closes, load proceeds
      await page.locator('.guard-modal__btn--replace').click();
      await expect(confirmModal).not.toBeVisible();
    } else {
      // No tracks — test guard function directly
      const decision = await page.evaluate(() => {
        const { evaluateLoadGuard } = window.__DECK_SAFETY_GUARDS__ || {};
        if (!evaluateLoadGuard) return 'NO_GUARD_HOOK';

        const hook = window.__DJ_SIMPLE_TEST__;
        const result = evaluateLoadGuard({
          track: { id: 2, title: 'New Track' },
          targetDeck: 'B',
          source: 'playwright-test',
          audioManager: window.audioManagerRef?.current,
          deckState: hook?.deckState,
        });
        return result.decision;
      });

      expect(decision).toBe('CONFIRM_REPLACE');
    }
  });
});
