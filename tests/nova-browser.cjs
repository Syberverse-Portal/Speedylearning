/* Chromium integration: physically steer the ship, use powers, solve maths,
 * win a rescue; also verify touch/mobile gameplay and JS console.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function smoke(){
 const base='http://127.0.0.1:8765';
 const browser=await chromium.launch({headless:true});
 try{
  const desktop=await browser.newPage({viewport:{width:1360,height:900},deviceScaleFactor:1});
  const errors=[];desktop.on('pageerror',e=>errors.push(String(e)));
  const resp=await desktop.goto(base+'/games/?stage=Year%203',{waitUntil:'networkidle'});
  assert.equal(resp.status(),200);
  await desktop.waitForFunction(()=>window.SpeedyRescueDiagnostics?.mode()==='intro');
  assert.match(await desktop.locator('h1').innerText(),/NOVA FORGE/);
  assert.ok((await desktop.locator('#world').boundingBox()).height>400);
  await desktop.screenshot({path:'/tmp/nova-star-rescue-desktop-intro.png'});
  await desktop.locator('#launch').click();
  await desktop.waitForFunction(()=>window.SpeedyRescueDiagnostics?.mode()==='playing');
  const before=await desktop.evaluate(()=>window.SpeedyRescueDiagnostics.position());
  await desktop.keyboard.down('ArrowRight');
  await desktop.waitForTimeout(340);
  await desktop.keyboard.up('ArrowRight');
  const after=await desktop.evaluate(()=>window.SpeedyRescueDiagnostics.position());
  assert.ok(after.x>before.x+.025,'Desktop right key really moves the ship');
  await desktop.locator('#pulse').click();
  assert.ok((await desktop.evaluate(()=>window.SpeedyRescueDiagnostics.pulseCooldown()))>0);
  await desktop.locator('#dash').click();
  assert.ok((await desktop.evaluate(()=>window.SpeedyRescueDiagnostics.dashCooldown()))>0);
  await desktop.screenshot({path:'/tmp/nova-star-rescue-desktop-play.png'});
  // Accessible maths controls solve the SAME missions as flying to crystals.
  await desktop.locator('#accessibleChoices').evaluate(el=>el.closest('details').open=true);
  for(let level=0;level<3;level++){
   await desktop.waitForTimeout(800); // collision/pickup cooldown
   const {options,mission}=await desktop.evaluate(()=>({
     options:window.SpeedyRescueDiagnostics.options(),
     mission:window.SpeedyRescueDiagnostics.mission()
   }));
   assert.ok(mission && options.length===4);
   const correct=options.findIndex(o=>o.value===mission.answer);
   assert.ok(correct>=0,'Each level contains its mathematically correct crystal');
   await desktop.locator('#accessibleChoices button').nth(correct).click();
  }
  await desktop.waitForFunction(()=>window.SpeedyRescueDiagnostics?.mode()==='victory');
  assert.equal(await desktop.locator('#victory').isVisible(),true);
  await desktop.screenshot({path:'/tmp/nova-star-rescue-desktop-victory.png'});
  assert.deepEqual(errors,[],'No JS runtime errors on desktop: '+errors.join(','));

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
  const mob=await mobile.goto(base+'/games/?stage=Year%201',{waitUntil:'networkidle'});
  assert.equal(mob.status(),200);
  await mobile.locator('#launch').tap();
  await mobile.waitForFunction(()=>window.SpeedyRescueDiagnostics?.mode()==='playing');
  const bbox=await mobile.locator('#world').boundingBox();
  assert.ok(bbox.width<=392&&bbox.height>=400,'Game world fits portrait screen');
  const start=await mobile.evaluate(()=>window.SpeedyRescueDiagnostics.position());
  await mobile.locator('#right').dispatchEvent('pointerdown',{pointerId:7});
  await mobile.waitForTimeout(330);
  await mobile.locator('#right').dispatchEvent('pointerup',{pointerId:7});
  const moved=await mobile.evaluate(()=>window.SpeedyRescueDiagnostics.position());
  assert.ok(moved.x>start.x+.015,'Holding touch direction button moves the ship');
  const pSize=await mobile.locator('#pulse').boundingBox();
  assert.ok(pSize.height>=44,'Touch Pulse ability has usable hit area');
  await mobile.locator('#pulse').tap();
  assert.ok((await mobile.evaluate(()=>window.SpeedyRescueDiagnostics.pulseCooldown()))>0);
  await mobile.screenshot({path:'/tmp/nova-star-rescue-mobile-play.png',fullPage:true});
  assert.deepEqual(mobileErrors,[],'No JS runtime errors on mobile: '+mobileErrors.join(','));
  process.stdout.write('SUCCESS: Spaceflight movement, Dash/Pulse, 3 real Maths rifts, victory, mobile touch controls.\n');
 }finally{await browser.close();}
}
smoke().catch(err=>{console.error(err);process.exit(1)});
