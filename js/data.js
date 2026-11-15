// All on-screen copy: the parts, the mission timeline, and the interface text (UI). Edit this file to change the words.
// Order matters: keyboard keys 1-4 unlock the parts in this order.
// uids contains known RFID tag IDs. Unknown tags can be assigned in Hardware mode and are saved in the browser.
const PARTS=[
{id:'solar',uids:[],name:'Solar array',tag:'The power',
desc:'Triple-junction solar cells on the top deck recharge the rover’s batteries every day, so it can work without any fuel.',
specs:[['Cell type','Triple-junction GaAs'],['Peak output','About 140 W'],['Area','About 1.3 m²']],
fact:'Dust slowly dimmed the panels. Gusts of wind sometimes blew them clean, which gave the mission years of extra life.'},
{id:'arm',uids:[],name:'Instrument deployment device',tag:'The arm',
desc:'A robotic arm with a turret at the end. It places four tools against rocks and soil so the rover can study them up close.',
specs:[['Tool 1','Rock Abrasion Tool'],['Tool 2','Microscopic Imager'],['Tools 3 and 4','Mössbauer and APXS spectrometers']],
fact:'The Rock Abrasion Tool grinds away a rock’s weathered surface to expose fresh material underneath.'},
{id:'camera',uids:[],name:'Pancam mast assembly',tag:'The eyes',
desc:'A mast lifts the Panoramic Camera pair and navigation cameras about 1.5 m above the ground to scout the terrain ahead.',
specs:[['Cameras','Pancam and Navcam'],['Filters','13 geology filters'],['Eye height','About 1.5 m']],
fact:'Pancam’s color filters let scientists tell different minerals apart from a distance.'},
{id:'wheels',uids:[],name:'Wheels and rocker-bogie suspension',tag:'The legs',
desc:'Six aluminum wheels, each with its own motor, on a pivoting suspension that keeps all wheels on the ground over rocks and sand.',
specs:[['Wheels','6, each 26 cm across'],['Steering','Front and rear pairs'],['Top speed','About 5 cm per second']],
fact:'On Mars, the rover rarely moved faster than a few meters per hour, because it stopped often to check for hazards.'}
];
// The timeline: one card per event. On each card you wake Oppy (she sends a status report),
// then give her instructions (a part does the job, she sends findings, and her picture pops up).
// Reports are game telemetry built from NASA facts, never quotes: the rover never said these words.
// Each entry: [date, title, text, extras]. extras:
//   sol     the Mars day number shown in the status report and the telemetry strip
//   at      index of the stop on TRAVERSE (the map dot); where = place name; km = odometer text ('' hides it)
//   status  [[label, value], ...] typed after the wake-up
//   turns   the instructions, in order: {cmd: button text, act: what the 3D rover does, found: lines she sends back, gap: optional time jump shown first}
//           picture commands (take a picture, look around, study the rock) have no found: the picture pops up and its 'about' explains it
//           act: snap, pan (camera), arm, drive, back, odo (wheels), panels (solar)
//   img     her picture (assets/img), popped up after the last turn (it flies out of her camera into the pop-up);
//           cap = caption; about = what the picture shows; credit = NASA credit + PIA number
//   cam     which camera took it: 'arm' (Microscopic Imager, on the arm). Default: the mast (Pancam / Navcam)
//   pano    backdrop behind the rover (assets/pano), dimmed
//   dust    how dusty the rover looks at the start of this card (the panels card)
//   fx      'storm' plays the dust storm
//   tries   the storm card (the last one): no instructions and no picture. Right after her status report the signal
//           cuts out (UI.lost). Then the wake-up attempts that get no answer, then Good night, Oppy fades in
//   src     NASA/JPL sources for every fact on the card
const TIMELINE=[
['25 January 2004','Landing at Eagle Crater','Bouncing on airbags, Opportunity rolls to a stop inside a small crater on Meridiani Planum. Scientists called it a hole in one.',
 {sol:1,at:0,where:'Eagle Crater',km:'0 km',
  status:[['Solar power','OK'],['Cameras','OK'],['Location','Eagle Crater']],
  turns:[{cmd:'Take a picture',act:'snap'}],
  img:'assets/img/eagle.jpg',cap:'Eagle Crater on sol 1',credit:'NASA/JPL/Cornell · PIA05152',
  about:'Opportunity’s first color look around. She is sitting inside a crater about 20 m across, and its rim is only about 10 m away. The pale slabs in the crater wall are bare rock, something scientists had never seen this close on Mars. In front is the landing platform she rolled off.',
  pano:'assets/pano/eagle.jpg',
  src:['https://science.nasa.gov/photojournal/a-hole-in-one/','https://science.nasa.gov/photojournal/opportunity-captures-lion-king-panorama/']}],
['2 March 2004','Signs of water','The crater wall is full of tiny round grains that scientists nicknamed “blueberries”. What made them?',
 {sol:37,at:0,where:'Eagle Crater',km:'',cam:'arm',
  status:[['Arm','Ready'],['Target','Rock outcrop'],['Location','Eagle Crater']],
  turns:[{cmd:'Study the rock',act:'arm'}],
  img:'assets/img/blueberries.jpg',cap:'“Blueberries” up close',credit:'NASA/JPL · PIA05564',
  about:'The Microscopic Imager on the end of the arm works like a magnifying glass. Each “blueberry” is only a few millimeters wide. They are rich in hematite, and they likely grew inside rock that was soaked with water long ago. The tools on the arm then measured what they are made of.',
  pano:'assets/pano/eagle.jpg',
  src:['https://www.jpl.nasa.gov/news/opportunity-rover-finds-strong-evidence-meridiani-planum-was-wet/','https://science.nasa.gov/photojournal/finding-the-blueberry-muffin-recipe/']}],
['26 April 2004','Mission accomplished: 90 sols','Opportunity was built to work for 90 sols (Mars days). Today she finishes sol 90, and every goal of her mission is met. Now what?',
 {sol:90,at:4,where:'Near Endurance Crater',km:'',
  status:[['Planned mission','90 sols: complete'],['Mission goals','All met'],['Location','Plains near Endurance Crater']],
  turns:[{cmd:'Keep exploring!',act:'odo',found:['NASA extends the mission through September 2004. It is the first of many extensions.','New target: Endurance Crater, about 130 m wide.','Pancam: the view from the rim of Endurance.']}],
  img:'assets/img/endurance.jpg',cap:'Endurance Crater from its rim, sols 97 and 98',credit:'NASA/JPL/Cornell · PIA05867',
  about:'A few days after sol 90, Opportunity parks just 40 cm from the edge of Endurance Crater. It is about 130 m across, bigger than a football field. Its walls show rock from deep below the surface, a window into Mars’ past. This view is stitched together from 258 pictures.',
  pano:'assets/pano/endurance-crater.jpg',
  src:['https://www.jpl.nasa.gov/news/mars-rovers-finish-primary-mission-and-roll-onward/','https://science.nasa.gov/photojournal/opportunity-at-time-of-full-mission-success/','https://science.nasa.gov/photojournal/a-crater-of-clues-to-mars-buried-past/']}],
['26 April 2005','Stuck in Purgatory Dune','Opportunity is crossing flat plains covered in ripples of wind-blown sand. The team sends her the plan for a long drive.',
 {sol:446,at:8,where:'Purgatory Dune',km:'',
  status:[['Wheels','OK'],['Terrain','Sand ripples'],['Location','Meridiani plains']],
  turns:[{cmd:'Drive forward',act:'drive',found:['Wheels turning… but the rover is barely moving.','Each turn of the wheels digs her deeper into the sand.','Stuck! The wheels are more than 10 cm deep in a sand ripple.']},
         {gap:'Weeks of planning and testing later',cmd:'Back out slowly',act:'back',found:['Tiny moves, checked after every one. In eight drives the wheels turned enough to go 46 m, but she moved only 26 cm.','Early June 2005: free! Opportunity rolls onto firm ground.']}],
  img:'assets/img/purgatory.jpg',cap:'Looking back at Purgatory Dune, sol 491',credit:'NASA/JPL · PIA07999',
  about:'A week after she escaped, Opportunity looked back at the sand trap with her navigation camera. The ripple is only about 30 cm tall and 2.5 m wide, but it held her for more than five weeks. You can see the deep tracks her wheels dug.',
  src:['https://science.nasa.gov/photojournal/looking-back-at-purgatory-dune/','https://photojournal.jpl.nasa.gov/catalog/PIA07985','https://www.jpl.nasa.gov/podcasts/on-a-mission-season-1/season-4-mars-rovers/episode-4-a-lifetime-on-mars-the-adventures-of-spirit-and-opportunity/']}],
['27 September 2006','Victoria Crater','Opportunity reaches the edge of a crater about 800 m wide, much bigger than any she has seen before.',
 {sol:951,at:19,where:'Victoria Crater',km:'9.28 km',
  status:[['Odometer','9.28 km'],['Cameras','OK'],['Location','Duck Bay, Victoria Crater']],
  turns:[{cmd:'Look around',act:'pan'}],
  img:'assets/img/capeverde.jpg',cap:'Cape Verde, Victoria Crater, sol 952',credit:'NASA/JPL/Cornell · PIA08809',
  about:'Looking across the crater from Duck Bay to a cliff called Cape Verde. The cliff is about 50 m away and 6 m tall, and you can see its layers. The view stretches more than 400 m into the distance. The colors are close to what your eyes would see.',
  pano:'assets/pano/victoria.jpg',
  src:['https://science.nasa.gov/photojournal/duck-bay-victoria-crater/','https://science.nasa.gov/photojournal/layers-of-cape-verde-in-victoria-crater/']}],
['January 2014','Dusty solar panels','In 2011, after a 21 km trek, Opportunity reached Endeavour Crater, 22 km across. Mars has no rain, so dust keeps settling on her solar panels and blocks the sunlight she runs on.',
 {sol:3535,at:82,where:'Endeavour Crater',km:'',dust:.5,
  status:[['Solar power','Less than 375 Wh a day'],['Panels','Covered in dust'],['Location','Endeavour Crater']],
  turns:[{gap:'March 2014',cmd:'Wind gust incoming!',act:'panels',found:['Strong gusts of wind sweep across the rover.','The dust blows off the solar panels!','Mid-April: more than 620 Wh a day, up from less than 375.','Lucky cleanings like this gave her years of extra life.']}],
  img:'assets/img/panels.jpg',cap:'January 2014 (left) and March 2014 (right)',credit:'NASA/JPL-Caltech/Cornell/ASU · PIA17759, PIA18079',
  about:'Two self-portraits, before and after the wind. Opportunity\'s arm camera couldn\'t take sharp wide-angle photos, so she took many pictures with the camera on her mast and the team stitched them together. That is why the mast is missing, but you can see its shadow. On the left the panels are brown with dust; on the right they are clean.',
  pano:'assets/pano/endeavour.jpg',
  src:['https://science.nasa.gov/photojournal/arrival-at-spirit-point-by-mars-rover-opportunity/','https://science.nasa.gov/photojournal/self-portrait-by-opportunity-mars-rover-in-january-2014/','https://science.nasa.gov/photojournal/self-portrait-by-freshly-cleaned-opportunity-mars-rover-in-march-2014/','https://www.jpl.nasa.gov/edu/resources/teachable-moment/mars-rover-mission-comes-to-an-end-but-science-legacy-live-on/']}],
['24 March 2015','A marathon on Mars','Opportunity is about to finish a race that started 11 years ago: 42.195 km, the length of an Olympic marathon.',
 {sol:3968,at:87,where:'Near Marathon Valley',km:'42.195 km',
  status:[['Wheels','OK'],['Odometer','Almost 42.2 km'],['Location','Endeavour Crater rim']],
  turns:[{cmd:'Report distance',act:'odo',found:['Odometer: 42.195 km. Marathon complete!','Next stop: Marathon Valley, where clay minerals hint at ancient water.']}],
  img:'assets/img/marathon.jpg',cap:'Marathon Valley overlook, sol 3958',credit:'NASA/JPL-Caltech/Cornell/ASU · PIA19151',
  about:'Marathon Valley cuts through the rim of Endeavour Crater. A spacecraft orbiting Mars spotted clay minerals here, and clay usually forms in water. So the team chose it as her next science stop. This view is four camera pointings joined together.',
  pano:'assets/pano/marathon.jpg',
  src:['https://www.jpl.nasa.gov/news/nasas-opportunity-mars-rover-passes-marathon-distance/','https://science.nasa.gov/photojournal/mars-marathon-valley-overlook/']}],
['10 June 2018','The great dust storm','In Perseverance Valley, a dust storm covers the whole planet. It blocks so much sunlight that the solar panels can barely charge.',
 {sol:5111,at:91,where:'Perseverance Valley',km:'45.16 km',fx:'storm',tries:true,
  status:[['Sky','Very dark (tau 10.8, normal is 0.5)'],['Battery','Very low'],['Location','Perseverance Valley']],
  pano:'assets/pano/perseverance.jpg',
  src:['https://science.nasa.gov/photojournal/opportunitys-last-message/','https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/','https://science.nasa.gov/photojournal/opportunity-legacy-pan-true-color/']}]
];
// Opportunity's route, traced from NASA's final traverse map (PIA23178, NASA/JPL-Caltech/MSSS) and drawn over
// assets/img/traverse.jpg (550 x 390). Approximate. The 'at' numbers above are indices into this list.
const TRAVERSE=[[65,24],[62,26],[68,25],[72,28],[73,27],[70,31],[68,42],[70,47],[67,77],[69,80],[66,79],[64,82],[67,93],[71,98],[72,106],[71,107],[77,113],[77,112],[78,112],[78,108],[84,109],[77,116],[80,119],[74,121],[74,128],[72,128],[72,134],[69,139],[69,146],[67,147],[68,152],[66,152],[66,155],[64,159],[65,168],[61,167],[60,168],[62,168],[50,170],[54,172],[54,177],[53,176],[52,178],[50,182],[52,194],[65,195],[71,200],[78,201],[85,206],[98,204],[107,210],[125,212],[126,214],[126,212],[129,213],[128,214],[130,216],[136,217],[139,220],[150,228],[154,228],[158,229],[159,231],[171,235],[174,242],[177,243],[180,248],[187,255],[190,255],[194,258],[193,260],[199,266],[198,268],[200,269],[204,263],[204,259],[203,258],[196,275],[200,280],[202,288],[202,294],[199,292],[200,296],[197,299],[199,316],[201,318],[199,322],[203,332],[202,335],[204,338],[204,346],[205,348]];
// Interface text. Elements with data-ui="key" (or data-aria="key") in index.html get their text from here.
const UI={
title:'Opportunity',sub:'MER-B // Mars Exploration Rover-B',
intro:'Place a part on the platform',introKeys:'',
tabLabel:'Rover part',dragHint:'Drag to turn\nScroll or pinch to zoom',orbitHint:'Drag to turn\nScroll or pinch to zoom',add:'Add to rover',
wakeLbl:'All parts installed.',wake:'Wake up, Oppy',
rwLbl:'Opportunity is awake. Rewinding to launch…',rwLand:'07 JUL 2003',rwLandLbl:'Launch day',
months:['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
tlHead:'',prev:'Previous event',next:'Next event',
// Talking to Oppy (timeline). {sol} is filled in by app.js. viewPic opens her picture again.
goodMorning:'Sol {sol} · Good morning, Oppy',nextStop:'Next stop',viewPic:'See the picture',
navHead:'Route (approx.)',
// Picture pop-up and the photo gallery on the ending
photoLbl:'Picture from Oppy',backToOppy:'Back to Oppy',
gallery:'Photo gallery',close:'Close',galleryNote:'Opportunity sent home more than 217,000 pictures.',
// The storm card (tries:true): lost is shown right after her status report (game telemetry: last contact was 10 June 2018).
// Then the wake attempts, one line per try; after WAKE_TRIES, the button becomes goodbye (to the ending).
// Sources: 217,000 images, https://astrobiology.nasa.gov/missions/mer/ ; sol 5,111, https://science.nasa.gov/photojournal/opportunitys-last-message/
lost:'Transmission lost',
// realLife: shown after the last try, before Good night, Oppy. A fact, not telemetry. Source (more than 835 recovery commands, 13 Feb 2019):
// https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/
// The pieces type in one after another, one log line each.
realLife:['In real life, NASA’s team kept trying for eight months.','They sent more than 835 recovery commands, but Opportunity never answered.','On 13 February 2019, NASA declared her mission complete.'],
tryLog:['Sending wake-up signal… no response.','Sending wake-up signal… no response.','One more try… no response.'],
goodbye:'Good night, Oppy',
endTitle:'Opportunity',endDates:'Landed 2004 · Last heard 2018',epitaph:'Built for 90 sols. Lasted for 5,111.',again:'Start again',tParts:'Parts',tSol:'Sol',soundOn:'Sound on',soundOff:'Sound off',tCredit:'Model and images: NASA/JPL-Caltech',
state:{build:'Assembly',ready:'Dusty · dormant',rewind:'Rewinding',timeline:'Awake',ending:'Signal lost'},
tools:'Model tools (press d to hide)'
};
const WAKE_TRIES=3;
