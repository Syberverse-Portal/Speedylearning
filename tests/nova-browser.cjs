/* Real Chromium browser smoke test. Runs only in free public-repo GitHub Actions.
 * Local static site, no connected user data, no network account or game service.
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
  await desktop.waitForFunction(()=>window.SpeedyNovaDiagnostics?.currentMode()==='intro');
  const title=await desktop.locator('h1').innerText();
  assert.match(title,/NOVA FORGE/);
  const canvas=await desktop.locator('#world').boundingBox();
  assert.ok(canvas.width>700&&canvas.height>280);
  await desktop.screenshot({path:'/tmp/nova-desktop-intro.png'});
  await desktop.locator('#start').click();
  await desktop.waitForFunction(()=>window.SpeedyNovaDiagnostics?.currentMode()==='forge');
  assert.equal(await desktop.locator('#shards .shard').count(),9);
  const puzzle=await desktop.evaluate(()=>window.SpeedyArcadeMaths.getGameData('Year 3',0));
  let pair;
  for(let i=0;i<9&&!pair;i++)for(let j=i+1;j<9;j++)
   if(puzzle.values[i]+puzzle.values[j]===puzzle.answer){pair=[i,j];break}
  assert.ok(pair);
  await desktop.locator('#shards .shard').nth(pair[0]).click();
  await desktop.locator('#shards .shard').nth(pair[1]).click();
  assert.equal(await desktop.locator('#shards .selected').count(),2);
  assert.match(await desktop.locator('#forgeFeedback').innerText(),/balanced/i);
  await desktop.screenshot({path:'/tmp/nova-desktop-forge.png',fullPage:true});
  await desktop.locator('#ignite').click();
  await desktop.waitForFunction(()=>window.SpeedyNovaDiagnostics?.currentMode()==='flight',{timeout:4000});
  await desktop.screenshot({path:'/tmp/nova-desktop-flight.png'});
  await desktop.locator('#pause').click();
  assert.equal(await desktop.evaluate(()=>window.SpeedyNovaDiagnostics.isPaused()),true);
  await desktop.locator('#pause').click();
  assert.equal(await desktop.evaluate(()=>window.SpeedyNovaDiagnostics.isPaused()),false);
  assert.deepEqual(errors,[],'Desktop should have no runtime errors');

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
  const mob=await mobile.goto(base+'/games/?stage=Year%201',{waitUntil:'networkidle'});
  assert.equal(mob.status(),200);
  await mobile.locator('#start').tap();
  await mobile.waitForFunction(()=>window.SpeedyNovaDiagnostics?.currentMode()==='forge');
  const stage=await mobile.locator('#stage').boundingBox();
  assert.ok(stage.width<=392,'Game stage should not overflow portrait mobile viewport');
  assert.equal(await mobile.locator('#shards .shard').count(),9);
  const size=await mobile.locator('#shards .shard').first().boundingBox();
  assert.ok(size.height>=44&&size.width>=44,'Touch targets should be comfortably sized');
  await mobile.locator('#methodDetails summary').tap();
  assert.equal(await mobile.locator('#work').isVisible(),true);
  await mobile.screenshot({path:'/tmp/nova-mobile-forge.png',fullPage:true});
  assert.deepEqual(mobileErrors,[],'Mobile should have no runtime errors');
  process.stdout.write('SUCCESS: Chrome desktop + mobile, 9 shards, solve and launch, pause and touch working notebook.\n');
 }finally{await browser.close()}
}
smoke().catch(err=>{console.error(err);process.exit(1)});
