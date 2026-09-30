import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('accessibility and responsiveness (US8, SC-006, SC-007)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const view of ['Table', 'Grid', 'List'] as const) {
      test(`${view} view, ${scheme}: zero WCAG 2.2 AA violations`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto('/');
        await page.getByRole('radio', { name: view }).click();
        await page.waitForTimeout(200);
        const results = await new AxeBuilder({ page })
          .include('.aits-root')
          .withTags(WCAG)
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      });
    }
  }

  test('360px: no page overflow, one card column, usable toolbar', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(overflow).toBeLessThanOrEqual(360);
    await expect(page.getByRole('searchbox')).toBeVisible();
    await page.getByRole('radio', { name: 'Grid' }).click();
    await expect(page.locator('.aits-grid')).toHaveAttribute('data-columns', '1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360,
    );
  });

  test('200% zoom: controls remain usable', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    await page.getByRole('radio', { name: 'List' }).click();
    await expect(page.locator('.aits-root')).toHaveAttribute('data-view', 'list');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('26–50 of 50')).toBeVisible();
  });

  test('right-to-left: the first column sits at the right edge', async ({ page }) => {
    await page.goto('/');
    await page.locator('summary', { hasText: 'Locale' }).click();
    await page.getByLabel('Direction').selectOption('rtl');
    const table = await page.locator('.aits-table').boundingBox();
    const firstHeader = await page.locator('.aits-header-cell').first().boundingBox();
    expect(table && firstHeader).toBeTruthy();
    expect(Math.abs(table!.x + table!.width - (firstHeader!.x + firstHeader!.width))).toBeLessThan(
      4,
    );
  });

  test('keyboard only: switch view, move focus, activate a record', async ({ page }) => {
    await page.goto('/');
    await page.locator('.aits-table [tabindex="0"]').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(
      page.getByTestId('event-log').locator('[data-event="onRowActivate"]').first(),
    ).toContainText('EMP-001');
  });
});
