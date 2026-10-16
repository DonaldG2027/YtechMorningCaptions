(function () {
  const state = {
    enabled: true,
    tolerance: 60,        
    processScale: 0.5,    
    keyColor: { r: 50, g: 50, b: 50 }, 
    rafId: null,
  };

  // DOM refs
  let video = null;
  let outCanvas = null;
  let outCtx = null;
  let procCanvas = null;
  let procCtx = null;

  // UI refs
  let keyColorInput = null;
  let tolInput = null;
  let scaleInput = null;
  let toggleInput = null;

  function init() {
    video = document.getElementById('srcVideo');
    outCanvas = document.getElementById('chromaCanvas');

    // create offscreen processing canvas
    procCanvas = document.createElement('canvas');
    procCtx = procCanvas.getContext('2d');
    outCtx = outCanvas.getContext('2d');

    // UI elements
    keyColorInput = document.getElementById('keyColor');
    tolInput = document.getElementById('tolerance');
    scaleInput = document.getElementById('processScale');
    toggleInput = document.getElementById('chromaToggle');

    // wire UI -> state
    if (keyColorInput) keyColorInput.addEventListener('input', () => {
      state.keyColor = hexToRgb(keyColorInput.value);
    });
    if (tolInput) tolInput.addEventListener('input', () => { state.tolerance = Number(tolInput.value); });
    if (scaleInput) scaleInput.addEventListener('input', () => { state.processScale = Number(scaleInput.value); resizeCanvases(); });
    if (toggleInput) toggleInput.addEventListener('change', () => { state.enabled = toggleInput.checked; });

    // video events
    if (video) {
      video.addEventListener('loadedmetadata', resizeCanvases);
      video.addEventListener('play', () => { resizeCanvases(); startLoop(); });
      video.addEventListener('pause', stopLoop);
      video.addEventListener('ended', stopLoop);
    }

    // responsive
    window.addEventListener('resize', resizeCanvases);

    // set initial key color from input if present
    if (keyColorInput && keyColorInput.value) state.keyColor = hexToRgb(keyColorInput.value);
  }

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'h') {
      const ui = document.getElementById('chromaUI');
      if (ui) {
        ui.style.display = ui.style.display === 'none' ? 'flex' : 'none';
      }
    }
  });

  if (window.location.search.includes('demo=1')) {
    const ui = document.getElementById('chromaUI');
    if (ui) ui.style.display = 'flex';
  }
  // Resize output and processing canvases based on window & processScale
  function resizeCanvases() {
    if (!outCanvas || !video) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    outCanvas.width = vw;
    outCanvas.height = vh;

    // choose processing size (smaller = faster)
    const pw = Math.max(1, Math.round(vw * state.processScale));
    const ph = Math.max(1, Math.round(vh * state.processScale));
    procCanvas.width = pw;
    procCanvas.height = ph;
  }

  // Main frame loop: draw -> process -> upscale -> repeat
  function frame() {
    if (!video || video.paused || video.ended) {
      state.rafId = requestAnimationFrame(frame);
      return;
    }

    if (!state.enabled) {
      // draw original video directly if chroma disabled
      outCtx.drawImage(video, 0, 0, outCanvas.width, outCanvas.height);
      state.rafId = requestAnimationFrame(frame);
      return;
    }

    // draw scaled video to processing canvas
    procCtx.drawImage(video, 0, 0, procCanvas.width, procCanvas.height);

    // get pixels and chroma-key them
    const img = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
    const data = img.data;
    const k = state.keyColor;
    const tol2 = state.tolerance * state.tolerance;

    // simple RGB-distance key (fast); consider optimizations or WebGL shader later
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - k.r;
      const dg = data[i + 1] - k.g;
      const db = data[i + 2] - k.b;
      const dist2 = dr * dr + dg * dg + db * db;
      if (dist2 < tol2) data[i + 3] = 0; // transparent
    }

    procCtx.putImageData(img, 0, 0);

    // scale processed result to output canvas
    outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    outCtx.drawImage(procCanvas, 0, 0, outCanvas.width, outCanvas.height);

    state.rafId = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (state.rafId != null) return;
    state.rafId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (state.rafId != null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  // Utility: convert hex color (#rrggbb) to {r,g,b}
  function hexToRgb(hex) {
    const v = (hex || '#000000').replace('#', '');
    return {
      r: parseInt(v.substr(0, 2), 16),
      g: parseInt(v.substr(2, 2), 16),
      b: parseInt(v.substr(4, 2), 16),
    };
  }

  // Utility: sample the video at normalized coords (0..1) and set as key color
  function sampleKeyFromVideo(nx = 0.5, ny = 0.5) {
    if (!video || !procCtx) return;
    // draw one frame small
    procCtx.drawImage(video, 0, 0, procCanvas.width, procCanvas.height);
    const x = Math.floor(procCanvas.width * nx);
    const y = Math.floor(procCanvas.height * ny);
    const p = procCtx.getImageData(x, y, 1, 1).data;
    state.keyColor = { r: p[0], g: p[1], b: p[2] };
    if (keyColorInput) keyColorInput.value = rgbToHex(state.keyColor);
  }

  function rgbToHex({ r, g, b }) {
    const to2 = (n) => n.toString(16).padStart(2, '0');
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  }

  // Public API (expose minimal functions if needed)
  window.chroma = {
    init,
    start: startLoop,
    stop: stopLoop,
    sampleKeyFromVideo,
    setTolerance: (v) => { state.tolerance = v; if (tolInput) tolInput.value = v; },
    setProcessScale: (v) => { state.processScale = v; if (scaleInput) scaleInput.value = v; resizeCanvases(); },
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();