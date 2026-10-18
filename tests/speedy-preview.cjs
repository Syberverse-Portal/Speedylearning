/* Visual QA snapshots: exact built pages, real Chromium render */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
async function run(){
 const browser=await chromium.launch({headless:true});
 const base='http://127.0.0.1:8765';
 try{
   const configs=[
    {id:'homepage-desktop',path:'/',width:1440,height:1000,wait:'#speedHero',mobile:false},
    {id:'homepage-mobile',path:'/',width:390,height:844,wait:'#speedHero',mobile:true},
    {id:'home-quests-desktop',path:'/quests/',width:1440,height:950,wait:'#findTitle',mobile:false},
    {id:'home-quests-mobile',path:'/quests/',width:390,height:844,wait:'#findTitle',mobile:true},
    {id:'visitor-console-desktop',path:'/console/',width:1440,height:900,wait:'#dashboard',mobile:false}
   ];
   for(const x of configs){
     const page=await browser.newPage({viewport:{width:x.width,height:x.height},isMobile:x.mobile,hasTouch:x.mobile,deviceScaleFactor:1});
     const errors=[];page.on('pageerror',e=>errors.push(String(e)));
     const response=await page.goto(base+x.path,{waitUntil:'domcontentloaded'});
     assert.equal(response.status(),200,'Site route '+x.path+' responds successfully');
     await page.locator(x.wait).waitFor({state:'visible',timeout:25000});
     if(x.path==='/'){
       await page.waitForFunction(()=>document.querySelectorAll('#menu .cat').length>=4,{timeout:18000}).catch(()=>{});
       await page.waitForTimeout(1100);
     }else{
       await page.waitForTimeout(650);
     }
     await page.screenshot({path:'/tmp/speedy-preview-'+x.id+'.png',fullPage:false,animations:'disabled'});
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4);
     console.log(x.id+' screenshot; overflow='+overflow+'; errors='+errors.join(';'));
     if(x.path==='/')assert.equal(overflow,false,'Homepage must not horizontally overflow viewport');
     assert.deepEqual(errors,[],x.id+' unexpected JS errors');
     await page.close();
   }
 }finally{await browser.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1});
