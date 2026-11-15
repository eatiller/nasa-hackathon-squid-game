# nasa-hackathon-squid-game

# Build Opportunity

An interactive site where kids rebuild NASA's Opportunity rover one part at a time. Each part placed on the RFID platform opens a tab with that part's 3D model and facts; **Add to rover** snaps it onto the floating rover. With all four parts (solar array, arm, camera mast, wheels) on, **Wake up, Oppy** appears: the rover shakes off its dust, the date rewinds to launch day, and an interactive timeline walks through the mission. On the last screen you try to wake Oppy, then say **Goodbye, Oppy** as the rover fades to a silhouette.

## Run locally

The 3D model loads with `fetch`, so open the folder through a local web server (double-clicking `index.html` will not load the model):

    python3 -m http.server 8000

Then visit http://localhost:8000 in Chrome or Edge (Web Serial is needed for the RFID platform).

Controls: plug in the Pico and click **Connect** in the bottom strip once (the browser remembers it). Without hardware: keys `1`–`4` place parts, `Enter` presses the main button on screen, `←`/`→` move through the timeline, `r` starts over, and `d` opens the developer tools.

## Structure

- `index.html` - page markup (one full-screen stage)
- `css/style.css` - styles (dark mission-console theme)
- `js/data.js` - all on-screen text: parts, timeline, interface strings
- `js/app.js` - game flow (`unlock(id)`, `add()`, `wake()`, `reset()`), Three.js model loading, UI
- `docs/DESIGN.md` - design system and interaction flow
- `js/input.js` - RFID platform over Web Serial, keyboard shortcuts, dev panel for registering tags
- `assets/Mars Exploration Rover - Spirit and Opportunity.glb` - the NASA model (loaded first)
- `assets/mer_small.glb` - compressed backup copy (textures resized to 1024 px)

Three.js r128 is loaded from the jsDelivr CDN, so no build step is needed.

## Credits

3D model: "Spirit and Opportunity Rover, 3D Model", NASA/JPL-Caltech
(https://science.nasa.gov/resource/spirit-and-opportunity-rover-3d-model/).
The model is a generic Mars Exploration Rover. Check NASA's media usage guidelines before reuse.
