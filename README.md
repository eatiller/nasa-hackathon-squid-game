# nasa-hackathon-squid-game

# Build Opportunity

An interactive site where you unlock the parts of NASA's Opportunity rover one by one. Each unlock shows details about the part and builds the 3D rover. When all six parts are unlocked, the rover wakes up, shakes off the dust, and a mission timeline appears.

## Run locally

The 3D model loads with `fetch`, so open the folder through a local web server (double-clicking `index.html` will not load the model):

    python3 -m http.server 8000

Then visit http://localhost:8000.

## Structure

- `index.html` - page markup
- `css/style.css` - styles (light and dark themes)
- `js/data.js` - part descriptions and timeline entries
- `js/app.js` - game state, Three.js model loading, UI
- `assets/mer_small.glb` - compressed copy of the NASA model (textures resized to 1024 px)

Three.js r128 is loaded from the jsDelivr CDN, so no build step is needed.

## Credits

3D model: "Spirit and Opportunity Rover, 3D Model", NASA/JPL-Caltech
(https://science.nasa.gov/resource/spirit-and-opportunity-rover-3d-model/).
The model is a generic Mars Exploration Rover. Check NASA's media usage guidelines before reuse.
