/* SpeedyLearning Adventure Journey — actual learning challenges, not a static illustration.
   Progress stays on this browser. No child names, account or analytics are required. */
(() => {
  "use strict";
  const KEY = "speedylearning-adventure-v1";
  const YEARS = ["Reception","Year 1","Year 2","Year 3","Year 4","Year 5","Year 6"];
  const HEROES = [
    {id:"dash",name:"Dash",tag:"Brave explorer",color:"#3186e9"},
    {id:"sum",name:"Sum",tag:"Number wizard",color:"#ffa938"},
    {id:"story",name:"Story",tag:"Book buddy",color:"#ad7bf0"},
    {id:"scribble",name:"Scribble",tag:"Creative star",color:"#38c9cc"},
    {id:"scout",name:"Scout",tag:"Curious detective",color:"#54c871"},
    {id:"spark",name:"Spark",tag:"Game champion",color:"#f5c13e"}
  ];
  const CHAPTERS = [
    {id:"maths",name:"Maths Mountain",emoji:"⛰️",guide:"sum",colour:"#479ded",place:"Cross the Number Bridge",desc:"Numbers are scattered across the mountain. Help Sum put them back in order!",
     missions:["The Number Bridge","Crystal Patterns","The Mountain Gate"],link:"/?adventure=maths"},
    {id:"reading",name:"Reading Forest",emoji:"📚",guide:"story",colour:"#a775f1",place:"Find the Secret Story",desc:"The forest's magical books have lost their endings. Read the clues to rescue each story.",
     missions:["The Missing Clue","Word Wizard","The Secret Passage"],link:"/?adventure=reading"},
    {id:"writing",name:"Writing Woods",emoji:"✏️",guide:"scribble",colour:"#28c4cd",place:"Create a New Tale",desc:"Your imagination can rebuild the writing woods, one brilliant sentence at a time.",
     missions:["Magic Sentence","Punctuation Portal","The Story Seed"],link:"/?adventure=writing"},
    {id:"science",name:"Science Lab",emoji:"🧪",guide:"scout",colour:"#64c96f",place:"Save the Crystal Garden",desc:"Investigate curious clues and use science to bring the island back to life.",
     missions:["Plant Power","Magnets and Materials","Amazing Habitats"],link:"/quests/"},
    {id:"games",name:"Game Galaxy",emoji:"🎮",guide:"spark",colour:"#7664e8",place:"Rescue the Galaxy Stars",desc:"The galaxy needs sharp thinking. Solve patterns and puzzles to power the starship.",
     missions:["Star Pattern","Planet Logic","Galaxy Code"],link:"/games/"},
    {id:"treasure",name:"Treasure Cove",emoji:"🎁",guide:"dash",colour:"#f3b949",place:"Open the Treasure Chest",desc:"You made it! Use everything you've learned to claim your explorer's treasure.",
     missions:["The Golden Number","The Final Riddle","Explorer's Treasure"],link:"/"}
  ];
  const icon=id=>"/assets/mascot-"+id+".svg";
  const byId=id=>document.getElementById(id);
  const escape=s=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const defaults=()=>({avatar:"dash",year:"Year 3",done:[],dailyDates:[]});
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||"null"),v={...defaults(),...(raw||{})};
      v.avatar=HEROES.some(h=>h.id===v.avatar)?v.avatar:"dash";
      v.year=YEARS.includes(v.year)?v.year:"Year 3";
      v.done=Array.isArray(v.done)?[...new Set(v.done.filter(x=>typeof x==="string" && CHAPTERS.some(c=>c.missions.some((_,i)=>x===c.id+":"+i))))]:[];
      v.dailyDates=Array.isArray(v.dailyDates)?v.dailyDates.filter(x=>/^\d{4}-\d\d-\d\d$/.test(x)).slice(-50):[];
      return v;
    }catch(e){return defaults()}
  }
  let progress=load(),active=null,feedbackTimer=null;
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(progress))}catch(e){announce("Progress could not be stored in this browser.")}
  }
  const complete=(chapter,index)=>progress.done.includes(CHAPTERS[chapter].id+":"+index);
  const completedChapter=chapter=>CHAPTERS[chapter].missions.every((_,i)=>complete(chapter,i));
  const chapterUnlocked=chapter=>chapter===0||completedChapter(chapter-1);
  const completedCount=()=>progress.done.length;
  const finishedChapters=()=>CHAPTERS.filter((_,i)=>completedChapter(i)).length;
  const stars=()=>completedCount()*3+finishedChapters()*5+progress.dailyDates.length*2;
  const xp=()=>completedCount()*20+finishedChapters()*40+progress.dailyDates.length*10;
  const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
  function announce(message){const a=byId("adventureAnnouncer");if(a)a.textContent=message}
  function avatarMarkup(id,classes=""){return '<img class="'+classes+'" src="'+icon(id)+'" width="90" height="95" alt="" loading="lazy">'}
  function chapterButtons(){
    return CHAPTERS.map((c,i)=>{
      const unlocked=chapterUnlocked(i),done=completedChapter(i),count=c.missions.filter((_,n)=>complete(i,n)).length;
      return '<button type="button" class="island-spot island-'+c.id+(unlocked?' is-open':' is-locked')+(done?' is-complete':'')+'" data-island="'+i+'" aria-label="'+escape(c.name)+': '+(done?"completed":unlocked?count+" of 3 missions complete":"locked")+'" style="--island-color:'+c.colour+'">'+
      '<span class="island-status">'+(done?"✓":unlocked?c.emoji:"🔒")+'</span><span class="island-name">'+escape(c.name)+'</span><span class="island-count">'+(unlocked?count+"/3 missions":"Unlock soon")+'</span></button>';
    }).join("");
  }
  function chapterList(){
    return CHAPTERS.map((c,i)=>{
      const enabled=chapterUnlocked(i),count=c.missions.filter((_,n)=>complete(i,n)).length,done=completedChapter(i);
      return '<button type="button" data-island="'+i+'" class="adventure-chapter'+(done?' done':'')+'" style="--island-color:'+c.colour+'" aria-label="'+escape(c.name)+'. '+(enabled?count+' of 3 completed':'Locked until previous island complete')+'">'+
       '<span class="chapter-art">'+avatarMarkup(c.guide)+'</span><span class="chapter-copy"><b>'+escape(c.name)+'</b><small>'+escape(c.place)+'</small></span>'+
       '<span class="chapter-progress">'+(done?'🏅':enabled?count+'/3':'🔒')+'</span></button>';
    }).join("");
  }
  function render(){
    const main=byId("adventure");
    if(!main)return;
    const curr=CHAPTERS.findIndex((c,i)=>chapterUnlocked(i)&&!completedChapter(i));
    const next=curr<0?CHAPTERS.length-1:curr;
    const guide=HEROES.find(x=>x.id===progress.avatar);
    const earned=completedCount();
    main.innerHTML=
    '<section class="adventure-welcome" aria-labelledby="adventure-heading">'+
     '<div class="welcome-copy"><span class="adventure-eyebrow">✦ THE SPEEDYLEARNING ADVENTURE ✦</span>'+
     '<h1 id="adventure-heading">Your world of <em>learning adventures!</em></h1>'+
     '<p>Travel through magical islands, solve real challenges, earn stars and unlock new worlds. Every little victory takes you further!</p>'+
     '<div class="adventure-toolbar"><label for="adventureYear">My school year</label><select id="adventureYear">'+YEARS.map(y=>'<option'+(progress.year===y?' selected':'')+'>'+y+'</option>').join('')+'</select>'+
     '<button type="button" id="adventureContinue" class="adventure-primary">▶ Continue Adventure</button></div>'+
     '<div class="welcome-note">No sign-in needed · Progress saves on this device · All challenges are free</div></div>'+
     '<div class="welcome-guide">'+avatarMarkup(progress.avatar,'adventure-hero-img')+'<span class="guide-bubble">Hi! I’m '+escape(guide.name)+'. Let’s explore! ⭐</span>'+
     '<button class="guide-change" type="button" id="changeGuide">Change my character ↔</button></div>'+
     '</section>'+
     '<section class="adventure-dashboard" aria-label="Your adventure achievements">'+
     '<div class="dashboard-stat"><span>⭐</span><div><b id="adventureStars">'+stars()+'</b><small>Stars earned</small></div></div>'+
     '<div class="dashboard-stat"><span>⚡</span><div><b>'+xp()+'</b><small>Explorer points</small></div></div>'+
     '<div class="dashboard-stat"><span>🏅</span><div><b>'+finishedChapters()+' / '+CHAPTERS.length+'</b><small>Island badges</small></div></div>'+
     '<div class="dashboard-stat"><span>🎯</span><div><b>'+earned+' / 18</b><small>Challenges completed</small></div></div>'+
     '</section>'+
     '<section class="map-section" aria-labelledby="map-title">'+
     '<div class="map-head"><div><h2 id="map-title">🗺️ Your Adventure Map</h2><p>Tap an unlocked island. Complete its three missions to unlock the next world.</p></div><span class="map-legend">🟢 Ready · 🔒 Locked · 🏅 Completed</span></div>'+
     '<div class="adventure-map" role="group" aria-label="The floating learning islands">'+
      '<img src="/assets/speedy-island-map.svg" width="1024" height="645" alt="Illustrated floating islands linked by bridges and waterfalls." class="adventure-map-image" id="adventureMapImage">'+chapterButtons()+
      '<div class="map-cloud map-cloud-left" aria-hidden="true"></div></div>'+
     '<div class="chapter-grid" aria-label="Islands and mission status">'+chapterList()+'</div></section>'+
     '<section class="adventure-bottom"><div class="daily-card"><span class="daily-icon">🎲</span><div><h2>Today’s Mystery Quest</h2><p>Solve a fresh little puzzle for bonus stars. One reward each day!</p><strong>'+(progress.dailyDates.includes(today())?"🌟 Today's reward collected!":"✨ 2 bonus stars waiting")+'</strong></div><button type="button" class="adventure-secondary" id="dailyQuest">Play Mystery Quest ➜</button></div>'+
     '<div class="passport-card" id="rewards"><h2>🏆 Explorer Passport</h2><div class="passport-stamps">'+CHAPTERS.map((c,i)=>'<span class="passport-stamp'+(completedChapter(i)?' earned':'')+'" title="'+escape(c.name)+'" aria-label="'+escape(c.name)+' '+(completedChapter(i)?'earned':'not yet earned')+'">'+(completedChapter(i)?c.emoji:"☆")+'</span>').join('')+'</div><p>Earn a stamp for each completed island.</p><button type="button" class="plain-button" id="resetAdventure">Start my journey again</button></div></section>'+
     '<div class="adventure-links"><a href="/">← All learning subjects</a><a href="/games/">Play Nova Forge →</a><a href="/quests/">Home Quest Atlas →</a></div>';
    if(document.querySelector(".adventure-page .speed-top")) {
      document.querySelectorAll('.adventure-page .speed-top nav a').forEach(a=>{
        if(a.textContent.includes("Learning Journey")){a.href="/journey/";a.setAttribute("aria-current","page")}
        if(a.textContent.includes("Rewards"))a.href="/journey/#rewards";
      });
    }
    byId("adventureContinue").addEventListener("click",()=>openChapter(next));
    byId("changeGuide").addEventListener("click",chooseGuide);
    byId("adventureYear").addEventListener("change",e=>{progress.year=YEARS.includes(e.target.value)?e.target.value:"Year 3";save();render();announce("Questions adjusted for "+progress.year)});
    byId("dailyQuest").addEventListener("click",dailyQuest);
    byId("resetAdventure").addEventListener("click",()=>{if(confirm("Start your learning journey from the beginning? This resets your stars and island badges on this device.")){progress=defaults();save();render();announce("Your new journey is ready.")}});
    main.querySelectorAll("[data-island]").forEach(btn=>btn.addEventListener("click",()=>openChapter(Number(btn.dataset.island))));
    if(location.hash==="#rewards")setTimeout(()=>byId("rewards")?.scrollIntoView({block:"center"}),60);
  }
  function openDialog(content){
    const modal=byId("missionDialog");
    byId("missionDialogBody").innerHTML=content;
    if(!modal.open){if(typeof modal.showModal==="function")modal.showModal();else modal.setAttribute("open","")}
    const close=modal.querySelector('[data-close]');
    close?.addEventListener("click",()=>modal.close());
    modal.querySelector("button:not([data-close])")?.focus();
  }
  function closeDialog(){const modal=byId("missionDialog");if(modal.open)modal.close()}
  function chooseGuide(){
    openDialog('<button class="modal-close" data-close type="button" aria-label="Close">✕</button>'+
     '<h2 id="missionTitle">Choose your adventure buddy!</h2><p class="mission-intro">All six characters will cheer you on.</p>'+
     '<div class="guide-options">'+HEROES.map(h=>'<button class="guide-option'+(progress.avatar===h.id?' selected':'')+'" type="button" data-guide="'+h.id+'" aria-pressed="'+(progress.avatar===h.id)+'">'+avatarMarkup(h.id)+'<b>'+h.name+'</b><small>'+h.tag+'</small></button>').join('')+'</div>');
    byId("missionDialogBody").querySelectorAll("[data-guide]").forEach(btn=>btn.addEventListener("click",()=>{progress.avatar=btn.dataset.guide;save();closeDialog();render();announce("Your new adventure buddy is "+progress.avatar)}));
  }
  function openChapter(index){
    if(!Number.isInteger(index)||index<0||index>=CHAPTERS.length)return;
    if(!chapterUnlocked(index)){announce("That island is locked. Finish the previous island first.");openDialog('<button data-close class="modal-close" aria-label="Close" type="button">✕</button><div class="mission-symbol">🔒</div><h2 id="missionTitle">The bridge is still hidden!</h2><p class="mission-intro">Complete all three missions on '+escape(CHAPTERS[index-1].name)+' to unlock this island.</p><button data-close class="adventure-primary" type="button">Back to the map</button>');return}
    const chapter=CHAPTERS[index],todo=chapter.missions.findIndex((_,i)=>!complete(index,i));
    const indexNext=todo>=0?todo:0;
    active={chapter:index,step:indexNext};
    openDialog('<button data-close class="modal-close" aria-label="Close" type="button">✕</button>'+
     '<div class="mission-chapter-art">'+avatarMarkup(chapter.guide)+'</div>'+
     '<span class="adventure-eyebrow">WELCOME TO '+escape(chapter.name.toUpperCase())+'</span>'+
     '<h2 id="missionTitle">'+escape(chapter.place)+'</h2><p class="mission-intro">'+escape(chapter.desc)+'</p>'+
     '<div class="mission-trail">'+chapter.missions.map((label,i)=>'<span class="'+(complete(index,i)?'finished':i===indexNext?'next':'')+'">'+(complete(index,i)?'✓':i+1)+'. '+escape(label)+'</span>').join('')+'</div>'+
     '<button id="beginMission" class="adventure-primary" type="button">'+(todo>=0?"Start next mission ➜":"Replay an island challenge ➜")+'</button>'+
     '<a class="mission-practice" href="'+chapter.link+'">Practise more in '+escape(chapter.name)+' →</a>');
    byId("beginMission").addEventListener("click",()=>openMission(index,indexNext));
  }
  const quiz=(question,options,answer,explainer,reading="")=>({kind:"choice",question,options,answer,explanation:explainer,reading});
  const writing=(question,minWords,guide)=>({kind:"writing",question,minWords,guide});
  function mathChallenge(step,year){
    const y=YEARS.indexOf(year);
    if(step===0){
      const bank=[
       ["Count the stars: ⭐ ⭐ ⭐ ⭐",["3","4","5","6"],"4","Count each star one by one."],
       ["What is 7 + 5?",["10","11","12","13"],"12","7 + 3 = 10, then 2 more makes 12."],
       ["What is 14 + 8?",["18","20","22","24"],"22","14 + 6 = 20, then 2 more makes 22."],
       ["What is 7 × 4?",["21","24","28","32"],"28","7 groups of 4 make 28."],
       ["What is 144 ÷ 12?",["10","11","12","14"],"12","12 multiplied by 12 is 144."],
       ["What is three quarters of 20?",["5","10","15","18"],"15","A quarter of 20 is 5, so three quarters are 15."],
       ["What is 25% of 240?",["40","50","60","80"],"60","25% is one quarter. 240 divided by 4 is 60."]
      ]; const b=bank[y];return quiz(b[0],b[1],b[2],b[3]);
    }
    if(step===1){
      const bank=[
       ["What comes next? 1, 2, 3, …",["4","5","6","7"],"4","We are counting up in ones."],
       ["What comes next? 10, 12, 14, …",["15","16","17","18"],"16","The pattern adds 2 each time."],
       ["What comes next? 5, 10, 15, …",["18","20","25","30"],"20","We count in fives."],
       ["What comes next? 3, 6, 12, 24, …",["30","36","48","56"],"48","Each number is doubled."],
       ["What comes next? 2, 5, 8, 11, …",["13","14","15","16"],"14","Each number increases by 3."],
       ["What comes next? 1, 4, 9, 16, …",["20","24","25","36"],"25","These are square numbers: 1², 2², 3², 4², 5²."],
       ["What comes next? 3, 9, 27, 81, …",["162","243","270","324"],"243","Each term is multiplied by 3."]
      ];const b=bank[y];return quiz(b[0],b[1],b[2],b[3]);
    }
    const bank=[
      ["You have 2 shells and find 3 more. How many?",["4","5","6","7"],"5","Count on three from two."],
      ["There are 9 birds. 4 fly away. How many remain?",["4","5","6","7"],"5","9 take away 4 is 5."],
      ["Three boxes hold 4 stars each. How many stars?",["7","10","12","16"],"12","4 + 4 + 4 is 12."],
      ["The treasure costs 35 coins. You have 50. What change?",["10","15","20","25"],"15","50 - 35 = 15."],
      ["Six chests have 9 coins each. How many in all?",["45","54","56","63"],"54","6 multiplied by 9 is 54."],
      ["A trail is 2.5 km. You walk 1.75 km. How far left?",["0.25 km","0.75 km","1 km","1.25 km"],"0.75 km","2.50 minus 1.75 is 0.75."],
      ["3/5 of the 40 stars are blue. How many blue stars?",["16","20","24","30"],"24","One fifth of 40 is 8; three fifths is 24."]
    ];const b=bank[y];return quiz(b[0],b[1],b[2],b[3]);
  }
  function readingChallenge(step,year){
    if(step===0)return quiz("Where did Milo shelter when the rain started?",["In a cave","Under an oak tree","Inside a tent","On a hill"],"Under an oak tree","The story says Milo waited under an oak tree.","Milo carried a red kite into the forest. Dark clouds gathered. When rain started, he waited under an oak tree.");
    if(step===1){
      const advanced=YEARS.indexOf(year)>3;
      return advanced?quiz('Which word most nearly means "cautious"?',["Careful","Noisy","Hasty","Tired"],"Careful","A cautious person thinks carefully before acting."):quiz('Which word means almost the same as "happy"?',["Glad","Cold","Slow","Angry"],"Glad","Glad and happy describe a similar feeling.");
    }
    return quiz("Why did Amara check the bridge before crossing?",["She wanted to paint it","She wanted to count its colours","She wanted to make sure it was safe","She was looking for a book"],"She wanted to make sure it was safe","Checking the planks helps her cross safely.","The old bridge creaked. Amara stopped, checked each plank and then crossed carefully. Her friends followed.");
  }
  function writingChallenge(step,year){
    const y=YEARS.indexOf(year);
    if(step===0)return writing("Write a sentence about a magical island. What could you see there?",y<2?4:y<5?8:14,"Start with a capital letter and finish with a full stop, question mark or exclamation mark.");
    if(step===1)return quiz("Which sentence uses punctuation correctly?",["the dragon smiled.","The dragon smiled.","The dragon smiled","the Dragon Smiled"],"The dragon smiled.","A sentence begins with a capital letter and usually ends with punctuation.");
    return writing("Write about an adventure with your mascot. Describe what happens and how your character feels.",y<2?7:y<5?15:25,"Try describing a place, an action and a feeling. We check basic completion, not how creative your story is.");
  }
  function scienceChallenge(step){
    const b=[
      ["What do most green plants need to grow well?",["Sunlight and water","Only stones","Darkness and no water","Only sand"],"Sunlight and water","Plants usually need light, water, air and nutrients."],
      ["Which object is usually attracted to a magnet?",["Wooden pencil","Iron nail","Rubber band","Paper cup"],"Iron nail","Iron is a magnetic metal."],
      ["Why does a polar bear have thick fur?",["To float like a boat","To stay warm in cold places","To change colour each day","To dig through metal"],"To stay warm in cold places","Thick fur helps trap warmth in a cold habitat."]
    ];return quiz(...b[step]);
  }
  function gamesChallenge(step,year){
    const b=[
      ["A rocket flashes blue, yellow, blue, yellow. What flashes next?",["Green","Yellow","Blue","Red"],"Blue","The colours alternate in a repeating pattern."],
      ["You find three keys: one is round, one square and one triangular. Which key has 3 corners?",["Round","Square","Triangular","All three"],"Triangular","A triangle has three corners."],
      ["A robot moves two steps forward, turns right, then moves one step. What should it do first?",["Turn left","Move two steps forward","Jump backwards","Stop"],"Move two steps forward","Follow instructions in the order given."]
    ];return quiz(...b[step]);
  }
  function treasureChallenge(step,year){
    if(step===0)return mathChallenge(2,year);
    if(step===1)return quiz("The chest was hidden behind the waterfall. Where should our explorers look?",["On a mountain peak","Behind the waterfall","Under the bridge","Inside a tree"],"Behind the waterfall","Look for the detail in the first sentence.","A golden chest was hidden behind the waterfall. The explorers listened to the river and followed its sparkling spray.");
    return quiz("What helped the explorers reach Treasure Cove?",["Skipping every challenge","Learning, trying again and helping each other","Only collecting coins","Avoiding new ideas"],"Learning, trying again and helping each other","Every adventure grows through curiosity, practise and kindness.");
  }
  function getTask(chapter,step){
    const id=CHAPTERS[chapter].id;
    if(id==="maths")return mathChallenge(step,progress.year);
    if(id==="reading")return readingChallenge(step,progress.year);
    if(id==="writing")return writingChallenge(step,progress.year);
    if(id==="science")return scienceChallenge(step);
    if(id==="games")return gamesChallenge(step,progress.year);
    return treasureChallenge(step,progress.year);
  }
  function openMission(chapter,step){
    if(!chapterUnlocked(chapter))return;
    active={chapter,step};
    const c=CHAPTERS[chapter],task=getTask(chapter,step);
    const pre='<button data-close type="button" class="modal-close" aria-label="Close mission">✕</button>'+
      '<div class="mission-topline"><span>'+c.emoji+' '+escape(c.name)+'</span><span>Mission '+(step+1)+' of 3</span></div>'+
      '<div class="mission-progress"><span style="width:'+((step+1)*33.333)+'%"></span></div>'+
      '<div class="mission-helper">'+avatarMarkup(c.guide)+'<span>You can do this! Have a go. ⭐</span></div>'+
      '<h2 id="missionTitle">'+escape(c.missions[step])+'</h2>';
    if(task.kind==="choice"){
      openDialog(pre+(task.reading?'<blockquote class="reading-clue">'+escape(task.reading)+'</blockquote>':'')+
       '<p class="mission-question">'+escape(task.question)+'</p>'+
       '<div class="mission-choices">'+task.options.map((option,i)=>'<button class="mission-answer" data-answer="'+i+'" type="button">'+escape(option)+'</button>').join("")+'</div>'+
       '<p id="missionFeedback" role="status" aria-live="polite" class="mission-feedback"></p>');
      const buttons=[...byId("missionDialogBody").querySelectorAll("[data-answer]")];
      buttons.forEach((button,i)=>button.addEventListener("click",()=>{
        if(buttons.some(x=>x.disabled))return;
        const correct=task.options[i]===task.answer;
        if(correct){button.classList.add("correct");buttons.forEach(x=>x.disabled=true);byId("missionFeedback").textContent="✨ Correct! "+task.explanation;setTimeout(()=>missionWon(chapter,step),430)}
        else{button.classList.add("try-again");byId("missionFeedback").textContent="Good try! Look for a clue and choose again.";announce("Try again");setTimeout(()=>button.classList.remove("try-again"),600)}
      }));
    }else{
      openDialog(pre+'<p class="mission-question">'+escape(task.question)+'</p>'+
       '<label for="storyAnswer" class="writing-label">My writing</label>'+
       '<textarea id="storyAnswer" class="mission-writing" rows="5" maxlength="1400" placeholder="Write your ideas here..."></textarea>'+
       '<p class="writing-tip">💡 '+escape(task.guide)+'</p>'+
       '<p class="writing-count" id="writingCount">0 words · Aim for at least '+task.minWords+'</p>'+
       '<button class="adventure-primary" id="checkWriting" type="button">Finish my writing ➜</button>'+
       '<p id="missionFeedback" role="status" aria-live="polite" class="mission-feedback"></p>');
      const area=byId("storyAnswer");
      area.addEventListener("input",()=>{byId("writingCount").textContent=wordCount(area.value)+" words · Aim for at least "+task.minWords});
      byId("checkWriting").addEventListener("click",()=>{
        const s=area.value.trim(),words=wordCount(s);
        if(words<task.minWords){byId("missionFeedback").textContent="You're on your way! Add a little more detail to reach "+task.minWords+" words.";area.focus();return}
        if(!/[.!?]$/.test(s)){byId("missionFeedback").textContent="Great ideas! Can you finish with a full stop, question mark or exclamation mark?";area.focus();return}
        if(!/^[A-Z]/.test(s)){byId("missionFeedback").textContent="Almost there! Start your sentence with a capital letter.";area.focus();return}
        byId("missionFeedback").textContent="Beautiful effort! Your own ideas helped this island grow.";missionWon(chapter,step);
      });
    }
  }
  function wordCount(text){return text.trim()?text.trim().split(/\s+/).length:0}
  function missionWon(chapter,step){
    const id=CHAPTERS[chapter].id+":"+step;
    const first=!progress.done.includes(id);
    if(first)progress.done.push(id);
    save();
    const c=CHAPTERS[chapter],isLast=step===2,chapterComplete=completedChapter(chapter);
    let nextAction;
    if(!isLast)nextAction='<button id="nextMission" class="adventure-primary" type="button">Next mission ➜</button>';
    else if(chapter<CHAPTERS.length-1)nextAction='<button id="nextIsland" class="adventure-primary" type="button">Explore the next island ➜</button>';
    else nextAction='<button id="finishJourney" class="adventure-primary" type="button">See my explorer passport 🏆</button>';
    openDialog('<button data-close class="modal-close" type="button" aria-label="Close">✕</button>'+
      '<div class="success-confetti" aria-hidden="true">✦ ⭐ ✨ ⭐ ✦</div>'+
      '<div class="mission-success-icon">'+(chapterComplete?"🏅":"🌟")+'</div>'+
      '<h2 id="missionTitle">'+(chapterComplete?'Island complete!':'Brilliant work!')+'</h2>'+
      '<p class="mission-intro">'+(chapterComplete?"You earned the "+escape(c.name)+" stamp and unlocked a new adventure!":"You solved "+escape(c.missions[step])+"!")+'</p>'+
      '<div class="mission-earned">'+(first?'+3 stars · +20 Explorer points':'Replay complete · stars already collected')+'</div>'+
      '<div class="mission-actions">'+nextAction+'<button id="toMap" type="button" class="adventure-secondary">Back to map</button></div>');
    const btn=byId("nextMission");if(btn)btn.addEventListener("click",()=>openMission(chapter,step+1));
    const next=byId("nextIsland");if(next)next.addEventListener("click",()=>openChapter(chapter+1));
    byId("toMap")?.addEventListener("click",()=>{closeDialog();render();byId("map-title")?.scrollIntoView({behavior:"smooth"})});
    byId("finishJourney")?.addEventListener("click",()=>{closeDialog();render();byId("rewards")?.scrollIntoView({behavior:"smooth"})});
    announce(chapterComplete?c.name+" unlocked the next island. You earned a badge!":"Challenge complete. Stars earned!");
  }
  function dailyQuest(){
    const puzzles=[
      quiz("What is 8 + 7?",["13","14","15","16"],"15","8 and 7 make 15."),
      quiz("What comes next? ⭐ 🌙 ⭐ 🌙 ...",["🌙","⭐","☀️","🌈"],"⭐","The pattern alternates star and moon."),
      quiz("Which animal is a mammal?",["Butterfly","Frog","Dolphin","Lizard"],"Dolphin","Dolphins breathe air and feed their young milk."),
      quiz("Which word is spelled correctly?",["Becaus","Because","Beacuse","Becuase"],"Because","Because has two e's, with au in the middle."),
      quiz("Which planet do we live on?",["Mars","Earth","Venus","Jupiter"],"Earth","Earth is our home planet.")
    ];
    const seed=Number(today().replace(/-/g,"")),task=puzzles[seed%puzzles.length];
    openDialog('<button data-close class="modal-close" type="button" aria-label="Close">✕</button>'+
     '<div class="mission-success-icon">🎲</div><h2 id="missionTitle">Today’s Mystery Quest</h2>'+
     '<p class="mission-question">'+escape(task.question)+'</p><div class="mission-choices">'+task.options.map((x,i)=>'<button data-daily-answer="'+i+'" type="button" class="mission-answer">'+escape(x)+'</button>').join("")+'</div>'+
     '<p class="mission-feedback" id="missionFeedback" role="status"></p>');
    byId("missionDialogBody").querySelectorAll("[data-daily-answer]").forEach(btn=>btn.addEventListener("click",()=>{
      if(task.options[Number(btn.dataset.dailyAnswer)]===task.answer){
        const already=progress.dailyDates.includes(today());
        if(!already){progress.dailyDates.push(today());progress.dailyDates=progress.dailyDates.slice(-50);save()}
        openDialog('<button data-close class="modal-close" type="button" aria-label="Close">✕</button><div class="mission-success-icon">✨</div><h2 id="missionTitle">Mystery solved!</h2><p class="mission-intro">'+(already?"Nice replay! Tomorrow brings a new puzzle.":"You earned 2 bonus stars. Come back tomorrow for a new mystery!")+'</p><button class="adventure-primary" id="dailyBack" type="button">Back to Adventure Map ➜</button>');
        byId("dailyBack").addEventListener("click",()=>{closeDialog();render()});
      }else{byId("missionFeedback").textContent="Not quite! Try another answer."}
    }));
  }
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    const dialog=byId("missionDialog");
    dialog?.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
    document.querySelector(".speed-top nav a[href='/#journey']")?.setAttribute("href","/journey/");
    window.SpeedyJourneyDiagnostics={progress:()=>JSON.parse(JSON.stringify(progress)),unlocked:chapterUnlocked,openChapter,openMission,complete,chapters:()=>CHAPTERS.map(x=>x.id)};
  });
})();
