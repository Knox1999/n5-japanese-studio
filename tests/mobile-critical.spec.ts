import { expect, test } from '@playwright/test';

const widths=[320,360,390,414];
const criticalViews=['grammar','listening','mock','kanji','vocabulary','srs'];

async function noOverflow(page:import('@playwright/test').Page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
}

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('nv_analytics_consent_v1','declined'));
});

for(const width of widths){
  for(const view of criticalViews){
    test(`${view} stays mobile-safe at ${width}px`,async({page},testInfo)=>{
      test.skip(testInfo.project.name!=='desktop-chromium');
      await page.setViewportSize({width,height:780});
      const errors:string[]=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`?lesson=12&view=${view}`,{waitUntil:'networkidle'});
      await expect(page.locator('main#main-content')).toBeVisible();
      await noOverflow(page);
      expect(errors).toEqual([]);
      const fixed=await page.locator('body *').evaluateAll(elements=>elements.filter(element=>{
        const style=getComputedStyle(element);
        if(style.position!=='fixed')return false;
        const rect=element.getBoundingClientRect();
        return rect.width>0&&rect.height>0&&(rect.left<-1||rect.right>window.innerWidth+1);
      }).map(element=>element.className));
      expect(fixed).toEqual([]);
    });
  }
}

test('mobile drawer can change lesson without losing the active module',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await page.goto('?lesson=4&view=listening',{waitUntil:'networkidle'});
  await page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'}).getByRole('button',{name:'আরও বিভাগ খুলুন'}).click();
  const drawer=page.getByRole('dialog',{name:'কোর্স মেনু'});
  await drawer.locator('#nv-final-drawer-lesson').selectOption('5');
  await expect(page).toHaveURL(/lesson=5/);
  await expect(page).toHaveURL(/view=listening/);
  await expect(page.locator('[data-view="listening"]')).toBeVisible();
});
