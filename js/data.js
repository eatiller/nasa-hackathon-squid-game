// All on-screen copy: the parts, the mission timeline, and the interface text (UI). Edit this file to change the words.
// Order matters: keyboard keys 1-4 unlock the parts in this order.
// uids: RFID tag UIDs for this part (lowercase hex, no spaces, e.g. '93e39a92'). Unknown tags show in the dev panel (press d).
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
// Each entry: [date, title, text, extras]. extras is optional:
//   fx:'storm'   plays the dust storm on the 3D scene while this event is shown
//   media:'<html>'  fills the media slot under the rover (a map, an image, a small interaction)
const TIMELINE=[
['7 July 2003','Launch','A Delta II rocket carries Opportunity from Cape Canaveral, Florida.'],
['25 January 2004','Landing at Eagle Crater','Airbags bounce the rover to a stop on Meridiani Planum, almost exactly where scientists hoped.'],
['March 2004','Evidence of past water','Layered rocks and small hematite spheres nicknamed “blueberries” show that liquid water once soaked this ground.'],
['January 2005','A meteorite on Mars','Heat Shield Rock becomes the first meteorite identified on another planet.'],
['Spring 2005','Stuck in Purgatory Dune','Wheels sink into soft sand. After weeks of careful driving, the team frees the rover.'],
['September 2006','Victoria Crater','Opportunity reaches a crater about 800 m wide and studies its walls for nearly two years.'],
['August 2011','Endeavour Crater','After a trek of about 21 km, the rover arrives at the rim of a crater 22 km across.'],
['March 2015','A marathon on Mars','Opportunity passes 42.195 km of total driving.'],
['June 2018','The great dust storm','A planet-wide storm blocks the sunlight. The last signal arrives on 10 June.',{fx:'storm'}],
['13 February 2019','Mission complete','After more than a thousand attempts to reach it, NASA ends the mission. Total distance: 45.16 km.']
];
// Interface text. Elements with data-ui="key" (or data-aria="key") in index.html get their text from here.
const UI={
title:'Opportunity',sub:'MER-B // Mars Exploration Rover-B',
intro:'Place a part on the platform',introKeys:'',
tabLabel:'Part detected',dragHint:'Drag to turn',add:'Add to rover',
wakeLbl:'All parts installed.',wake:'Wake up, Oppy',
rwLbl:'Opportunity is awake. Rewinding to launch…',rwLand:'07 JUL 2003',rwLandLbl:'Launch day',
months:['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
tlHead:'Fourteen years on Mars',prev:'Previous event',next:'Next event',
// Wake attempts on the last timeline screen. One line per try; WAKE_TRIES tries, then tryEnd and the Goodbye button.
tryLog:['Sending wake-up signal… no response.','Sending another wake-up signal… no response.','One more try… still no response.'],
tryEnd:'The real team kept calling for eight months. Opportunity never answered.',
goodbye:'Good night, Oppy',
endTitle:'Opportunity',endDates:'Landed 2004 · Last heard 2018',epitaph:'Built for 90 sols. Lasted for 5,111.',again:'Start again',
tParts:'Parts',soundOn:'Sound on',soundOff:'Sound off',tCredit:'Model: NASA/JPL-Caltech',
state:{build:'Assembly',ready:'Dusty · dormant',rewind:'Rewinding',timeline:'Awake',ending:'Signal lost'},
tools:'Tools (press d to hide)',sim:'Simulate a tag:'
};
const WAKE_TRIES=3;
