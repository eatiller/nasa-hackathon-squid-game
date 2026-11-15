# nasa-hackathon-squid-game

# Build Opportunity

An interactive site where kids rebuild NASA's Opportunity rover one part at a time. Each part placed on the RFID platform opens a tab with that part's 3D model and facts; **Add to rover** snaps it onto the floating rover. With all four parts (solar array, arm, camera mast, wheels) on, **Wake up, Oppy** appears: the rover shakes off its dust, the date rewinds to launch day, and an interactive timeline walks through the mission. On each of its 7 cards you talk to Oppy like the mission team did: **Wake up, Oppy** gets a status report back. Then you give her one instruction (take a picture, study a rock, drive, check the panels…). The part that does the job moves on the 3D rover, her findings come back, and her real NASA picture pops up. A map shows her route, and a dimmed NASA panorama of each place sits behind her. On the last card, after the 2018 dust storm, nobody answers the wake-up calls. Then you say **Good night, Oppy**, the rover fades to a silhouette, and a **Photo gallery** button shows the pictures she sent home. Along the way: her 90th sol, getting stuck in (and backing out of) Purgatory Dune, and a wind gust cleaning her panels.

## Run locally

The 3D model loads with `fetch`, so open the folder through a local web server (double-clicking `index.html` will not load the model):

    python3 -m http.server 8000

Then visit http://localhost:8000 in Chrome or Edge (Web Serial is needed for the RFID platform).

Controls: plug in the RFID reader (Teensy 4.1 running `rfid_nasa/`, or a Pico 2 running `Mechatronics/RFID_Project/`) and click **Connect** in the bottom strip once (the browser remembers it). Without hardware: keys `1`–`4` place parts, `Enter` presses the main button on screen, `←`/`→` move through the timeline, `r` starts over, and `d` opens the developer tools.

## Structure

- `index.html` - page markup (one full-screen stage)
- `css/style.css` - styles (dark mission-console theme)
- `js/data.js` - all on-screen text: parts, timeline, interface strings
- `js/app.js` - game flow (`unlock(id)`, `add()`, `wake()`, `reset()`), Three.js model loading, UI
- `docs/DESIGN.md` - design system and interaction flow
- `js/input.js` - RFID platform over Web Serial, keyboard shortcuts, dev panel for registering tags
- `assets/Mars Exploration Rover - Spirit and Opportunity.glb` - the NASA model (loaded first)
- `assets/mer_small.glb` - compressed backup copy (textures resized to 1024 px)
- `assets/img/` - NASA pictures shown in the timeline, plus `traverse.jpg` (the route map)
- `assets/pano/` - NASA panoramas used as dimmed backdrops

Three.js r128 is loaded from the jsDelivr CDN, so no build step is needed.

## Credits

3D model: "Spirit and Opportunity Rover, 3D Model", NASA/JPL-Caltech
(https://science.nasa.gov/resource/spirit-and-opportunity-rover-3d-model/).
The model is a generic Mars Exploration Rover. Check NASA's media usage guidelines before reuse.

Images (resized copies from the NASA Photojournal, science.nasa.gov/photojournal):

| File | Image | Credit |
|---|---|---|
| `img/eagle.jpg` | PIA05152 "A Hole in One" | NASA/JPL/Cornell |
| `img/blueberries.jpg` | PIA05564 "Finding the 'Blueberry' Muffin Recipe" | NASA/JPL |
| `img/purgatory.jpg` | PIA07999 "Looking Back at 'Purgatory Dune'" | NASA/JPL |
| `img/capeverde.jpg` | PIA08809 "Layers of 'Cape Verde' in 'Victoria Crater'" | NASA/JPL/Cornell |
| `img/panels.jpg` | PIA17759 and PIA18079, Opportunity self-portraits, Jan. and Mar. 2014 | NASA/JPL-Caltech/Cornell Univ./Arizona State Univ. |
| `img/marathon.jpg`, `pano/marathon.jpg` | PIA19151 "Mars 'Marathon Valley' Overlook" | NASA/JPL-Caltech/Cornell Univ./Arizona State Univ. |
| `img/traverse.jpg` | PIA23178 "Opportunity's Final Traverse Map" (grayscale, tinted) | NASA/JPL-Caltech/MSSS |
| `img/endurance.jpg`, `pano/endurance-crater.jpg` | PIA05867 "A Crater of Clues to Mars' Buried Past" (Endurance Crater) | NASA/JPL/Cornell |
| `pano/eagle.jpg` | PIA05755 "Lion King" panorama | NASA/JPL/Cornell |
| `pano/victoria.jpg` | PIA10007 "Duck Bay, Victoria Crater" | NASA/JPL/Cornell |
| `pano/endeavour.jpg` | PIA14509 "Arrival at 'Spirit Point'" | NASA/JPL-Caltech/Cornell/ASU |
| `pano/perseverance.jpg` | PIA22909 "Opportunity Legacy Pan (True Color)" | NASA/JPL-Caltech/Cornell/ASU |

