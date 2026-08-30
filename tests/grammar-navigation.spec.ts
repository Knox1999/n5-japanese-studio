import { expect, test } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('nv_analytics_consent_v1','declined'));
});

test('desktop lesson picker preserves Grammar view while changing lesson',async({page})=>{
  await page.goto('?lesson=1&view=grammar',{waitUntil:'networkidle'});
  await expect(page.locator('[data-view="grammar"]')).toBeVisible();
  await page.locator('.lesson-picker-trigger').click();
  await page.getByRole('option').nth(1).click();
  await expect(page).toHaveURL(/lesson=2/);
  await expect(page).toHaveURL(/view=grammar/);
  await expect(page.locator('[data-view="grammar"]')).toBeVisible();
  await expect(page.locator('.grammar-studio')).toBeVisible();
});

test('mobile drawer lesson selector preserves Grammar view',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await page.goto('?lesson=1&view=grammar',{waitUntil:'networkidle'});
  await page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'}).getByRole('button',{name:'আরও বিভাগ খুলুন'}).click();
  const drawer=page.getByRole('dialog',{name:'কোর্স মেনু'});
  await drawer.locator('#nv-final-drawer-lesson').selectOption('3');
  await expect(page).toHaveURL(/lesson=3/);
  await expect(page).toHaveURL(/view=grammar/);
  await expect(page.locator('.grammar-studio')).toBeVisible();
});

test('all 25 grammar lessons have renderable visual grammar data',async({page})=>{
  for(let lesson=1;lesson<=25;lesson++){
    await page.goto(`?lesson=${lesson}&view=grammar`);
    await expect(page.locator('.grammar-studio'),`Grammar lesson ${lesson} should render`).toBeVisible();
    await expect(page.locator('.grammar-note-card').first(),`Grammar lesson ${lesson} should contain rules`).toBeVisible();
  }
});
