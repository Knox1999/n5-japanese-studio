import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const views=['dashboard','vocabulary','srs','spelling','conversation','reading','listening','grammar','kanji','kana','arcade','mock','history'];

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('nv_analytics_consent_v1','declined'));
});

for(const view of views){
  test(`${view} renders without overflow or runtime errors`,async({page},testInfo)=>{
    test.skip(testInfo.project.name==='desktop-chromium'&&!['dashboard','vocabulary','kanji'].includes(view));
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`?lesson=1&view=${view}`,{waitUntil:'networkidle'});
    const main=page.locator('main#main-content');
    await expect(main).toBeVisible();
    await expect(main.locator('h1,h2').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('mobile course search is labelled and keyboard-contained',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium');
  await page.goto('?lesson=1&view=dashboard');
  await page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'}).getByRole('button',{name:'আরও বিভাগ খুলুন'}).click();
  const drawer=page.getByRole('dialog',{name:'কোর্স মেনু'});
  await expect(drawer).toBeVisible();
  const trigger=drawer.getByRole('button',{name:'পুরো কোর্সে খুঁজুন'});
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'পুরো কোর্সে খুঁজুন'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox')).toBeFocused();
  await dialog.getByRole('textbox').fill('わたし');
  await expect(dialog.getByRole('button').filter({hasText:'আমি'}).first()).toBeVisible();
});

test('mobile drawer receives focus and exposes search',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium');
  await page.goto('?lesson=1&view=dashboard');
  await page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'}).getByRole('button',{name:'আরও বিভাগ খুলুন'}).click();
  const dialog=page.getByRole('dialog',{name:'কোর্স মেনু'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'পুরো কোর্সে খুঁজুন'})).toBeFocused();
});

test('mobile brand lockup stays visible and untruncated',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium');
  await page.goto('?lesson=1&view=dashboard');
  const brand=page.locator('.future-header .nv60-brand-copy strong');
  await expect(brand).toHaveText('THE NIHONGO VIBES');
  await expect(brand).toBeVisible();
  const box=await brand.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x||0)+(box?.width||0)).toBeLessThanOrEqual(await page.evaluate(()=>window.innerWidth));
});

test('Data Vault opens as the only fixed modal and never as page content',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium');
  await page.goto('?lesson=1&view=dashboard');
  await page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'}).getByRole('button',{name:'আরও বিভাগ খুলুন'}).click();
  const drawer=page.getByRole('dialog',{name:'কোর্স মেনু'});
  await drawer.getByRole('button',{name:/Backup \/ Restore/}).click();
  await expect(drawer).toBeHidden();
  const vault=page.getByRole('dialog',{name:'Backup & Restore Progress'});
  await expect(vault).toBeVisible();
  expect(await vault.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
  const box=await vault.boundingBox();
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect((box?.y||0)+(box?.height||0)).toBeLessThanOrEqual((await page.evaluate(()=>window.innerHeight))+1);
  await vault.getByRole('button',{name:'Close',exact:true}).click();
  await expect(vault).toBeHidden();
});

test('Verb Forms Lab shows only the four requested core forms',async({page})=>{
  await page.goto('?lesson=6&view=vocabulary');
  await page.getByRole('button',{name:/動詞|Verb/}).first().click();
  const formsButton=page.getByRole('button',{name:/Forms/}).first();
  await expect(formsButton).toBeVisible();
  await formsButton.click();
  const lab=page.locator('.verb-lab-layer[role="dialog"]');
  await expect(lab).toBeVisible();
  await expect(lab.locator('.verb-family-box')).toHaveCount(4);
  await expect(lab).toContainText('ます Form');
  await expect(lab).toContainText('た Form');
  await expect(lab).toContainText('ない Form');
  await expect(lab).toContainText('Dictionary Form');
  await expect(lab).not.toContainText('ませんでした');
  await expect(lab).not.toContainText('て Form');
});

test('vocabulary audio controls have names and touch-sized targets',async({page})=>{
  await page.goto('?lesson=1&view=vocabulary');
  const audio=page.locator('.mini-audio').first();
  await expect(audio).toHaveAttribute('aria-label',/উদাহরণ শুনুন/);
  const box=await audio.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

test('representative pages have no serious axe violations',async({page})=>{
  for(const view of ['dashboard','vocabulary','conversation']){
    await page.goto(`?lesson=1&view=${view}`);
    const main=page.locator('main#main-content');
    await expect(main).toBeVisible();
    await expect(main.locator('h1,h2').first()).toBeVisible();
    const results=await new AxeBuilder({page}).disableRules(['color-contrast']).analyze();
    const serious=results.violations.filter(item=>['serious','critical'].includes(item.impact||''));
    expect(serious,JSON.stringify(serious,null,2)).toEqual([]);
  }
});
