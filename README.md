# nasa-hackathon-squid-game

# Wake Up, Oppy

An interactive site where kids rebuild NASA's Opportunity rover one part at a time. The site can switch between a **Browser** edition with on-screen part controls and a **Hardware** edition driven by the RFID platform. Selecting or scanning a part opens its 3D model and facts; **Add to rover** snaps it onto the floating rover. With all four parts (solar array, arm, camera mast, wheels) on, **Wake up, Oppy** appears and an interactive timeline walks through the mission.

## Run locally

The 3D model loads with `fetch`, so open the folder through a local web server (double-clicking `index.html` will not load the model):

    python3 -m http.server 8000

Then visit http://localhost:8000. The Browser edition works in any modern browser. The Hardware edition uses Web Serial, so open it in Chrome or Edge.

The site opens in Hardware mode by default. Use the switch in the bottom telemetry bar to choose an edition. In Browser mode, select the four part cards on screen. In Hardware mode, connect the Teensy 4.1 or Pico 2 RFID platform and scan each part. Unknown RFID tags can be assigned from the model tools panel. Drag the 3D rover to turn it; use the mouse wheel or a two-finger pinch to zoom. In either edition, keys `1`–`4` provide a part-selection fallback; `Enter` presses the main button, `←`/`→` move through the timeline, `r` starts over, and `d` opens model tools. Sound starts after the first interaction; use **Sound on/off** in the telemetry bar or press `m` to toggle it.

## Structure

- `index.html` - page markup (one full-screen stage)
- `css/style.css` - styles (dark mission-console theme)
- `js/data.js` - all on-screen text: parts, timeline, interface strings
- `js/app.js` - game flow (`unlock(id)`, `add()`, `wake()`, `reset()`), Three.js model loading, UI
- `js/sound.js` - ambient Mars audio, synthesized interaction cues, and sound preference
- `docs/DESIGN.md` - design system and interaction flow
- `js/input.js` - edition switch, Web Serial RFID input, tag assignment, and keyboard shortcuts
- `assets/24883_MER_static.glb` - the accurate NASA Mars Exploration Rover model loaded at startup
- `assets/Mars Exploration Rover - Spirit and Opportunity.glb` - full fallback model
- `assets/mer_small.glb` - compressed final fallback (textures resized to 1024 px)
- `assets/img/` - NASA pictures shown in the timeline, plus `traverse.jpg` (the route map)
- `assets/pano/` - NASA panoramas used as dimmed backdrops
- `assets/audio/first-mars-sounds.m4a` - compressed copy of the supplied Perseverance Mars recording

Three.js r128 is loaded from the jsDelivr CDN, so no build step is needed.

## Credits

3D model: "Spirit and Opportunity Rover, 3D Model", NASA/JPL-Caltech
(https://science.nasa.gov/resource/spirit-and-opportunity-rover-3d-model/).
The model is a generic Mars Exploration Rover. Check NASA's media usage guidelines before reuse.

Ambient audio: the supplied first audio recording from Mars, captured by NASA's Perseverance rover. The web copy repairs an isolated clipped peak, keeps 3 dB of headroom, and uses a two-second crossfade with sample-accurate Web Audio playback for a continuous low-volume loop.

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

