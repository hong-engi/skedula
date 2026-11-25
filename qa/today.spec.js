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

test('스크롤바 없이 휠과 키보드로 시간표 탐색', async ({ page }) => {
  const timeline = page.getByRole('region', { name: '시간표' });
  await expect(timeline).toHaveCSS('scrollbar-width', 'none');
  await expect(page.locator('.now-line')).toHaveAttribute('datetime', /^\d{2}:\d{2}$/);
  await timeline.focus();
  await page.keyboard.press('Home');
  await expect.poll(() => timeline.evaluate(node => node.scrollTop)).toBe(0);
  await timeline.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => timeline.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('End');
  await expect.poll(() => timeline.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop)).toBeLessThan(2);
});

test('주간 약속, 이동 시간, 반복 일정을 저장하고 편집하기', async ({ page }) => {
  await page.getByRole('button', {name:'주간',exact:true}).click();
  await page.getByRole('button', {name:'약속 추가',exact:true}).click();
  const form=page.locator('#booking');
  await form.getByLabel('이름').fill('독서 모임');
  await form.getByLabel('시작').fill('15:00');
  await form.getByLabel('종료').fill('16:00');
  await form.getByLabel('반복').selectOption('weekly');
  await form.getByLabel('이동 시간(분)').fill('20');
  await form.getByRole('button',{name:'저장'}).click();
  await page.getByRole('button',{name:'다음 주'}).click();
  await expect(page.locator('.agenda .travel-item')).toHaveText('14:40–15:00　이동 · 독서 모임');
  await page.reload();
  await expect(page.locator('#timeline .buffer')).toContainText('14:40–15:00');
  await page.getByRole('button', {name:'주간',exact:true}).click();
  await page.getByRole('button',{name:'15:00–16:00　독서 모임 · 매주'}).click();
  await form.getByLabel('이름').fill('글쓰기 모임');
  await form.getByRole('button',{name:'저장'}).click();
  await page.getByRole('button',{name:'다음 주'}).click();
  await expect(page.locator('.agenda')).toContainText(['글쓰기 모임']);
});

test('메모를 저장했다가 버킷리스트로 옮겨 오늘에 선택하기', async ({ page }) => {
  await page.getByRole('button',{name:'메모함',exact:true}).click();
  await page.getByLabel('빠른 메모').fill('한강 자전거');
  await page.getByRole('button',{name:'담기'}).click();
  await page.reload();
  await page.getByRole('button',{name:'메모함',exact:true}).click();
  await page.getByRole('button',{name:'버킷리스트로'}).click();
  await expect(page.locator('#ideas')).not.toContainText('한강 자전거');
  await page.getByRole('button',{name:'버킷리스트',exact:true}).click();
  await page.locator('.row').filter({hasText:'한강 자전거'}).getByRole('button',{name:'오늘로 고르기'}).click();
  await page.getByRole('button',{name:'오늘',exact:true}).click();
  await expect(page.locator('#tasks')).toContainText('한강 자전거');
});
