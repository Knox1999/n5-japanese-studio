import { expect, test } from '@playwright/test';

test('unauthenticated visitors see the personal account gate',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.removeItem('n5_e2e_bypass_auth');
    localStorage.removeItem('nihongo_vibes_account_session_v1');
    localStorage.setItem('nv_analytics_consent_v1','declined');
  });
  await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});
  await expect(page.locator('.account-gate')).toBeVisible();
  await expect(page.getByRole('heading',{name:/নিজের Japanese learning workspace/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Login/}).first()).toBeVisible();
  await expect(page.locator('#home-title')).toHaveCount(0);
});
