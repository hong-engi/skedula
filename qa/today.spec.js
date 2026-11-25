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
  await page.getByRole('button',{name:'캘린더',exact:true}).click();
  await expect(page.locator('#tasks')).toContainText('한강 자전거');
});

test('중요도와 남은 시간에 따라 카드색 갱신', async ({ page }) => {
  await page.clock.install({time:new Date(2026,10,25,9,0)});
  await page.reload();
  await page.getByRole('button',{name:'할 일',exact:true}).click();
  const row=page.locator('.row').filter({hasText:'회신 보내기'});
  const heat=()=>row.evaluate(r=>Number(r.style.getPropertyValue('--heat')));
  const initial=await heat();
  await row.getByRole('button',{name:'회신 보내기 편집'}).click();
  await page.getByLabel('중요도 (1–10)').fill('10');
  await page.getByRole('button',{name:'저장',exact:true}).click();
  const important=await heat();
  expect(important).toBeGreaterThan(initial);
  await page.clock.fastForward('08:01:00');
  await expect.poll(heat).toBeGreaterThan(important);
  await expect(row.locator('time')).toContainText('마감 지남');
  await row.getByRole('checkbox').check();
  expect(await heat()).toBe(0);
});

test('캘린더에서 월간 날짜를 열고 주간·오늘으로 전환',async({page})=>{
  await page.getByRole('button',{name:'월간',exact:true}).click();
  await page.getByRole('button',{name:'다음 달'}).click();
  const date=page.locator('.month-day:not(.outside)').nth(15);
  const label=await date.getAttribute('aria-label');
  await date.click();
  await expect(page.getByRole('button',{name:label.replace('주간 보기','약속 추가')})).toBeVisible();
  await page.getByRole('button',{name:'오늘',exact:true}).click();
  await expect(page.getByRole('region',{name:'시간표'})).toBeVisible();
});

test('월간과 주간의 배정 시간 순서가 일치한다',async({page})=>{
  await page.getByRole('button',{name:'할 일',exact:true}).click();
  await page.locator('.row').filter({hasText:'회신 보내기'}).getByRole('button',{name:'작업 시간 편집'}).click();
  await page.getByRole('button',{name:'저장',exact:true}).click();
  await page.getByRole('button',{name:'캘린더',exact:true}).click();
  await page.getByRole('button',{name:'월간',exact:true}).click();
  const today=page.locator('.month-day[aria-current=date]');
  expect(await today.locator('span').allTextContents()).toEqual(['회신 보내기','치과 예약']);
});

test('연말 주간에 새해 약속을 만들고 이동 시간을 전날에도 표시한다',async({page})=>{
  await page.clock.install({time:new Date(2026,11,31,10)});
  await page.reload();
  await page.getByRole('button',{name:'주간',exact:true}).click();
  await page.getByRole('button',{name:'2027-01-01 약속 추가'}).click();
  const form=page.locator('#booking');
  await form.getByLabel('이름').fill('새해 출발');
  await form.getByLabel('시작').fill('00:10');
  await form.getByLabel('종료').fill('00:40');
  await form.getByLabel('이동 시간(분)').fill('30');
  await form.getByRole('button',{name:'저장'}).click();
  const yesterday=page.locator('.week-day').filter({has:page.getByRole('button',{name:'2026-12-31 약속 추가'})});
  const tomorrow=page.locator('.week-day').filter({has:page.getByRole('button',{name:'2027-01-01 약속 추가'})});
  await expect(yesterday.locator('.travel-item')).toContainText('23:40–24:00');
  await expect(tomorrow.locator('.travel-item')).toContainText('00:00–00:10');
  await page.getByRole('button',{name:'월간',exact:true}).click();
  await page.getByRole('button',{name:'다음 달',exact:true}).click();
  await expect(page.getByRole('button',{name:'2027-01-01 주간 보기'})).toContainText('새해 출발');
});

test('키보드로 월간 날짜를 열면 그날의 약속을 이어서 추가한다',async({page})=>{
  await page.getByRole('button',{name:'월간',exact:true}).click();
  const day=page.locator('.month-day:not(.outside)').nth(10);
  const target=(await day.getAttribute('aria-label')).split(' ')[0];
  await day.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:target+' 약속 추가'})).toBeFocused({timeout:700});
  await page.keyboard.press('Enter');
  await expect(page.locator('#bookingDate')).toHaveValue(target);
});

test('메모 미리보기 순환, 캘린더 전환과 분류 반영',async({page})=>{
  const go=name=>page.getByRole('button',{name,exact:true}).click();
  const preview=page.locator('#calendarMemo');
  await expect(preview).toBeHidden();
  await go('메모함');
  for(const title of ['수요일 산책','전시 보러 가기']){
    await page.getByLabel('빠른 메모').fill(title);await go('담기')
  }
  await page.clock.install();
  await go('캘린더');
  await expect(preview).toContainText('수요일 산책');
  await page.clock.fastForward(12100);
  await expect(preview).toContainText('전시 보러 가기');
  for(const view of ['주간','월간']){await go(view);await expect(preview).toContainText('전시 보러 가기')}
  await go('다음 메모');
  await page.locator('#memoText').click();
  await page.locator('.idea-row').filter({hasText:'수요일 산책'}).getByRole('button',{name:'할 일로'}).click();
  await go('캘린더');
  await expect(preview).toContainText('전시 보러 가기');
  await expect(page.locator('#nextMemo')).toBeHidden();
});
