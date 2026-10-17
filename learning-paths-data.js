/* SpeedyLearning Home Quest Atlas: curated, local-first starter library.
   Area labels are broad thematic associations, NOT verified statutory objective codes. */
window.SpeedyQuestCatalog = {
  version: 1,
  sources: {
    en: {label:"England",name:"National Curriculum / EYFS",url:"https://www.gov.uk/government/publications/national-curriculum-in-england-primary-curriculum",
      stages:[{id:"R",name:"Reception",tier:"e",note:"Early years: play, talk and explore"},{id:"Y1",name:"Year 1",tier:"b"},{id:"Y2",name:"Year 2",tier:"b"},{id:"Y3",name:"Year 3",tier:"g"},{id:"Y4",name:"Year 4",tier:"g"},{id:"Y5",name:"Year 5",tier:"x"},{id:"Y6",name:"Year 6",tier:"x"}]},
    wa: {label:"Wales / Cymru",name:"Curriculum for Wales",url:"https://hwb.gov.wales/curriculum-for-wales",
      stages:[{id:"PS1",name:"Progression step 1",tier:"e",note:"Broad reference point around age 5, not a fixed year"},{id:"PS2",name:"Progression step 2",tier:"g",note:"Broad reference point around age 8"},{id:"PS3",name:"Progression step 3",tier:"x",note:"Broad reference point around age 11"}]},
    sc: {label:"Scotland",name:"Curriculum for Excellence",url:"https://education.gov.scot/curriculum-for-excellence/curriculum-for-excellence-benchmarks/",
      stages:[{id:"EARLY",name:"Early level",tier:"e",note:"Broadly early years through P1"},{id:"FIRST",name:"First level",tier:"g",note:"Broadly P2–P4"},{id:"SECOND",name:"Second level",tier:"x",note:"Broadly P5–P7"}]},
    ni: {label:"Northern Ireland",name:"Northern Ireland Curriculum",url:"https://www.education-ni.gov.uk/articles/statutory-curriculum",
      stages:[{id:"FOUND",name:"Foundation Stage",tier:"e",note:"P1–P2"},{id:"KS1",name:"Key Stage 1",tier:"g",note:"P3–P4"},{id:"KS2",name:"Key Stage 2",tier:"x",note:"P5–P7"}]}
  },
  areas: {
    number:{icon:"🔢",label:"Numeracy",game:"maths",subjectKeys:["maths","sats"],names:{en:"Mathematics",wa:"Mathematics and Numeracy",sc:"Numeracy and Mathematics",ni:"Mathematics and Numeracy"}},
    language:{icon:"📖",label:"Language & literacy",game:"grammar",subjectKeys:["grammar","spelling","comprehension","reading","writing"],names:{en:"English / Literacy",wa:"Languages, Literacy and Communication",sc:"Literacy and English",ni:"Language and Literacy"}},
    science:{icon:"🔬",label:"Science & discovery",game:"science",subjectKeys:["science","animals"],names:{en:"Science / Understanding the World",wa:"Science and Technology",sc:"Sciences",ni:"The World Around Us"}},
    world:{icon:"🌍",label:"People & places",game:"geography",subjectKeys:["geography","history","flags"],names:{en:"History / Geography",wa:"Humanities",sc:"Social Studies",ni:"The World Around Us"}},
    digital:{icon:"💻",label:"Digital & design thinking",game:"computing",subjectKeys:["computing","technology"],names:{en:"Computing / Design and Technology",wa:"Science and Technology",sc:"Technologies",ni:"Using ICT / The World Around Us"}},
    arts:{icon:"🎨",label:"Creativity",game:"art",subjectKeys:["art","music","stories"],names:{en:"Art and Design / Music",wa:"Expressive Arts",sc:"Expressive Arts",ni:"The Arts"}},
    wellbeing:{icon:"💚",label:"Life skills",game:"pshe",subjectKeys:["pshe","health","pe"],names:{en:"Personal, Social and Health Education (not a National Curriculum subject)",wa:"Health and Well-being",sc:"Health and Wellbeing",ni:"Personal Development and Mutual Understanding"}}
  },
  tiers: {e:"Explore together",b:"Build confidence",g:"Find the pattern",x:"Think more deeply"},
  /* Each level: [child-friendly Learn prompt, hands-on Do activity, Explain-to-someone prompt].
     Every quest uses inexpensive home materials; never requires accounts or collecting a child's work. */
  quests: [
    {id:"little-shop",area:"number",icon:"🛒",title:"The kitchen-table shop",duration:10,materials:"Paper price tags and pretend coins",why:"Use numbers to make decisions in an everyday shop.",levels:{
      e:["Practise counting objects one by one, up to five.","Put five small objects on a table. Give one to your shopkeeper for each pretend coin.","How do you know how many objects are left?"],
      b:["Prices tell us how many pennies something costs.","Make three price tags below 20p. Choose two items and add their prices with pretend coins.","Explain how you checked the total."],
      g:["A budget tells us the most we can spend.","Create a £5 pretend budget. Price four items in pence and decide which three you can afford.","Which combination was best value, and why?"],
      x:["Compare prices using totals, unit prices and estimates.","Give two pretend shops different pack sizes and prices. Work out which has the lower price per item.","Explain how your method avoids a misleading bargain."]}},
    {id:"fraction-picnic",area:"number",icon:"🥪",title:"The paper picnic",duration:10,materials:"Paper circles, coloured pencils",why:"Fractions become easier when you can see equal parts.",levels:{
      e:["A half is one of two equal parts.","Fold a paper circle into two equal pieces. Colour one half.","Why must the parts be equal?"],
      b:["Quarters are four equal parts of a whole.","Fold two circles into halves and quarters. Colour two quarters and one half.","What looks the same about these amounts?"],
      g:["Equivalent fractions name the same amount.","Show a half as two quarters and four eighths using folded paper.","Explain why 1/2, 2/4 and 4/8 are equal."],
      x:["Find a fraction of a collection, not just a shape.","Draw 24 imaginary picnic snacks. Find 3/8 of them, then 1/3.","Which quantity is greater? Prove it without guessing."]}},
    {id:"time-travel",area:"number",icon:"⏰",title:"Catch the imaginary bus",duration:10,materials:"Paper clock and pencil",why:"Time skills help us plan journeys without rushing.",levels:{
      e:["We can describe events as before, now and after.","Draw morning, lunchtime and bedtime in order.","What happens first, next and last?"],
      b:["Minutes pass as the hands move around a clock.","Draw a clock showing 3 o'clock and half past 3.","How many minutes lie between those times?"],
      g:["Timetables let us plan how long a journey lasts.","Invent a bus departing at 14:20 and taking 35 minutes.","Explain how you found its arrival time."],
      x:["A multi-stop journey can cross the hour or midday.","Invent a train leaving at 11:45, travelling 1 hour 35 minutes, with a 20-minute transfer.","What time do you finish? Show two ways to check."]}},
    {id:"measure-mission",area:"number",icon:"📏",title:"Design a tiny room",duration:12,materials:"Ruler, paper and five small items",why:"Measuring helps designers create spaces that work.",levels:{
      e:["We can compare shorter, longer, taller and smaller.","Line up three safe objects from shortest to longest.","What did you look at to compare them fairly?"],
      b:["A ruler measures length in centimetres.","Measure and draw the outline of a book, rounding to whole centimetres.","How did you decide where to start your measurement?"],
      g:["Perimeter measures the distance around a shape.","Draw a rectangle measuring 6 cm by 4 cm and calculate its perimeter.","Why do you add all four sides?"],
      x:["Area measures space inside; perimeter measures distance around.","Create two different rectangles with an area of 24 square units.","Can their perimeters differ? Show your evidence."]}},
    {id:"weather-station",area:"number",icon:"🌦️",title:"Three-day weather detective",duration:8,materials:"Paper tally chart; weather observed safely through a window",why:"Turn observations into patterns and honest evidence.",levels:{
      e:["Pictures can show what we notice.","Draw a symbol for today's weather and another for yesterday's if you remember it.","How is the weather similar or different?"],
      b:["A tally chart can record observations.","Make a seven-box weather chart and track sunny, cloudy or rainy days.","Which kind appears most often?"],
      g:["Bar charts help compare different totals.","Make a bar chart of imaginary weather data: 3 sunny, 2 rainy, 4 cloudy days.","What can your chart tell us, and what can't it?"],
      x:["We should distinguish real observations from predictions.","Record three real daytime observations, then plot and compare them with an invented forecast.","How reliable would a trend be after only three observations?"]}},
    {id:"sound-hunt",area:"language",icon:"🔤",title:"The sound-and-word safari",duration:10,materials:"Paper and pencil; objects already in the room",why:"Spelling, sounds and word parts make reading clearer.",levels:{
      e:["Words can begin with the same sound.","Find three objects with sounds you can hear at the start. A grown-up can say their names.","Which two start with the same sound?"],
      b:["Letters can represent sounds, including digraphs.","Find five familiar words with sh, ch or th. Say and sort them.","Which letters work together to make each sound?"],
      g:["Prefixes and suffixes can change a word's meaning.","Write happy, unhappy, happily; then invent two more related word families.","How does each added part change the meaning?"],
      x:["Words can carry clues in roots, prefixes and context.","Choose five unfamiliar words from a suitable book; guess using word parts, then check a dictionary.","Which clue helped you most, and when did it mislead you?"]}},
    {id:"story-detective",area:"language",icon:"🕵️",title:"The story clue lab",duration:12,materials:"A favourite age-appropriate book or a short story on SpeedyLearning",why:"Strong readers use evidence, not just guesses.",levels:{
      e:["Pictures and words help tell a story.","Look at one page and describe who is there and what happens.","Which part of the page gave you that idea?"],
      b:["A character's actions can give us clues about feelings.","Read a short scene and choose a feeling for its main character.","Which word or action was your clue?"],
      g:["An inference is a reasonable idea supported by evidence.","Read a paragraph and find two clues to what a character might do next.","What evidence supports your prediction?"],
      x:["Authors choose details to guide what readers think.","Compare the narrator's claims with what other characters actually do.","Which interpretation is best supported, and what evidence challenges it?"]}},
    {id:"letter-to-the-future",area:"language",icon:"✉️",title:"A letter that matters",duration:12,materials:"Paper, pencil and an imaginary recipient",why:"We write differently depending on who is listening.",levels:{
      e:["A message has a purpose.","Draw a picture to invite a teddy to a pretend picnic, then add a word or label.","How will the teddy know what you want?"],
      b:["Clear sentences help people understand us.","Write three sentences inviting a fictional friend to a pretend event.","What information would your friend still need?"],
      g:["Persuasive writing gives reasons.","Write a short letter asking for a class reading corner, with two sensible reasons.","Which reason would convince someone most?"],
      x:["A good argument considers another viewpoint.","Write a proposal for improving an imaginary playground, including a possible objection and response.","How did you keep your proposal fair and convincing?"]}},
    {id:"make-a-headline",area:"language",icon:"📰",title:"True story or tall tale?",duration:10,materials:"Pencil and invented headlines",why:"Learn to notice the difference between evidence and opinion.",levels:{
      e:["Some sentences tell us facts, and others are wishes.","Say two things you can see and two things you would like.","How do you know which you can check?"],
      b:["A headline should match what happened.","Invent a harmless event: a toy fell from a table. Write one accurate headline and one silly one.","Which headline tells the truth?"],
      g:["We can check whether information has a reliable source.","Invent two reports of a make-believe sports day, one with evidence and one with rumours.","What would you ask before believing them?"],
      x:["A claim is stronger when there is evidence from more than one trustworthy source.","Compare two made-up claims about an imaginary event and list what evidence is missing.","How would you verify the claim without sharing anyone's private details?"]}},
    {id:"seed-lab",area:"science",icon:"🌱",title:"The seed scientist",duration:12,materials:"Dry bean or seed, paper and a magnifying glass if available",why:"Careful observations can test scientific ideas.",levels:{
      e:["Plants are living things that change as they grow.","Examine a safe dry seed and draw what it looks like.","What do you think could happen to it over time?"],
      b:["Many plants need water, light and a suitable environment.","Draw two imaginary plants getting different amounts of water.","How could you test whether water changes growth?"],
      g:["A fair test changes one main factor at a time.","Plan two identical seed pots with different watering schedules; no planting required.","Which things must stay the same to make it fair?"],
      x:["Evidence becomes stronger when we repeat measures.","Design a table for daily shoot height across a week, with a comparison group.","What limitations might affect your conclusion?"]}},
    {id:"materials-detective",area:"science",icon:"🧪",title:"The waterproof challenge",duration:12,materials:"Paper, foil, washable cloth and a few water drops, with an adult",why:"Designers choose materials because of their properties.",levels:{
      e:["Materials can feel and look different.","Compare clean paper, fabric and foil by touch and sight.","Which is smooth, bendy or rough?"],
      b:["We can test which material stops water.","With adult help, place a few drops on paper, foil and cloth.","Which lets water through? How do you know?"],
      g:["A fair test uses the same amount of water each time.","Write a plan to compare three materials for an imaginary raincoat.","What should you keep constant?"],
      x:["Selecting materials involves trade-offs.","Compare how well materials resist water, bend and can be reused.","Which would you choose for a reusable bag, and why?"]}},
    {id:"shadow-lab",area:"science",icon:"🔦",title:"The disappearing shadow",duration:10,materials:"Torch, toy and paper; never look directly at the sun",why:"Light and shadows help us understand what we observe.",levels:{
      e:["A shadow appears when something blocks light.","Use a torch and toy to make a shadow on a wall.","Where does the dark shape come from?"],
      b:["Changing the light can change a shadow.","With a grown-up, move the torch to different safe positions.","How does the shadow move?"],
      g:["We can predict changes using what we know about light.","Keep a toy fixed, move the torch closer and farther, and sketch the shadows.","What pattern did you notice?"],
      x:["Light tends to travel in straight lines.","Use a torch and card screen to predict shadow length and direction before testing.","Where was your prediction wrong, and why?"]}},
    {id:"habitat-watch",area:"science",icon:"🐞",title:"Tiny habitat guardians",duration:12,materials:"Pencil and a safe view of a garden, window or picture book",why:"Small living things depend on their surroundings.",levels:{
      e:["Living things need suitable places to live.","Look at a picture of a tree or garden and spot three living things.","What might each need to stay safe?"],
      b:["Different habitats support different living things.","Compare two safe places or pictures: a park and a pond.","Why might animals differ between them?"],
      g:["Food chains show who eats what.","Draw a simple imaginary chain: sunlight, plant, insect, bird.","What might happen if plants disappeared?"],
      x:["A habitat is a connected system.","Plan an ethical observation of two small habitats without disturbing wildlife.","What evidence would help you compare biodiversity fairly?"]}},
    {id:"map-a-world",area:"world",icon:"🗺️",title:"The secret mapmaker",duration:10,materials:"Paper and pencil; use fictional places, not home addresses",why:"Maps are useful models of places.",levels:{
      e:["A map is a picture showing where things are.","Draw a pretend treasure island with three landmarks.","How would someone find the treasure?"],
      b:["Symbols and directions help us read maps.","Make a map of a pretend park with a key, and mark north.","How do you follow a route using the map?"],
      g:["Maps use scale to represent a bigger place.","Draw an imaginary garden on a grid with 1 square representing 1 metre.","How far is it from the gate to the tree?"],
      x:["Different maps suit different questions.","Compare a transport route map with a physical landscape map.","What information does each show well or leave out?"]}},
    {id:"time-capsule",area:"world",icon:"⏳",title:"The everyday time capsule",duration:10,materials:"Picture of an old object or household item",why:"History starts with asking how people lived.",levels:{
      e:["Old and new objects can do similar jobs.","Compare a drawing of an old telephone with a modern phone.","What changed, and what stayed the same?"],
      b:["A timeline puts events in order.","Make a timeline of three fictional inventions.","How do you know which came first?"],
      g:["An artefact is a clue about the past.","Look at a photo of a historical object and list questions an historian might ask.","What can the object tell you, and what can't it prove?"],
      x:["Different sources give us different viewpoints.","Compare a museum description and a fictional person's diary entry about the same invented event.","Why might their accounts differ?"]}},
    {id:"community-fixer",area:"world",icon:"🏘️",title:"Make an imaginary town kinder",duration:12,materials:"Paper and pencils",why:"Communities work better when different needs are considered.",levels:{
      e:["People in a community help one another.","Draw an imaginary town with places where people learn, play and get help.","Who uses each place?"],
      b:["Different people may need different things.","Invent a safe crossing for a fictional park, drawing where it should go.","Who would benefit from your idea?"],
      g:["Choices have costs and benefits.","Spend ten imaginary community tokens on a library, trees or safe cycle paths.","Why did you choose those priorities?"],
      x:["Good civic decisions consider evidence and accessibility.","Write a short proposal for a fictional neighbourhood improvement, including different users' needs.","What is one drawback to your plan, and how could you address it?"]}},
    {id:"algorithm-chef",area:"digital",icon:"🤖",title:"Robot instructions, human creativity",duration:10,materials:"Pencil, paper and a toy robot or imagined robot",why:"Algorithms are instructions; testing helps us debug them.",levels:{
      e:["Instructions work best in a clear order.","Tell a grown-up robot how to draw a square using four simple steps.","Which direction was confusing?"],
      b:["An algorithm has ordered instructions.","Write directions for an imaginary robot to cross a 4×4 paper grid.","What happens if you swap two steps?"],
      g:["Debugging means finding and fixing a mistake.","Invent a five-step algorithm with one wrong instruction and ask someone to spot it.","How did you test that the fix worked?"],
      x:["Complex problems can be broken into smaller steps.","Design a repeating set of instructions for a robot to draw a tiled pattern.","How could a loop make your algorithm shorter?"]}},
    {id:"digital-detective",area:"digital",icon:"🛡️",title:"The secret-keeper challenge",duration:10,materials:"Paper and made-up characters; no real accounts or passwords",why:"Being safe online means choosing what to share.",levels:{
      e:["Some information is private.","With a grown-up, sort invented examples into 'okay to share' and 'ask an adult first'.","Why should we ask before sharing someone's picture?"],
      b:["A surprising message online might not be genuine.","Read an invented message asking for a child's address in a game. Choose a safe response.","Who could help if a message felt strange?"],
      g:["We can question online claims and requests.","Sort imaginary website pop-ups into safe, suspicious and uncertain.","Which clue would make you stop and ask a trusted adult?"],
      x:["Digital footprints can last a long time.","Plan how a fictional character could review a public post before sharing.","What might another person misunderstand or save?"]}},
    {id:"bridge-builder",area:"digital",icon:"🌉",title:"One-sheet bridge challenge",duration:12,materials:"One sheet of paper, two books and 5 small coins, adult supervision",why:"Engineers test and improve rather than guessing.",levels:{
      e:["Some shapes can support objects better than others.","Rest a paper strip between two books and place one small coin in the centre.","What happens if you fold the paper?"],
      b:["Testing can show whether a design works.","Try a flat paper bridge and a folded paper bridge with the same coin.","Which supported the coin better?"],
      g:["Engineers change one feature at a time.","Design three paper bridge folds using the same gap between books.","What evidence shows your best design?"],
      x:["Good engineering balances strength, material use and repeatability.","Record how many small coins each paper bridge can safely hold, then redesign using less paper.","What was the trade-off between material and strength?"]}},
    {id:"pattern-orchestra",area:"arts",icon:"🎶",title:"Make a pattern orchestra",duration:10,materials:"Clapping, tapping or household objects used gently",why:"Patterns connect music, numbers and creativity.",levels:{
      e:["A repeating rhythm is a pattern we can hear.","Clap-tap-clap-tap, then invite someone to copy.","What comes next?"],
      b:["Rhythms can use groups of beats.","Make a four-beat rhythm and repeat it three times.","How can you keep the beat steady?"],
      g:["Changing a pattern changes how music feels.","Create two eight-beat rhythms, one repeating and one with a surprise ending.","How does the change affect the listener?"],
      x:["Music uses structure, variation and purposeful choices.","Compose a 16-beat rhythm using A-B-A-C sections.","How do repetition and variation work together?"]}},
    {id:"art-of-observation",area:"arts",icon:"🎨",title:"A world made of shapes",duration:10,materials:"Paper and pencils; any colours optional",why:"Artists practise looking closely and making choices.",levels:{
      e:["Pictures can use lines, shapes and colour.","Draw a favourite safe object using three basic shapes.","Which shape was easiest to recognise?"],
      b:["Artists can make a focal point.","Draw the same toy twice, once close-up and once far away.","What changed about the picture?"],
      g:["Perspective changes how objects seem in a picture.","Draw a road or path with two lines that appear to meet in the distance.","How does your drawing suggest depth?"],
      x:["Design choices can communicate a message.","Make two posters for an imaginary community event with contrasting colour and layout choices.","Which poster communicates most clearly, and why?"]}},
    {id:"kindness-engineers",area:"wellbeing",icon:"💚",title:"The small-kindness laboratory",duration:10,materials:"Paper, pencil and fictional scenarios",why:"Thinking about different viewpoints helps us treat others well.",levels:{
      e:["People can feel differently about the same thing.","Draw a happy face and a worried face for two pretend characters.","What could make each feel safe?"],
      b:["Kind words can change how a situation feels.","Act out a pretend situation where someone cannot join a game.","What could you say to include them?"],
      g:["Listening and fairness help solve everyday disagreements.","Invent a playground disagreement and list two fair solutions.","How could you tell whether everyone was heard?"],
      x:["A respectful solution balances different needs.","Write a fictional group agreement for sharing a busy community space.","How does your plan support people who need extra help?"]}},
    {id:"energy-detectives",area:"science",icon:"💡",title:"A home energy detective",duration:10,materials:"Pencil, paper and observations only; never touch electrical parts",why:"Everyday choices can conserve resources.",levels:{
      e:["Some things need energy to work.","Spot three safe examples of light, sound or movement in a room.","Which ones are using energy now?"],
      b:["We can reduce wasted energy with safe habits.","Draw a comic of turning off an unused light with a grown-up.","Why is switching off an unused light useful?"],
      g:["Different appliances use energy for different jobs.","Make a fictional home energy plan with three safe changes that avoid waste.","Which change would make the biggest difference, and what would you need to check?"],
      x:["A good energy decision balances benefit, cost and evidence.","Compare two imaginary choices: a bright bulb used briefly or a low-power bulb used for longer.","What extra measurements would you need before judging which uses more energy?"]}},
    {id:"language-exchange",area:"language",icon:"🗣️",title:"A word in more than one language",duration:10,materials:"Paper and a reliable child-friendly dictionary; grown-up help",why:"Different languages give us more ways to express ideas.",levels:{
      e:["People can say hello in different languages.","Ask a grown-up for two greetings you can check, and draw them as speech bubbles.","What is respectful when learning someone's language?"],
      b:["Words do not always translate one-to-one.","Choose one everyday word, find it in another language, and draw its meaning.","How would you check you have the right translation?"],
      g:["Pronunciation and meaning both matter.","Compare a short, verified phrase in English and another language available to you.","What is similar and what is different?"],
      x:["Languages reflect culture and context.","Compare two independently checked translations of a polite request.","Why might one be more suitable for a particular audience?"]}}
  ]
};
