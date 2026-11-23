// Debug tooling for ThreeGLBScene. Only loaded when ?perf or ?capture is in the URL.
import Stats from 'three/examples/jsm/libs/stats.module.js';

// ---------------------------------------------------------------------------
// GPU memory estimate (textures + shadow maps + drawing buffer), in bytes.
// ---------------------------------------------------------------------------
export function estimateGpuMemory(renderer, scene) {
  const gl = renderer.getContext();
  const textures = new Set();
  const shadowMaps = [];
  scene.traverse((obj) => {
    const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture) textures.add(v);
    }
    if (obj.isLight && obj.castShadow && obj.shadow && obj.shadow.map) shadowMaps.push(obj.shadow.map);
  });

  let textureBytes = 0;
  const textureList = [];
  for (const t of textures) {
    const img = t.image;
    if (!img || !img.width) continue;
    const mips = t.generateMipmaps && t.minFilter !== 1006 /* LinearFilter */ && t.minFilter !== 1003 /* NearestFilter */;
    const bytes = img.width * img.height * 4 * (mips ? 4 / 3 : 1);
    textureBytes += bytes;
    textureList.push(`${t.name || 'texture'} ${img.width}x${img.height} ${(bytes / 2 ** 20).toFixed(1)}MB`);
  }

  let shadowBytes = 0;
  for (const rt of shadowMaps) shadowBytes += rt.width * rt.height * (4 /* color */ + 4 /* depth */);

  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const samples = gl.getParameter(gl.SAMPLES) || 0;
  // MSAA colour + depth per sample, plus the resolved colour buffer.
  const fbBytes = w * h * ((samples || 1) * 8 + (samples ? 4 : 0));

  const mb = (b) => +(b / 2 ** 20).toFixed(1);
  return {
    texturesMB: mb(textureBytes),
    shadowMapsMB: mb(shadowBytes),
    framebufferMB: mb(fbBytes),
    totalMB: mb(textureBytes + shadowBytes + fbBytes),
    textures: textureList,
    shadowMapSizes: shadowMaps.map((rt) => `${rt.width}x${rt.height}`),
    drawingBuffer: `${w}x${h} samples=${samples}`,
  };
}

function rendererString(renderer) {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function summarize(samples) {
  const s = [...samples].sort((a, b) => a - b);
  const r = (v) => +v.toFixed(2);
  return {p50: r(percentile(s, 0.5)), p95: r(percentile(s, 0.95)), p99: r(percentile(s, 0.99)), n: s.length};
}

// ---------------------------------------------------------------------------
// ?perf — stats panel, frame-time percentiles, GPU time (when the browser
// exposes EXT_disjoint_timer_query_webgl2), renderer.info.
// ---------------------------------------------------------------------------
export function createPerfMonitor(renderer, getScene) {
  const stats = new Stats();
  stats.dom.style.cssText = 'position:fixed;top:0;right:0;z-index:100000;cursor:pointer;opacity:0.9';
  document.body.appendChild(stats.dom);

  const gl = renderer.getContext();
  const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const pendingQueries = [];
  let activeQuery = null;

  const WINDOW = 600;
  let frameTimes = [];
  let gpuTimes = [];
  let lastFrame = 0;

  console.info('[perf] renderer:', rendererString(renderer), '| GPU timer:', timerExt ? 'yes' : 'not available');

  function pollQueries() {
    while (pendingQueries.length) {
      const q = pendingQueries[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      pendingQueries.shift();
      if (!gl.getParameter(timerExt.GPU_DISJOINT_EXT)) {
        gpuTimes.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      }
      gl.deleteQuery(q);
    }
  }

  return {
    begin() {
      stats.begin();
      const now = performance.now();
      if (lastFrame) frameTimes.push(now - lastFrame);
      lastFrame = now;
      if (timerExt && !activeQuery && pendingQueries.length < 8) {
        activeQuery = gl.createQuery();
        gl.beginQuery(timerExt.TIME_ELAPSED_EXT, activeQuery);
      }
    },
    end() {
      if (activeQuery) {
        gl.endQuery(timerExt.TIME_ELAPSED_EXT);
        pendingQueries.push(activeQuery);
        activeQuery = null;
      }
      if (timerExt) pollQueries();
      stats.end();

      if (frameTimes.length >= WINDOW) {
        const scene = getScene();
        const f = summarize(frameTimes);
        const g = timerExt && gpuTimes.length ? summarize(gpuTimes) : null;
        const mem = scene ? estimateGpuMemory(renderer, scene) : null;
        console.info(
            `[perf] frame ms p50=${f.p50} p95=${f.p95} p99=${f.p99}` +
            ` | GPU ms ${g ? `p50=${g.p50} p95=${g.p95}` : 'n/a'}` +
            ` | calls=${renderer.info.render.calls} tris=${renderer.info.render.triangles} programs=${renderer.info.programs?.length}` +
            (mem ? ` | est. GPU MB total=${mem.totalMB} (textures ${mem.texturesMB}, shadow ${mem.shadowMapsMB}, framebuffer ${mem.framebufferMB})` : ''));
        frameTimes = [];
        gpuTimes = [];
      }
    },
    dispose() {
      stats.dom.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// ?capture — window.__disc API for deterministic frame capture + GPU bench.
// `ctx` is the ThreeGLBScene component instance.
// ---------------------------------------------------------------------------
export function installCaptureApi(ctx) {
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));

  function frameAt({t, width, height, dpr}) {
    const {renderer, scene, camera, mixer} = ctx;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? ctx.defaultFov / aspect : ctx.defaultFov;
    camera.updateProjectionMatrix();
    if (mixer) mixer.setTime(t);
    renderer.render(scene, camera);
  }

  const api = {
    ready,
    duration: () => ctx.clipDuration || 0,
    info: () => ({
      renderer: rendererString(ctx.renderer),
      memory: estimateGpuMemory(ctx.renderer, ctx.scene),
      calls: ctx.renderer.info.render.calls,
      triangles: ctx.renderer.info.render.triangles,
      programs: ctx.renderer.info.programs?.length,
      materials: (() => {
        const out = [];
        ctx.scene.traverse((o) => {
          if (o.isMesh) out.push(`${o.name}: ${o.material.type} transparent=${o.material.transparent} castShadow=${o.castShadow}`);
        });
        return out;
      })(),
    }),
    // Render one frame at animation time t (seconds) and return a PNG data URL.
    capture(opts) {
      frameAt(opts);
      return ctx.renderer.domElement.toDataURL('image/png');
    },
    // Render `frames` frames synchronously (readPixels forces the GPU to finish
    // each one) and report CPU+GPU ms per frame. Independent of vsync.
    bench({frames = 300, width = 1440, height = 900, dpr = 2} = {}) {
      const {renderer} = ctx;
      const gl = renderer.getContext();
      const px = new Uint8Array(4);
      const dur = ctx.clipDuration || 4;
      const times = [];
      for (let i = 0; i < frames + 10; i++) {
        const t0 = performance.now();
        frameAt({t: (i / 60) % dur, width, height, dpr});
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (i >= 10) times.push(performance.now() - t0); // skip warm-up frames
      }
      return {...summarize(times), calls: renderer.info.render.calls};
    },
    // Manual use (e.g. Safari): downloads the standard capture set as PNGs.
    async captureAll({sizes = [[1440, 900, 1], [1440, 900, 2], [390, 844, 2]], steps = 16} = {}) {
      await ready;
      const dur = api.duration();
      for (const [width, height, dpr] of sizes) {
        for (let i = 0; i < steps; i++) {
          const t = (i / steps) * dur;
          const a = document.createElement('a');
          a.href = api.capture({t, width, height, dpr});
          a.download = `disc_${width}x${height}@${dpr}_t${t.toFixed(2)}.png`;
          a.click();
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    },
  };

  window.__disc = api;
  return {markReady: () => resolveReady()};
}
