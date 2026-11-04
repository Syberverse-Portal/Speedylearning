/* Learner profiles in real Chromium: no email, one profile per child, progress kept apart, data stays on the device */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765';
const LS=(page,k)=>page.evaluate(key=>localStorage.getItem(key),k);
const JS=async(page,k)=>JSON.parse(await LS(page,k));

async function addLearner(page,{name,buddy,year,keep}){
  await page.locator('.sp-dialog input[name=name]').fill(name);
  await page.locator(`.sp-dialog input[name=buddy][value=${buddy}]`).check({force:true});
  await page.locator(`.sp-dialog input[name=year][value="${year}"]`).check({force:true});
  if(keep===false)await page.locator('.sp-dialog input[name=keep]').uncheck();
  await Promise.all([page.waitForEvent('load'),page.locator('.sp-dialog button[type=submit]').click()]);
  await page.locator('.sp-chip').waitFor();
}
async function earnMathsStar(page){
  await page.locator('#speedJourneyApp .sj-pin-maths').click();
  for(let i=0;i<2;i++){await page.locator('#speedQuestOverlay .sj-answer').first().click();await page.locator('#speedQuestOverlay .sj-big-button').first().click()}
  await page.locator('#sjBack').click();
}

async function run(){
  const browser=await chromium.launch({headless:true});
  try{
    for(const view of [{id:'desktop',width:1366,height:900,mobile:false},{id:'mobile',width:390,height:844,mobile:true}]){
      const context=await browser.newContext({viewport:{width:view.width,height:view.height},isMobile:view.mobile,hasTouch:view.mobile});
      const page=await context.newPage();
      const errors=[],requests=[];
      page.on('pageerror',e=>errors.push(String(e)));
      page.on('request',r=>{if(r.method()!=='GET')requests.push(r.url()+' '+(r.postData()||''))});
      await page.goto(base+'/',{waitUntil:'domcontentloaded'});
      await page.locator('#speedHero').waitFor();

      // First visit: welcome card and header chip invite set-up; no blocking year pop-up
      await page.locator('.sp-welcome').waitFor();
      assert.match(await page.locator('.sp-welcome').innerText(),/No email or password needed/);
      assert.match(await page.locator('.sp-chip').innerText(),/Set up profile/);
      await page.waitForTimeout(900);
      assert.equal(await page.locator('#yearPick').isVisible(),false,'year pop-up waits while profile set-up is offered');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4),false,'no sideways scrolling');
      await page.screenshot({path:`/tmp/speedy-profiles-${view.id}-welcome.png`});

      // Set-up form asks for no email and refuses one
      await page.locator('.sp-welcome .sp-go').click();
      await page.locator('.sp-dialog input[name=name]').waitFor();
      assert.equal(await page.locator('.sp-dialog input[type=email], .sp-dialog input[type=password]').count(),0,'no email or password fields');
      await page.screenshot({path:`/tmp/speedy-profiles-${view.id}-add.png`});
      await page.locator('.sp-dialog input[name=name]').fill('ava@school.co.uk');
      await page.locator('.sp-dialog button[type=submit]').click();
      assert.match(await page.locator('.sp-error').innerText(),/No email needed/);

      await addLearner(page,{name:'Ava',buddy:'story',year:'Year 2'});
      assert.match(await page.locator('.sp-chip').innerText(),/Ava/);
      assert.equal(await page.locator('.sp-welcome').count(),0,'welcome card goes once a profile exists');
      assert.equal(await LS(page,'speedy-player'),'Ava');
      assert.equal(await LS(page,'speedy-year|Ava'),'Year 2');
      assert.deepEqual(await JS(page,'speedy-players'),['Ava'],'empty "Me" placeholder is tidied away');
      await page.locator('#speedJourneyApp .sj-avatar.selected[data-avatar=story]').waitFor();
      assert.match(await page.locator('#sjYear').inputValue(),/Year 2/);
      await page.waitForTimeout(700);
      assert.equal(await page.locator('#yearPick').isVisible(),false,'year already known, no pop-up');

      // Ava earns a star; a second learner starts fresh
      await earnMathsStar(page);
      assert.match(await page.locator('.sj-progress strong').innerText(),/1 stars/);
      await page.locator('.sp-chip').click();
      await page.locator('.sp-dialog .sp-tile.is-on').waitFor();
      await page.screenshot({path:`/tmp/speedy-profiles-${view.id}-picker.png`});
      await page.locator('.sp-dialog .sp-add').click();
      await addLearner(page,{name:'Ben',buddy:'spark',year:'Year 5'});
      assert.match(await page.locator('.sp-chip').innerText(),/Ben/);
      assert.match(await page.locator('.sj-progress strong').innerText(),/0 stars/,'Ben has his own island journey');
      await page.locator('#speedJourneyApp .sj-avatar.selected[data-avatar=spark]').waitFor();
      // Changing buddy on the island journey updates the profile too
      await page.locator('#speedJourneyApp .sj-avatar[data-avatar=sum]').click();
      await page.waitForFunction(()=>document.querySelector('.sp-chip img')?.getAttribute('src').includes('mascot-sum'));
      assert.equal((await JS(page,'speedy-profile-meta')).Ben.buddy,'sum');

      // Switch back to Ava: her star is still there
      await page.locator('.sp-chip').click();
      await Promise.all([page.waitForEvent('load'),page.locator('.sp-dialog .sp-tile',{hasText:'Ava'}).click()]);
      await page.locator('#speedJourneyApp .sj-map-pin').first().waitFor();
      assert.match(await page.locator('.sp-chip').innerText(),/Ava/);
      assert.match(await page.locator('.sj-progress strong').innerText(),/1 stars/);

      // Escape closes the picker
      await page.locator('.sp-chip').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.sp-overlay').isVisible(),false);

      // Grown-ups: rename Ben (his saved data moves) then remove him (two presses)
      await page.locator('.sp-chip').click();
      await page.locator('.sp-dialog .sp-link').click();
      await page.locator('.sp-dialog .sp-tile',{hasText:'Ben'}).click();
      await page.locator('.sp-dialog input[name=name]').fill('Benny');
      await page.locator('.sp-dialog button[type=submit]').click();
      await page.locator('.sp-dialog .sp-tile',{hasText:'Benny'}).waitFor();
      assert.equal(await LS(page,'speedy-year|Benny'),'Year 5');
      assert.equal(await LS(page,'speedy-year|Ben'),null);
      assert.ok(await LS(page,'speedy-island-journey-v1|Benny'),'island journey moved with the rename');
      await page.locator('.sp-dialog .sp-tile',{hasText:'Benny'}).click();
      await page.locator('.sp-remove').click();
      assert.match(await page.locator('.sp-remove-note').innerText(),/can't be undone/);
      await page.locator('.sp-remove').click();
      await page.locator('.sp-dialog .sp-tile',{hasText:'Ava'}).waitFor();
      assert.deepEqual(await JS(page,'speedy-players'),['Ava']);
      assert.equal(await LS(page,'speedy-island-journey-v1|Benny'),null,'removed learner\'s progress is deleted');
      await page.keyboard.press('Escape');

      // My Progress shows the profiles and can add one
      await page.goto(base+'/#progress',{waitUntil:'domcontentloaded'});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#who .kid.on',{hasText:'Ava'}).waitFor({timeout:8000});
      assert.match(await page.locator('#progress .whoNote').innerText(),/No email or password/);
      await page.locator('#addKid').click();
      await page.locator('.sp-dialog input[name=name]').waitFor();
      await page.keyboard.press('Escape');

      // Home Quest Atlas page shows who is learning
      await page.goto(base+'/quests/',{waitUntil:'domcontentloaded'});
      await page.locator('#findTitle').waitFor();
      await page.locator('.sp-chip',{hasText:'Ava'}).waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4),false,'quests page has no sideways scrolling');

      // Nothing about the learner left the device
      assert.ok(!requests.some(r=>/Ava|Ben|story|spark/.test(r)),'profile details are never sent: '+requests.join(' | '));
      assert.deepEqual(errors,[],view.id+' unexpected JS errors');
      console.log(`profiles ${view.id}: ok`);
      await context.close();
    }

    // A device that already has progress from before profiles: the first profile can keep it
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    await context.addInitScript(()=>{
      if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
      localStorage.setItem('speedy-players','["Me"]');localStorage.setItem('speedy-player','Me');localStorage.setItem('speedy-year|Me','Year 4');
      localStorage.setItem('speedy-log|Me',JSON.stringify([1,2,3].map(n=>({t:Date.now()-n*1000,s:'maths',d:'',topic:'',q:'1+'+n,a:String(1+n),ok:1}))));
      localStorage.setItem('speedy-island-journey-v1',JSON.stringify({year:'Year 4',hero:'scout',complete:{maths:true,reading:true},stars:2,visited:[]}));
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#speedJourneyApp .sj-map-pin').first().waitFor();
    assert.match(await page.locator('.sj-progress strong').innerText(),/2 stars/,'old island progress still shows');
    await page.locator('.sp-welcome .sp-go').click();
    assert.match(await page.locator('.sp-keep').innerText(),/3 answers/);
    await addLearner(page,{name:'Cara',buddy:'scout',year:'Year 4'});
    assert.deepEqual(await JS(page,'speedy-players'),['Cara']);
    assert.equal((await JS(page,'speedy-log|Cara')).length,3,'answers kept for the new profile');
    assert.equal(await LS(page,'speedy-log|Me'),null);
    assert.match(await page.locator('.sj-progress strong').innerText(),/2 stars/,'island stars kept for the new profile');
    assert.deepEqual(errors,[],'migration unexpected JS errors');
    console.log('profiles migration: ok');
    await context.close();
  }finally{await browser.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1});
