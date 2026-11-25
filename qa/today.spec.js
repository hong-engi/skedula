const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const preview = pathToFileURL(path.resolve(__dirname, '../prototype/today.html')).href;
test.beforeEach(async ({ page }) => { await page.goto(preview); });

test('중요도와 마감을 바꾸고 오늘로 고른 뒤 다시 열기', async ({ page }) => {
  await page.getByRole('button', { name: '할 일', exact: true }).click();
  await page.getByRole('button', { name: '포트폴리오 정리 편집' }).click();
  await page.getByLabel('중요도 (1–10)').fill('9');
  await page.getByLabel('마감일 · 선택').fill('2030-12-01');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  const task = page.locator('.row').filter({ hasText: '포트폴리오 정리' });
  await task.getByRole('button', { name: '오늘로 고르기' }).click();
  await page.reload();
  await expect(task.getByRole('img', { name: '중요도 9점' })).toBeVisible();
  await expect(task.locator('time')).toHaveAttribute('datetime', '2030-12-01');
});

test('배정한 할 일을 완료한 뒤 시간표의 완료 상태 확인', async ({ page }) => {
  await page.getByRole('button', { name: '할 일', exact: true }).click();
  const task = page.locator('.row').filter({ hasText: '회신 보내기' });
  await task.getByRole('button', { name: '작업 시간 편집' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await task.getByRole('checkbox').check();
  await page.reload();
  await expect(task.getByRole('checkbox')).toBeChecked();
  await expect(page.locator('.event.done')).toContainText('회신 보내기');
  await expect(page.locator('.event.done')).toBeDisabled();
});
