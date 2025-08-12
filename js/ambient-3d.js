// Ambient 3D background and subtle tilt effects
// Non-intrusive: does not alter existing functionality or dependencies

function createAmbientCanvas() {
  const canvas = document.createElement('canvas');
  canvas.id = 'ambient3dCanvas';
  canvas.className = 'ambient-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.opacity = '0.8';
  document.body.prepend(canvas);
  return canvas;
}

function ambient3D() {
  const canvas = createAmbientCanvas();
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const { innerWidth: w, innerHeight: h } = window;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  // Simple 3D cube wireframe
  const cubeSize = 140;
  let t = 0;
  const center = () => ({ x: canvas.width / 2, y: Math.max(canvas.height * 0.28, 180 * DPR) });

  // 8 vertices of a cube
  const base = cubeSize;
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1]
  ].map(p => p.map(v => v * base));

  // Edges between vertices
  const edges = [
    [0,1],[1,2],[2,3],[3,0], // back face
    [4,5],[5,6],[6,7],[7,4], // front face
    [0,4],[1,5],[2,6],[3,7]  // connections
  ];

  // Ambient particles for depth feel
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 2 + 1, // depth 1..3
    r: Math.random() * 1.2 + 0.4
  }));

  function rotate([x, y, z], ax, ay) {
    // Rotate around X
    const cosX = Math.cos(ax), sinX = Math.sin(ax);
    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;
    // Rotate around Y
    const cosY = Math.cos(ay), sinY = Math.sin(ay);
    let x2 = x * cosY + z1 * sinY;
    let z2 = -x * sinY + z1 * cosY;
    return [x2, y1, z2];
  }

  function project([x, y, z]) {
    const fov = 500 * DPR; // perspective factor
    const dist = z + 800 * DPR; // keep in front of camera
    const { x: cx, y: cy } = center();
    return [cx + (x * fov) / dist, cy + (y * fov) / dist];
  }

  function themeColors() {
    const dark = document.body.classList.contains('dark-mode');
    return dark
      ? { line: 'rgba(255,255,255,0.55)', glow: 'rgba(80,160,255,0.25)', particle: 'rgba(255,255,255,0.55)', bg: 'transparent' }
      : { line: 'rgba(0,0,0,0.45)', glow: 'rgba(0,80,200,0.12)', particle: 'rgba(20,20,20,0.45)', bg: 'transparent' };
  }

  let mouseTilt = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    // Subtle parallax from mouse position
    const w = window.innerWidth, h = window.innerHeight;
    const nx = (e.clientX / w) * 2 - 1;
    const ny = (e.clientY / h) * 2 - 1;
    mouseTilt.x = nx * 0.3;
    mouseTilt.y = ny * 0.25;
  }, { passive: true });

  function draw() {
    const { width, height } = canvas;
    const { line, glow, particle, bg } = themeColors();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Background subtle gradient at the top area only
    const grad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    grad.addColorStop(0, glow);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = bg || 'transparent';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height * 0.7);

    // Draw particles
    ctx.fillStyle = particle;
    particles.forEach(p => {
      // parallax by z
      const px = (p.x * width + Math.sin(t * 0.001 + p.y * 6) * 6 * DPR / p.z) + mouseTilt.x * 12 * DPR;
      const py = (p.y * height * 0.7 + Math.cos(t * 0.0012 + p.x * 6) * 6 * DPR / p.z) + mouseTilt.y * 12 * DPR;
      ctx.beginPath();
      ctx.arc(px, py, p.r * DPR / p.z, 0, Math.PI * 2);
      ctx.fill();
    });

    // Rotating cube
    const ax = t * 0.0012 + mouseTilt.y;
    const ay = t * 0.0016 + mouseTilt.x;
    const rotated = vertices.map(v => rotate(v, ax, ay));
    const projected = rotated.map(project);

    ctx.lineWidth = 1.2 * DPR;
    ctx.strokeStyle = line;
    ctx.beginPath();
    edges.forEach(([a, b]) => {
      const [x1, y1] = projected[a];
      const [x2, y2] = projected[b];
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    });
    ctx.stroke();

    t += 16; // time step ~ 60fps
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

function initTiltEffects() {
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  if (!supportsHover) return; // avoid on touch devices

  const elements = document.querySelectorAll('.stat-card, .action-card, .analytics-card, .progress-card, .exam-card, .panel, .dashboard-card, .announcements-card, .setup-section, .premium-card');
  elements.forEach(el => {
    el.style.transformStyle = 'preserve-3d';
    el.style.willChange = 'transform';
    el.style.transition = el.style.transition || 'transform 150ms ease, box-shadow 150ms ease';

    function onMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - y) * 8;  // rotateX max 8deg
      const ry = (x - 0.5) * 10; // rotateY max 10deg
      const shadowX = (x - 0.5) * 12;
      const shadowY = (y - 0.5) * 12;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
      el.style.boxShadow = `${-shadowX}px ${shadowY + 8}px 24px rgba(0,0,0,0.12)`;
    }

    function onLeave() {
      el.style.transform = '';
      el.style.boxShadow = '';
    }

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  });
}

function initAmbientEnhancements() {
  try {
    ambient3D();
  } catch (e) {
    // Fail quietly if canvas is blocked
    console.warn('Ambient 3D disabled:', e);
  }
  // Tilt effects disabled by default to reduce hover motion. Enable by adding 'enable-tilt' class to body.
  if (document.body.classList.contains('enable-tilt')) {
    initTiltEffects();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAmbientEnhancements);
} else {
  initAmbientEnhancements();
}

