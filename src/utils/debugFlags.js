// Debug-only switches read from the URL query string, e.g. /?perf&shadow=0&dpr=1
// None of these are active unless explicitly present in the URL.
//
//   perf            show the stats panel + log frame-time percentiles and renderer.info
//   capture         stop the render loop and expose window.__disc for deterministic frame capture
//   shadow=0        disable all shadows
//   shadowRes=N     override the point-light shadow map size (per cube face)
//   dpr=N           force the device pixel ratio
//   aa=0            disable MSAA
//   maps=0          strip every texture map from every material
//   static=1        render a single frame, then stop the loop
//   blur=0          disable every CSS backdrop-filter on the page
//   noise=0         do not run the catalog's animated noise canvas
//   model=/x.glb    load a different same-origin model file (asset A/B testing)

const params = new URLSearchParams(window.location.search);

function num(name) {
  if (!params.has(name)) return null;
  const v = Number(params.get(name));
  return Number.isFinite(v) ? v : null;
}

function off(name) {
  return params.get(name) === '0';
}

export const debugFlags = Object.freeze({
  perf: params.has('perf'),
  capture: params.has('capture'),
  noShadow: off('shadow'),
  shadowRes: num('shadowRes'),
  dpr: num('dpr'),
  noAA: off('aa'),
  noMaps: off('maps'),
  static: params.get('static') === '1',
  noBlur: off('blur'),
  noNoise: off('noise'),
  model: /^\/[\w./-]+\.(glb|gltf)$/.test(params.get('model') || '') ? params.get('model') : null,
});

if (debugFlags.noBlur) {
  const style = document.createElement('style');
  style.textContent = '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
  document.head.appendChild(style);
}
