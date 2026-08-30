import { expect, test } from '@playwright/test';

test('admin page offers direct login when no saved session exists',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium');
  await page.addInitScript(()=>localStorage.removeItem('nihongo_vibes_account_session_v1'));
  await page.goto('admin/',{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:'Admin login'})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Email'})).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button',{name:'Login as admin'})).toBeVisible();
});
