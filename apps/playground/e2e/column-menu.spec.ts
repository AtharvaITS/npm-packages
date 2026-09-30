import { expect, test, type Page } from '@playwright/test';

/** Distance from the menu's nearest edge to the trigger, and whether it sits fully on screen. */
async function openAndMeasure(page: Page, index: number) {
  const buttons = page.locator('.aits-header-menu-button');
  const button = buttons.nth(index);
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const b = (await button.boundingBox())!;
  const m = (await menu.boundingBox())!;
  const vp = page.viewportSize()!;
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  const gapBelow = m.y - (b.y + b.height);
  const gapAbove = b.y - (m.y + m.height);
  return {
    gap: Math.min(Math.abs(gapBelow), Math.abs(gapAbove)),
    inside:
      m.x >= 8 - 1 && m.y >= 0 && m.x + m.width <= vp.width - 8 + 1 && m.y + m.height <= vp.height,
    endAligned: Math.abs(m.x + m.width - (b.x + b.width)),
    startAligned: Math.abs(m.x - b.x),
    b,
    m,
  };
}

test.describe('column menu placement (US1, SC-001 to SC-003)', () => {
  test('opens next to its own button for every column', async ({ page }) => {
    await page.goto('/');
    const count = await page.locator('.aits-header-menu-button').count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i++) {
      const r = await openAndMeasure(page, i);
      expect(r.gap, `column ${i}`).toBeLessThanOrEqual(8);
      expect(r.inside, `column ${i}`).toBe(true);
    }
  });

  test('does not stretch the header when opened', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('.aits-header-cell').first();
    const before = (await header.boundingBox())!.height;
    await page.locator('.aits-header-menu-button').first().click();
    await expect(page.getByRole('menu')).toBeVisible();
    expect((await header.boundingBox())!.height).toBe(before);
  });

  for (const width of [320, 768, 1440]) {
    test(`fully visible at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const r = await openAndMeasure(page, 0);
      expect(r.inside).toBe(true);
      expect(r.gap).toBeLessThanOrEqual(8);
    });
  }

  test('last column after scrolling the grid to the far end', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/');
    await page.getByTestId('scenario-select').selectOption('wide-120-cols');
    await page.locator('.aits-table').evaluate((el) => {
      for (const n of [el, ...el.querySelectorAll<HTMLElement>('*')])
        if (n.scrollWidth > n.clientWidth + 10) n.scrollLeft = n.scrollWidth;
    });
    const buttons = page.locator('.aits-header-menu-button');
    const last = buttons.last();
    await last.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const b = (await last.boundingBox())!;
    const m = (await menu.boundingBox())!;
    expect(Math.abs(m.y - (b.y + b.height))).toBeLessThanOrEqual(8);
    expect(m.x + m.width).toBeLessThanOrEqual(900);
  });

  test('mirrors in right-to-left', async ({ page }) => {
    await page.addInitScript(() => {
      const apply = () => document.documentElement && (document.documentElement.dir = 'rtl');
      apply();
      document.addEventListener('readystatechange', apply);
    });
    await page.goto('/');
    const r = await openAndMeasure(page, 1);
    expect(r.startAligned).toBeLessThanOrEqual(2);
    expect(r.gap).toBeLessThanOrEqual(8);
  });

  test('correct inside a transformed, clipping host container', async ({ page }) => {
    await page.goto('/');
    await page.addStyleTag({
      content: '.pg-preview { transform: translateZ(0); overflow: hidden; }',
    });
    const r = await openAndMeasure(page, 2);
    expect(r.gap).toBeLessThanOrEqual(8);
    expect(r.inside).toBe(true);
  });

  test('opens above the button when there is no room below', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 760 });
    await page.goto('/');
    await page.addStyleTag({ content: '.pg-app { padding-top: 460px; }' });
    const button = page.locator('.aits-header-menu-button').first();
    const b = (await button.boundingBox())!;
    await button.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const m = (await menu.boundingBox())!;
    expect(m.y + m.height).toBeLessThanOrEqual(b.y);
    expect(b.y - (m.y + m.height)).toBeLessThanOrEqual(8);
  });

  test('keyboard (Shift+F10): focus enters the menu and Esc returns it to the button', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('.aits-table [tabindex="0"]').focus();
    await page.keyboard.press('Shift+F10');
    await expect(page.getByRole('menuitemcheckbox').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('.aits-header-menu-button').first()).toBeFocused();
  });
});
