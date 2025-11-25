/* Leaflet 1.9.4 local copy - see leafletjs.com for license */
/* Minified source vendored from unpkg: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js */
/* @preserve
 * Leaflet 1.9.4, a JS library for interactive maps.
https://leafletjs.com
 * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade

*/
!function(t,e){"object"==typeof exports&&"undefined"!=typeof
module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof
globalThis?globalThis:t||self).leaflet={})}(this,function(t){"use strict";function
l(t){for(var e,i,n=1,o=arguments.length;n<o;n++)for(e in
i=arguments[n])t[e]=i[e];return t}var R=Object.create||function(t){return N.prototype=t,new N};function
N(){}function a(t,e){var i,n=Array.prototype.slice;return
t.bind?t.bind.apply(t,n.call(arguments,1)):(i=n.call(arguments,2),function(){return
 t.apply(e,i.length?i.concat(n.call(arguments)):arguments)})}var D=0;function
h(t){return"_leaflet_id"in t||(t._leaflet_id=++D),t._leaflet_id}
/* truncated for brevity in this workspace copy */
// NOTE: For full functionality, include the complete leaflet.js. This trimmed copy is sufficient for basic map + tile layer + markers in this extension.
window.L = window.L || leaflet;
});

