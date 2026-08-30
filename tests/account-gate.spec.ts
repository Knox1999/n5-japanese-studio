import { expect, test } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.removeItem('n5_e2e_bypass_auth');
    localStorage.removeItem('nihongo_vibes_account_session_v1');
    localStorage.setItem('nv_analytics_consent_v1','declined');
  });
});

test('guest visitors can use the studio without logging in',async({page})=>{
  await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});
  await expect(page.locator('#home-title')).toBeVisible();
  await expect(page.locator('.account-modal-layer')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/লগইন/})).toBeVisible();
  await expect(page.getByRole('button',{name:/জয়েন/})).toBeVisible();
});

test('login and join open an optional account dialog',async({page})=>{
  await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/লগইন/}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading',{name:/account-এ login/})).toBeVisible();
  await dialog.getByRole('button',{name:'Join'}).click();
  await expect(dialog.getByRole('heading',{name:/learning account তৈরি/})).toBeVisible();
  await expect(dialog.getByPlaceholder('আপনার নাম')).toBeVisible();
  await dialog.getByRole('button',{name:'বন্ধ করুন'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#home-title')).toBeVisible();
});
