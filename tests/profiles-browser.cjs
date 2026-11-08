/* Logins in real Chromium against the real Worker (tests/harness/worker-harness.mjs on port 8765):
   username + 4-digit PIN, no email; progress follows the child to another device; siblings share a device;
   grown-ups change PINs, log out, recover and delete; older device-only profiles can make a login. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765';
const LS=(page,k)=>page.evaluate(key=>localStorage.getItem(key),k);
const JS=async(page,k)=>JSON.parse(await LS(page,k));
const api=(action,body)=>fetch(base+'/api/learner/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());

async function pin(page,digits){
  for(const d of digits)await page.locator(`.sp-dialog .sp-key[aria-label="${d}"]`).click();
}
async function reloaded(page,action){await Promise.all([page.waitForEvent('load'),action()]);await page.locator('.sp-chip').waitFor()}
async function makeLogin(page,{username,buddy,year,pinCode,viaWelcome}){
  if(viaWelcome)await page.locator('.sp-welcome .sp-go').click();
  else{await page.locator('.sp-chip').click();await page.locator('.sp-dialog .sp-add',{hasText:'New learner'}).click()}
  await page.locator('.sp-dialog input[name=username]').fill(username);
  await page.locator('.sp-dialog button[type=submit]').click();
  await page.locator(`.sp-dialog input[name=buddy][value=${buddy}]`).check({force:true});
  await page.locator(`.sp-dialog input[name=year][value="${year}"]`).check({force:true});
  await page.locator('.sp-dialog button[type=submit]').click();
  await page.locator('.sp-dialog .sp-keys').waitFor();
  await pin(page,pinCode);
  await page.locator('.sp-dialog #spTitle',{hasText:'again'}).waitFor();
  await pin(page,pinCode);
  await page.locator('.sp-dialog .sp-code').waitFor();
  return (await page.locator('.sp-dialog .sp-code').innerText()).trim();
}
async function logIn(page,{username,pinCode}){
  await page.locator('.sp-chip').click();
  await page.locator('.sp-dialog .sp-add',{hasText:'Log in'}).click();
  await page.locator('.sp-dialog input[name=username]').fill(username);
  await page.locator('.sp-dialog button[type=submit]').click();
  await page.locator('.sp-dialog .sp-keys').waitFor();
  await reloaded(page,()=>pin(page,pinCode));
}
async function earnMathsStar(page){
  await page.locator('#speedJourneyApp .sj-pin-maths').click();
  for(let i=0;i<2;i++){await page.locator('#speedQuestOverlay .sj-answer').first().click();await page.locator('#speedQuestOverlay .sj-big-button').first().click()}
  await page.locator('#sjBack').click();
}
const fakeAnswers=(page,name,n,t0)=>page.evaluate(([name,n,t0])=>{
  const k='speedy-log|'+name,log=JSON.parse(localStorage.getItem(k)||'[]');
  for(let i=0;i<n;i++)log.push({t:t0+i,s:'maths',d:'',topic:'Year 2 · Addition',q:`${i}+1`,a:String(i+1),ok:i%4?1:0});
  localStorage.setItem(k,JSON.stringify(log));
},[name,n,t0]);

async function run(){
  await fetch(base+'/__test/reset',{method:'POST'});
  const browser=await chromium.launch({headless:true});
  try{
    for(const view of [{id:'desktop',width:1366,height:900,mobile:false,user:'AvaStar7',pin:'4821',n:1200},{id:'mobile',width:390,height:844,mobile:true,user:'MiaComet22',pin:'5937',n:12}]){
      const ctx=await browser.newContext({viewport:{width:view.width,height:view.height},isMobile:view.mobile,hasTouch:view.mobile});
      const page=await ctx.newPage();
      const errors=[],urls=[];
      page.on('pageerror',e=>errors.push(String(e)));
      page.on('request',r=>urls.push(r.url()));
      await page.goto(base+'/',{waitUntil:'domcontentloaded'});
      await page.locator('#speedHero').waitFor();

      // First visit: invited to log in or make a login; no year pop-up on top
      await page.locator('.sp-welcome').waitFor();
      assert.match(await page.locator('.sp-welcome').innerText(),/username and a secret 4-number PIN[\s\S]*No email needed/);
      assert.match(await page.locator('.sp-chip').innerText(),/Log in/);
      await page.waitForTimeout(800);
      assert.equal(await page.locator('#yearPick').isVisible(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4),false,'no sideways scrolling');
      await page.screenshot({path:`/tmp/speedy-login-${view.id}-welcome.png`});

      // Sign-up refuses an email, offers an idea, refuses an easy PIN and a mismatched PIN
      await page.locator('.sp-welcome .sp-go').click();
      await page.locator('.sp-dialog input[name=username]').fill('ava@school.co.uk');
      await page.locator('.sp-dialog button[type=submit]').click();
      assert.match(await page.locator('.sp-dialog .sp-error').innerText(),/No email needed/);
      await page.locator('.sp-dialog .sp-idea').click();
      await page.waitForFunction(()=>/^[A-Z][a-z]+[A-Z][a-z]+\d\d$/.test(document.querySelector('.sp-dialog input[name=username]').value));
      assert.equal(await page.locator('.sp-dialog input[type=email], .sp-dialog input[type=password]').count(),0,'no email or password boxes');
      await page.screenshot({path:`/tmp/speedy-login-${view.id}-username.png`});
      await page.keyboard.press('Escape');
      const code=await (async()=>{
        await page.locator('.sp-welcome .sp-go').click();
        await page.locator('.sp-dialog input[name=username]').fill(view.user);
        await page.locator('.sp-dialog button[type=submit]').click();
        await page.locator('.sp-dialog input[name=buddy][value=story]').check({force:true});
        await page.locator('.sp-dialog input[name=year][value="Year 2"]').check({force:true});
        await page.screenshot({path:`/tmp/speedy-login-${view.id}-buddy.png`});
        await page.locator('.sp-dialog button[type=submit]').click();
        await pin(page,'1234');
        await page.locator('.sp-pin-msg',{hasText:'too easy'}).waitFor();
        await page.screenshot({path:`/tmp/speedy-login-${view.id}-pin.png`});
        await pin(page,view.pin);
        await page.locator('.sp-dialog #spTitle',{hasText:'again'}).waitFor();
        await pin(page,'9999');
        await page.locator('.sp-pin-msg',{hasText:"didn't match"}).waitFor();
        await pin(page,view.pin);await page.locator('.sp-dialog #spTitle',{hasText:'again'}).waitFor();await pin(page,view.pin);
        await page.locator('.sp-dialog .sp-code').waitFor();
        await page.screenshot({path:`/tmp/speedy-login-${view.id}-done.png`});
        return (await page.locator('.sp-dialog .sp-code').innerText()).trim();
      })();
      assert.match(code,/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      assert.match(await page.locator('.sp-card-user').innerText(),new RegExp(view.user));
      await reloaded(page,()=>page.locator('.sp-dialog .sp-go',{hasText:'Start learning'}).click());
      assert.match(await page.locator('.sp-chip').innerText(),new RegExp(view.user));
      assert.equal(await page.locator('.sp-welcome').count(),0);
      await page.locator('#speedJourneyApp .sj-avatar.selected[data-avatar=story]').waitFor();
      assert.equal(await page.locator('#yearPick').isVisible(),false);

      // Progress made on this device is saved to the login
      await earnMathsStar(page);
      await fakeAnswers(page,view.user,view.n,Date.now()-600000); // desktop: big enough to be sent in several pieces
      assert.equal(await page.evaluate(()=>SpeedyProfiles.syncNow()),true);
      if(view.n>500)assert.ok(urls.filter(u=>u.endsWith('/api/learner/sync')).length>=3,'big uploads go in small pieces');
      const stored=Object.entries(await page.evaluate(()=>({...localStorage})));
      assert.ok(!stored.some(([k,v])=>v.includes(view.pin)&&!/^speedy-(log|done)\|/.test(k)),'the PIN itself is never stored on the device');
      assert.ok(!urls.some(u=>u.includes(view.pin)),'the PIN is never put in a web address');

      // A second device: log in with username and PIN and carry on
      const ctx2=await browser.newContext({viewport:{width:view.width,height:view.height},isMobile:view.mobile,hasTouch:view.mobile});
      const tablet=await ctx2.newPage();
      tablet.on('pageerror',e=>errors.push('tablet: '+e));
      await tablet.goto(base+'/',{waitUntil:'domcontentloaded'});
      await tablet.locator('.sp-welcome').waitFor();
      await tablet.locator('.sp-welcome .sp-ghost',{hasText:'I have a login'}).click();
      await tablet.locator('.sp-dialog input[name=username]').fill('nosuchuser1');
      await tablet.locator('.sp-dialog button[type=submit]').click();
      await tablet.locator('.sp-dialog .sp-error',{hasText:"can't find that username"}).waitFor();
      await tablet.locator('.sp-dialog input[name=username]').fill(view.user.toLowerCase());
      await tablet.locator('.sp-dialog button[type=submit]').click();
      await pin(tablet,'1111');
      await tablet.locator('.sp-pin-msg',{hasText:'4 more tries'}).waitFor();
      await reloaded(tablet,()=>pin(tablet,view.pin));
      assert.match(await tablet.locator('.sp-chip').innerText(),new RegExp(view.user));
      await tablet.locator('#speedJourneyApp .sj-map-pin').first().waitFor();
      assert.match(await tablet.locator('.sj-progress strong').innerText(),/1 stars/,'island star followed the child');
      assert.equal((await JS(tablet,'speedy-log|'+view.user)).length,view.n,'answers followed the child');
      assert.equal(await LS(tablet,'speedy-year|'+view.user),'Year 2');

      // The tablet answers more; the first device picks them up next time it opens
      await fakeAnswers(tablet,view.user,5,Date.now());
      assert.equal(await tablet.evaluate(()=>SpeedyProfiles.syncNow()),true);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(([u,n])=>JSON.parse(localStorage.getItem('speedy-log|'+u)||'[]').length===n,[view.user,view.n+5],{timeout:8000});
      await ctx2.close();

      // The new tracker
      await page.goto(base+'/#progress',{waitUntil:'domcontentloaded'});await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('.trk-hero h2',{hasText:'Hi '+view.user}).waitFor({timeout:8000});
      assert.match(await page.locator('.trk-level').innerText(),/Level \d/);
      assert.match(await page.locator('.trk-next').innerText(),/YOUR NEXT STEP|Your next step/i);
      assert.equal(await page.locator('.trk-week li').count(),7);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4),false,'tracker has no sideways scrolling');
      await page.screenshot({path:`/tmp/speedy-tracker-${view.id}.png`,fullPage:true});
      await page.locator('.trk-subject',{hasText:'Maths'}).click();
      await page.waitForFunction(()=>/Maths/.test(document.getElementById('sub').textContent));

      assert.deepEqual(errors,[],view.id+' unexpected JS errors');
      console.log(`logins ${view.id}: ok`);
      await ctx.close();
    }

    // A shared family device: a sibling needs their own PIN; grown-up tools work
    {
      const ctx=await browser.newContext({viewport:{width:1280,height:900}});
      const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(base+'/',{waitUntil:'domcontentloaded'});
      await logIn(page,{username:'AvaStar7',pinCode:'4821'});
      await page.locator('.sp-chip').click();
      await page.locator('.sp-dialog .sp-add',{hasText:'New learner'}).click();
      await page.locator('.sp-dialog input[name=username]').fill('BenBolt');
      await page.locator('.sp-dialog button[type=submit]').click();
      await page.locator('.sp-dialog input[name=buddy][value=spark]').check({force:true});
      await page.locator('.sp-dialog button[type=submit]').click();
      await pin(page,'5930');await page.locator('.sp-dialog #spTitle',{hasText:'again'}).waitFor();await pin(page,'5930');
      const benCode=(await page.locator('.sp-dialog .sp-code').innerText()).trim();
      await reloaded(page,()=>page.locator('.sp-close').click());
      assert.match(await page.locator('.sp-chip').innerText(),/BenBolt/);
      assert.match(await page.locator('.sj-progress strong').innerText(),/0 stars/,'Ben starts with his own journey');
      // Switching to Ava needs Ava's PIN
      await page.locator('.sp-chip').click();
      await page.locator('.sp-dialog .sp-tile',{hasText:'AvaStar7'}).click();
      await page.screenshot({path:'/tmp/speedy-login-unlock.png'});
      await pin(page,'5930');
      await page.locator('.sp-pin-msg',{hasText:"isn't right"}).waitFor();
      await reloaded(page,()=>pin(page,'4821'));
      assert.match(await page.locator('.sp-chip').innerText(),/AvaStar7/);
      assert.match(await page.locator('.sj-progress strong').innerText(),/1 stars/);
      // Grown-ups: change Ben's PIN, then log Ben out of this device
      await page.locator('.sp-chip').click();
      await page.locator('.sp-dialog .sp-link',{hasText:'Grown-ups'}).click();
      await page.screenshot({path:'/tmp/speedy-login-manage.png'});
      await page.locator('.sp-dialog .sp-tile',{hasText:'BenBolt'}).click();
      assert.match(await page.locator('.sp-saved').innerText(),/Saved online/);
      await page.locator('.sp-dialog button',{hasText:'Change PIN'}).click();
      await pin(page,'5930');await pin(page,'6047');await page.locator('.sp-dialog #spTitle',{hasText:'again'}).waitFor();await pin(page,'6047');
      await page.locator('.sp-dialog .sp-error',{hasText:'New PIN saved'}).waitFor();
      assert.equal((await api('login',{username:'BenBolt',pin:'6047'})).profile.username,'BenBolt');
      await page.locator('.sp-dialog button',{hasText:'Log out on this device'}).click();
      assert.match(await page.locator('.sp-remove-note').innerText(),/stays saved online/);
      await page.locator('.sp-dialog button',{hasText:'Yes, log BenBolt out'}).click();
      await page.locator('.sp-dialog #spTitle',{hasText:'manage logins'}).waitFor();
      assert.deepEqual(await JS(page,'speedy-players'),['AvaStar7']);
      assert.equal(await LS(page,'speedy-session|BenBolt'),null);
      // Forgotten PIN: a grown-up uses Ben's recovery code
      await page.locator('.sp-dialog .sp-go',{hasText:'Done'}).click();
      await page.locator('.sp-dialog .sp-add',{hasText:'Log in'}).click();
      await page.locator('.sp-dialog input[name=username]').fill('BenBolt');
      await page.locator('.sp-dialog button[type=submit]').click();
      await page.locator('.sp-dialog .sp-link',{hasText:'Forgot your PIN'}).click();
      await page.locator('.sp-dialog input[name=code]').fill(benCode.toLowerCase());
      await page.locator('.sp-dialog button[type=submit]').click();
      await pin(page,'7302');await page.locator('.sp-dialog #spTitle',{hasText:'again'}).waitFor();
      await reloaded(page,()=>pin(page,'7302'));
      assert.match(await page.locator('.sp-chip').innerText(),/BenBolt/);
      // Delete Ben's login completely (needs his PIN)
      await page.locator('.sp-chip').click();
      await page.locator('.sp-dialog .sp-link',{hasText:'Grown-ups'}).click();
      await page.locator('.sp-dialog .sp-tile',{hasText:'BenBolt'}).click();
      await page.locator('.sp-dialog .sp-remove',{hasText:'Delete'}).click();
      await pin(page,'1111');
      await page.locator('.sp-pin-msg',{hasText:"isn't right"}).waitFor();
      await reloaded(page,()=>pin(page,'7302'));
      assert.equal((await api('check',{username:'BenBolt'})).free,true,'Ben\'s login and progress are deleted');
      assert.deepEqual(errors,[],'shared device unexpected JS errors');
      console.log('logins shared device: ok');
      await ctx.close();
    }

    // A device with progress from before logins (and an older device-only profile) keeps it
    {
      const ctx=await browser.newContext({viewport:{width:1280,height:900}});
      await ctx.addInitScript(()=>{
        if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
        localStorage.setItem('speedy-players','["Cara"]');localStorage.setItem('speedy-player','Cara');localStorage.setItem('speedy-profiles-welcome','done');
        localStorage.setItem('speedy-profile-meta',JSON.stringify({Cara:{buddy:'scout',created:1}}));localStorage.setItem('speedy-year|Cara','Year 4');
        localStorage.setItem('speedy-log|Cara',JSON.stringify([1,2,3].map(n=>({t:Date.now()-n*1000,s:'maths',d:'',topic:'',q:'1+'+n,a:String(1+n),ok:1}))));
        localStorage.setItem('speedy-island-journey-v1|Cara',JSON.stringify({year:'Year 4',hero:'scout',complete:{maths:true,reading:true},stars:2,visited:[]}));
      });
      const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(base+'/',{waitUntil:'domcontentloaded'});
      await page.locator('#speedJourneyApp .sj-map-pin').first().waitFor();
      assert.match(await page.locator('.sp-chip').innerText(),/Log in/);
      await page.locator('.sp-chip').click();
      await page.locator('.sp-dialog .sp-tile',{hasText:'Cara'}).click();
      assert.equal(await page.locator('.sp-dialog input[name=username]').inputValue(),'Cara');
      await page.locator('.sp-dialog input[name=username]').fill('CaraOwl44');
      await page.locator('.sp-dialog button[type=submit]').click();
      assert.match(await page.locator('.sp-keep').innerText(),/3 answers/);
      await page.locator('.sp-dialog button[type=submit]').click();
      await pin(page,'3141');await page.locator('.sp-dialog #spTitle',{hasText:'again'}).waitFor();await pin(page,'3141');
      await reloaded(page,()=>page.locator('.sp-dialog .sp-go',{hasText:'Start learning'}).click());
      assert.deepEqual(await JS(page,'speedy-players'),['CaraOwl44']);
      assert.equal((await JS(page,'speedy-log|CaraOwl44')).length,3);
      assert.match(await page.locator('.sj-progress strong').innerText(),/2 stars/);
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('speedy-log|CaraOwl44')).every(x=>x._s));
      const login=await api('login',{username:'caraowl44',pin:'3141'});
      assert.equal(JSON.parse(login.progress['speedy-log']).length,3,'kept progress was saved to the new login');
      assert.ok(login.progress['speedy-island-journey-v1']);
      assert.deepEqual(errors,[],'migration unexpected JS errors');
      console.log('logins upgrade old profile: ok');
      await ctx.close();
    }
  }finally{await browser.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1});
