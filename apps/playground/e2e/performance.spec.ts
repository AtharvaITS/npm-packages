import { expect, test } from '@playwright/test';

// SC-003 / SC-004 in a real browser. Chromium only (frame timing is engine specific).
test.describe('performance with 100,000 rows', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');
  test.describe.configure({ mode: 'serial' });

  test('initial render, smooth scrolling, sort and search', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    const t0 = Date.now();
    await page.getByTestId('scenario-select').selectOption('large-100k');
    await expect(page.locator('.aits-tbody .aits-row').first()).toContainText('GEN-000001');
    const initial = Date.now() - t0;
    expect(initial).toBeLessThan(1500 + 1000); // + dataset generation in the Playground

    // Scroll to the bottom while sampling frame times and blank viewports.
    const stats = await page.evaluate(async () => {
      const el = document.querySelector('.aits-table') as HTMLElement;
      const deltas: number[] = [];
      let blankSince = 0;
      let longestBlank = 0;
      let last = performance.now();
      let running = true;
      const sample = (now: number) => {
        deltas.push(now - last);
        last = now;
        const top = el.getBoundingClientRect().top + 60;
        const probe = document.elementFromPoint(el.getBoundingClientRect().left + 20, top + 40);
        const blank = !probe || !probe.closest('.aits-row');
        if (blank && !blankSince) blankSince = now;
        if (!blank && blankSince) {
          longestBlank = Math.max(longestBlank, now - blankSince);
          blankSince = 0;
        }
        if (running) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      for (let i = 0; i < 120; i++) {
        el.scrollTop += el.scrollHeight / 120;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      running = false;
      deltas.sort((a, b) => a - b);
      return {
        p95: deltas[Math.floor(deltas.length * 0.95)] ?? 0,
        longestBlank,
        atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
      };
    });
    expect(stats.atBottom).toBe(true);
    expect(stats.p95).toBeLessThanOrEqual(34); // ~30 fps floor in headless CI; typically ~16 ms
    expect(stats.longestBlank).toBeLessThan(100);
    await expect(page.locator('.aits-tbody .aits-row').last()).toContainText('GEN-100000');

    // Sort by name
    const s0 = Date.now();
    await page.getByRole('button', { name: 'Name', exact: true }).click();
    await expect(page.locator('.aits-header-cell[aria-sort="ascending"]')).toBeVisible();
    expect(Date.now() - s0).toBeLessThan(1500);

    // Search
    const q0 = Date.now();
    await page.getByRole('searchbox').fill('Zoë');
    await expect(page.locator('.aits-result-count')).toBeVisible();
    expect(Date.now() - q0).toBeLessThan(1500 + 200); // + debounce
  });
});
