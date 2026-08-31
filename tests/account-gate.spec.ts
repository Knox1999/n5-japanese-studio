import { expect, test } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.removeItem('n5_e2e_bypass_auth');
    localStorage.removeItem('nihongo_vibes_account_session_v1');
    localStorage.setItem('nv_analytics_consent_v1','declined');
  });
});

test('guest visitors see the public learning experience before authentication',async({page})=>{
  await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});

  await expect(page.getByRole('heading',{name:/Build Japanese skills/i,level:1})).toBeVisible();
  await expect(page.locator('#home-title')).toHaveCount(0);
  await expect(page.locator('.account-modal-layer')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Start learning/i}).first()).toBeVisible();

  const viewportWidth=page.viewportSize()?.width||0;
  if(viewportWidth<=768){
    await expect(page.getByRole('button',{name:'Toggle navigation'})).toBeVisible();
  }else{
    await expect(page.getByRole('button',{name:'Login',exact:true}).first()).toBeVisible();
  }
});

test('login and join open the account dialog and return to the public landing',async({page})=>{
  await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});

  const desktopLogin=page.getByRole('button',{name:'Login',exact:true}).first();
  if(await desktopLogin.isVisible()){
    await desktopLogin.click();
  }else{
    await page.getByRole('button',{name:'Toggle navigation'}).click();
    await page.getByRole('button',{name:'Login',exact:true}).last().click();
  }
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading',{name:/account-এ login/})).toBeVisible();

  await dialog.getByRole('button',{name:'Join',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:/learning account তৈরি/})).toBeVisible();
  await expect(dialog.getByPlaceholder('আপনার নাম')).toBeVisible();

  await dialog.getByRole('button',{name:'বন্ধ করুন'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Build Japanese skills/i,level:1})).toBeVisible();
  await expect(page.locator('#home-title')).toHaveCount(0);
});
