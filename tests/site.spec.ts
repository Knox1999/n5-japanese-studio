import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const views=['dashboard','vocabulary','srs','spelling','conversation','reading','listening','grammar','kanji','kana','arcade','mock','history'];
const phoneWidths=[320,360,375,390,414];
const visibleHeading=(page:Page)=>page.locator('main#main-content').locator('h1:visible,h2:visible').first();
const isMobile=(name:string)=>name.startsWith('mobile-');

async function expectNoHorizontalOverflow(page:Page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
}

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('nv_analytics_consent_v1','declined');
    localStorage.setItem('n5_e2e_bypass_auth','1');
  });
});

for(const view of views){
  test(`${view} renders without overflow or runtime errors`,async({page})=>{
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`?lesson=1&view=${view}`,{waitUntil:'networkidle'});
    const main=page.locator('main#main-content');
    await expect(main).toBeVisible();
    await expect(visibleHeading(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
}

test('dashboard exposes one clear coach and guided lesson journey',async({page})=>{
  await page.goto('?lesson=1&view=dashboard');
  await expect(page.locator('#home-title')).toBeVisible();
  await expect(page.locator('#daily-coach-title')).toBeVisible();
  await expect(page.locator('#lesson-journey-title')).toBeVisible();
  await expect(page.locator('#daily-coach-title')).toHaveText('এখন কী পড়বেন?');
});

test('animated home keeps its accessible learning contract and primary path',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium');
  await page.goto('?lesson=1&view=dashboard');

  const hero=page.locator('section.home-motion-hero[aria-labelledby="home-title"]');
  await expect(hero).toBeVisible();
  await expect(hero.locator('#home-title')).toHaveText('জাপানিজ শেখা হোক আনন্দে!');
  await expect(hero.locator('.sr-only')).toContainText('হিরাগানা, কাতাকানা, কাঞ্জি, কথোপকথন এবং JLPT N5');
  await expect(hero.locator('[role="progressbar"][aria-label="সামগ্রিক vocabulary mastery"]')).toBeVisible();
  await expect(hero.getByRole('group',{name:'দ্রুত learning tools'}).getByRole('button')).toHaveCount(5);

  await hero.getByRole('button',{name:/Lesson 01 চালিয়ে যান/}).click();
  await expect(page).toHaveURL(/[?&]lesson=1(?:&|$)/);
  await expect(page).toHaveURL(/[?&]view=vocabulary(?:&|$)/);
  await expect(visibleHeading(page)).toBeVisible();
});

test('animated home honours reduced-motion preference',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('?lesson=1&view=dashboard');

  const word=page.locator('.home-motion-word');
  await expect(word).toBeVisible();
  const initial=(await word.textContent())??'';
  await page.waitForTimeout(2600);
  await expect(word).toHaveText(initial);

  const animationNames=await page
    .locator('.home-motion-orb-a,.home-motion-orb-b,.home-motion-progress-card,.home-motion-rotate > i')
    .evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).animationName));
  expect(animationNames).toEqual(['none','none','none','none']);
});

test('daily study time persists locally',async({page})=>{
  await page.goto('?lesson=1&view=dashboard');
  const ten=page.getByRole('button',{name:'10m'});
  await ten.click();
  await expect(ten).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(page.getByRole('button',{name:'10m'})).toHaveAttribute('aria-pressed','true');
});

test('guided lesson stage completion persists',async({page})=>{
  await page.goto('?lesson=1&view=dashboard');
  const incomplete=page.getByRole('button',{name:/Lesson goal দেখুন সম্পন্ন করুন/});
  await incomplete.click();
  const completed=page.getByRole('button',{name:/Lesson goal দেখুন অসম্পূর্ণ করুন/});
  await expect(completed).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(page.getByRole('button',{name:/Lesson goal দেখুন অসম্পূর্ণ করুন/})).toHaveAttribute('aria-pressed','true');
});

test('lesson picker changes lesson without full-page routing',async({page})=>{
  await page.goto('?lesson=1&view=dashboard');
  await page.locator('.lesson-picker-trigger').click();
  const options=page.getByRole('option');
  await expect(options).toHaveCount(25);
  await options.nth(1).click();
  await expect(page).toHaveURL(/lesson=2/);
  await expect(page.locator('#home-title')).toBeVisible();
});

test('mobile course search is labelled and keyboard-contained',async({page},testInfo)=>{
  test.skip(!isMobile(testInfo.project.name));
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
  test.skip(!isMobile(testInfo.project.name));
  await page.goto('?lesson=1&view=dashboard');
  await page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'}).getByRole('button',{name:'আরও বিভাগ খুলুন'}).click();
  const dialog=page.getByRole('dialog',{name:'কোর্স মেনু'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'পুরো কোর্সে খুঁজুন'})).toBeFocused();
});

test('mobile brand lockup stays visible and untruncated',async({page},testInfo)=>{
  test.skip(!isMobile(testInfo.project.name));
  await page.goto('?lesson=1&view=dashboard');
  const brand=page.locator('.future-header .nv60-brand-copy strong');
  await expect(brand).toHaveText('THE NIHONGO VIBES');
  await expect(brand).toBeVisible();
  const box=await brand.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x||0)+(box?.width||0)).toBeLessThanOrEqual(await page.evaluate(()=>window.innerWidth));
});

test('Data Vault opens as the only fixed modal and never as page content',async({page},testInfo)=>{
  test.skip(!isMobile(testInfo.project.name));
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

test('mobile SRS session keeps fixed navigation away from study controls',async({page},testInfo)=>{
  test.skip(!isMobile(testInfo.project.name));
  await page.goto('?lesson=1&view=srs');
  await page.getByRole('button',{name:/Lesson Smart Session/}).click();
  const shell=page.locator('.srs-shell');
  await expect(shell).toBeVisible();
  const reveal=page.getByRole('button',{name:'Reveal answer'});
  await expect(reveal).toBeVisible();
  const dock=page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'});
  await expect(dock).toBeHidden();
  await reveal.scrollIntoViewIfNeeded();
  const revealBox=await reveal.boundingBox();
  expect(revealBox).not.toBeNull();
  expect(revealBox?.y).toBeGreaterThanOrEqual(0);
  expect((revealBox?.y||0)+(revealBox?.height||0)).toBeLessThanOrEqual((await page.evaluate(()=>window.innerHeight))+1);
});

test('vocabulary audio controls have names and touch-sized targets',async({page})=>{
  await page.goto('?lesson=1&view=vocabulary');
  const audio=page.locator('.mini-audio').first();
  await expect(audio).toHaveAttribute('aria-label',/উদাহরণ শুনুন/);
  const box=await audio.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

test('listening transport controls are named and touch-sized',async({page})=>{
  await page.goto('?lesson=1&view=listening');
  const play=page.getByRole('button',{name:'Play'}).first();
  await expect(play).toBeVisible();
  const box=await play.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.shadow-token-line-v57')).toBeVisible();
});

for(const width of phoneWidths){
  test(`dashboard has no horizontal overflow at ${width}px`,async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop-chromium');
    await page.setViewportSize({width,height:780});
    await page.goto('?lesson=1&view=dashboard');
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole('navigation',{name:'মোবাইল নেভিগেশন'})).toBeVisible();
    const toolBox=await page.locator('.home-motion-tools button').first().boundingBox();
    expect(toolBox?.height).toBeGreaterThanOrEqual(44);
  });
}

test('representative major screens have no serious or critical axe violations',async({page})=>{
  for(const view of ['dashboard','vocabulary','srs','listening','grammar','conversation']){
    await page.goto(`?lesson=1&view=${view}`);
    const main=page.locator('main#main-content');
    await expect(main).toBeVisible();
    await expect(visibleHeading(page)).toBeVisible();
    const results=await new AxeBuilder({page}).analyze();
    const serious=results.violations.filter(item=>['serious','critical'].includes(item.impact||''));
    expect(serious,JSON.stringify(serious,null,2)).toEqual([]);
  }
});
