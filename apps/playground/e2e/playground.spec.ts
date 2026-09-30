import { expect, test } from '@playwright/test';

test.describe('Playground (US9)', () => {
  test('opens with the same 50 sample records every time', async ({ page }) => {
    await page.goto('/');
    const firstCell = page.locator('.aits-tbody .aits-row').first().locator('.aits-cell').first();
    await expect(firstCell).toHaveText('EMP-001');
    await expect(page.getByText('1–25 of 50')).toBeVisible();

    const names = async () =>
      page
        .locator('.aits-tbody .aits-row')
        .evaluateAll((rows) =>
          rows.slice(0, 5).map((r) => r.querySelectorAll('.aits-cell')[1]?.textContent),
        );
    const before = await names();
    await page.reload();
    await expect(firstCell).toHaveText('EMP-001');
    expect(await names()).toEqual(before);
  });

  test('scenario switching and Reset', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('scenario-select').selectOption('empty');
    await expect(page.getByText('No data to display')).toBeVisible();
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('scenario-select')).toHaveValue('default-50');
    await expect(page.getByText('1–25 of 50')).toBeVisible();
  });

  test('the event log records component callbacks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Grid' }).click();
    await expect(
      page.getByTestId('event-log').locator('[data-event="onViewChange"]').first(),
    ).toContainText('"grid"');
  });

  test('settings panel changes apply immediately', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Theme', { exact: true }).click();
    await page.getByLabel('Density').selectOption('compact');
    await expect(page.locator('.aits-root')).toHaveAttribute('data-density', 'compact');
  });

  test('edge-case scenario renders markup as text without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByTestId('scenario-select').selectOption('edge-cases');
    await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
