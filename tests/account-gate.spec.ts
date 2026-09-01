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

  await expect(page.getByRole('heading',{name:/লগইনের আগেই JLPT N5/,level:1})).toBeVisible();
  await expect(page.getByRole('heading',{name:/আগে শিখুন, শুনুন/})).toBeVisible();
  await expect(page.locator('#home-title')).toHaveCount(0);
  await expect(page.locator('.account-modal-layer')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/ফ্রি শেখা শুরু করুন/})).toBeVisible();

  await page.getByRole('button',{name:'EN',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Start learning JLPT N5/,level:1})).toBeVisible();

  const viewportWidth=page.viewportSize()?.width||0;
  if(viewportWidth<=768){
    await expect(page.getByRole('button',{name:'Toggle navigation'})).toBeVisible();
  }else{
    await expect(page.getByRole('button',{name:'Login',exact:true}).first()).toBeVisible();
  }
});

test('login and join open the account dialog and return to the public landing',async({page})=>{
  await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'EN',exact:true}).click();

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
  await expect(page.getByRole('heading',{name:/Start learning JLPT N5/i,level:1})).toBeVisible();
  await expect(page.locator('#home-title')).toHaveCount(0);
});

test('free learning lab is useful without login and exposes verified mock resources',async({page})=>{
  await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});
  await expect(page.getByText('おはようございます',{exact:true})).toBeVisible();
  await expect(page.getByText('A は B です',{exact:true})).toBeVisible();

  await page.getByRole('tab',{name:'ফ্রি কুইজ'}).click();
  const quiz=page.locator('[role="tabpanel"]');
  await expect(quiz.getByText('5 QUESTIONS')).toBeVisible();
  for(const answer of ['পানি / Water','は','山','ধন্যবাদ দিতে / To thank','আজ / Today']){
    await quiz.getByRole('button',{name:answer,exact:true}).click();
  }
  await quiz.getByRole('button',{name:'ফলাফল দেখুন'}).click();
  await expect(quiz.getByText('5/5',{exact:true})).toBeVisible();

  await page.getByRole('tab',{name:'মক রিসোর্স'}).click();
  await expect(page.getByRole('link',{name:/Five N5 Full Mocks/})).toBeVisible();
  await expect(page.locator('[role="tabpanel"] a[target="_blank"]')).toHaveCount(6);
});

test('public Bangla experience does not overflow compact phones',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium');
  for(const width of [320,360,390,430]){
    await page.setViewportSize({width,height:780});
    await page.goto('?lesson=1&view=dashboard',{waitUntil:'networkidle'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    await page.getByRole('tab',{name:'মক রিসোর্স'}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  }
});
