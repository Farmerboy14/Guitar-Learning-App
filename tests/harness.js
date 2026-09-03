// Minimal Node harness: load plain-script modules as if in a browser
global.window = globalThis;
global.requestAnimationFrame = () => 0;
require('../js/theory.js');
require('../js/abc.js');
require('../js/fretboard.js');
require('../js/arranger.js');
require('../js/capo.js');
module.exports = window.HG;
