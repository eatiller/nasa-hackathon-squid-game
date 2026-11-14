// Content for the six unlockable parts and the mission timeline. Edit this file to change the copy.
const PARTS=[
{id:'chassis',name:'Warm Electronics Box',tag:'The body',
desc:'The insulated core of the rover. It holds the computer, radios and batteries, and keeps them warm through freezing Martian nights.',
specs:[['Computer','RAD6000, 20 MHz'],['Insulation','Silica aerogel'],['Night temps','Below −90 °C outside']],
fact:'The whole rover weighs about 185 kg, roughly the same as a large motorcycle with a rider.'},
{id:'suspension',name:'Rocker-bogie suspension and wheels',tag:'The legs',
desc:'Six aluminum wheels, each with its own motor, on a pivoting suspension that keeps all wheels on the ground over rocks and sand.',
specs:[['Wheels','6, each 26 cm across'],['Steering','Front and rear pairs'],['Top speed','About 5 cm per second']],
fact:'On Mars, the rover rarely moved faster than a few meters per hour, because it stopped often to check for hazards.'},
{id:'solar',name:'Solar array',tag:'The power',
desc:'Triple-junction solar cells on the top deck recharge the rover’s batteries every day, so it can work without any fuel.',
specs:[['Cell type','Triple-junction GaAs'],['Peak output','About 140 W'],['Area','About 1.3 m²']],
fact:'Dust slowly dimmed the panels. Gusts of wind sometimes blew them clean, which gave the mission years of extra life.'},
{id:'mast',name:'Pancam mast assembly',tag:'The eyes',
desc:'A mast lifts the Panoramic Camera pair and navigation cameras about 1.5 m above the ground to scout the terrain ahead.',
specs:[['Cameras','Pancam and Navcam'],['Filters','13 geology filters'],['Eye height','About 1.5 m']],
fact:'Pancam’s color filters let scientists tell different minerals apart from a distance.'},
{id:'arm',name:'Instrument deployment device',tag:'The arm',
desc:'A robotic arm with a turret at the end. It places four tools against rocks and soil so the rover can study them up close.',
specs:[['Tool 1','Rock Abrasion Tool'],['Tool 2','Microscopic Imager'],['Tools 3 and 4','Mössbauer and APXS spectrometers']],
fact:'The Rock Abrasion Tool grinds away a rock’s weathered surface to expose fresh material underneath.'},
{id:'antenna',name:'High-gain antenna',tag:'The voice',
desc:'A steerable dish that talks directly to Earth. Most data went through orbiters overhead, which relayed it home.',
specs:[['Direct link','X-band to Earth'],['Relay link','UHF to orbiters'],['Dish size','About 28 cm']],
fact:'A radio signal takes between 4 and 24 minutes to travel between Mars and Earth, depending on where the planets are.'}
];
const TIMELINE=[
['7 July 2003','Launch','A Delta II rocket carries Opportunity from Cape Canaveral, Florida.'],
['25 January 2004','Landing at Eagle Crater','Airbags bounce the rover to a stop on Meridiani Planum, almost exactly where scientists hoped.'],
['March 2004','Evidence of past water','Layered rocks and small hematite spheres nicknamed “blueberries” show that liquid water once soaked this ground.'],
['January 2005','A meteorite on Mars','Heat Shield Rock becomes the first meteorite identified on another planet.'],
['Spring 2005','Stuck in Purgatory Dune','Wheels sink into soft sand. After weeks of careful driving, the team frees the rover.'],
['September 2006','Victoria Crater','Opportunity reaches a crater about 800 m wide and studies its walls for nearly two years.'],
['August 2011','Endeavour Crater','After a trek of about 21 km, the rover arrives at the rim of a crater 22 km across.'],
['March 2015','A marathon on Mars','Opportunity passes 42.195 km of total driving.'],
['June 2018','The great dust storm','A planet-wide storm blocks the sunlight. The last signal arrives on 10 June.'],
['13 February 2019','Mission complete','After more than a thousand attempts to reach it, NASA ends the mission. Total distance: 45.16 km.']
];
