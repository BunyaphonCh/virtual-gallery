import { buildGallery } from './gallery.js';
import { GalleryControls } from './controls.js';
import { ArtworkViewer } from './artwork-viewer.js';
import { Minimap } from './minimap.js';
import { AmbientAudio } from './audio.js';
import { AutoTour } from './tour.js';
import { ARTWORKS } from './artworks.js';

// ── Scene ──────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled    = true;
renderer.shadowMap.type       = THREE.PCFSoftShadowMap;
renderer.toneMapping          = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure  = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0804);
scene.fog        = new THREE.FogExp2(0x1a1208, 0.028);

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 120);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// ── Build gallery ──────────────────────────────────────────
const frames = buildGallery(scene);

// ── Systems ────────────────────────────────────────────────
const controls = new GalleryControls(camera, canvas);
controls.position.set(0, 1.65, -1.5);
scene.add(controls._yawObject);

const viewer  = new ArtworkViewer(camera, controls, renderer, scene);
viewer.setMeshes(frames);

const minimap = new Minimap(camera);
const audio   = new AmbientAudio();
const tour    = new AutoTour(camera, controls, viewer);

// ── UI elements ────────────────────────────────────────────
const overlay     = document.getElementById('overlay');
const enterBtn    = document.getElementById('enter-btn');
const controlsBar = document.getElementById('controls-bar');
const hudHint     = document.getElementById('hud-hint');
const audioBtn    = document.getElementById('audio-btn');
const tourBtn     = document.getElementById('tour-btn');
const helpBtn     = document.getElementById('help-btn');
const totalEl     = document.getElementById('total-count');
const currentEl   = document.getElementById('current-idx');

totalEl.textContent = ARTWORKS.length;

// ── Audio state ────────────────────────────────────────────
let audioOn = false; // เริ่มต้นเป็น false — ยังไม่ได้เปิด

function setAudioUI(on) {
  audioOn = on;
  const dot = audioBtn.querySelector('.dot');
  if (on) {
    audioBtn.classList.add('active');
    dot.style.background = 'var(--accent)';
  } else {
    audioBtn.classList.remove('active');
    dot.style.background = 'var(--text-muted)';
  }
}

// ── Enter gallery ──────────────────────────────────────────
let entered = false;

enterBtn.addEventListener('click', async () => {
  if (entered) return;
  entered = true;

  overlay.classList.add('hidden');
  setTimeout(() => { overlay.style.display = 'none'; }, 700);

  controls.lock();
  controlsBar.classList.add('visible');
  hudHint.classList.add('visible');
  setTimeout(() => hudHint.classList.remove('visible'), 5000);

  // เริ่มเสียงทันที (อยู่ใน user gesture → AudioContext จะ resume ได้)
  try {
    await audio.start();
    setAudioUI(true);
  } catch(e) {
    console.warn('Audio failed:', e);
  }
});

// ── กด canvas อีกครั้งหลัง ESC → re-lock ──────────────────
canvas.addEventListener('click', () => {
  if (!entered) return;
  if (!controls.locked && !viewer.isOpen) {
    controls.lock();
  }
});

// ── ESC → unlock แต่ไม่ออกจากแอป ─────────────────────────
document.addEventListener('pointerlockchange', () => {
  // ถ้า unlock แล้วไม่ได้เปิด info panel → แสดง hint ให้คลิกกลับ
  if (!document.pointerLockElement && entered && !viewer.isOpen) {
    hudHint.textContent = 'คลิกที่หน้าจอเพื่อกลับเข้าโหมดเดิน';
    hudHint.classList.add('visible');
    setTimeout(() => {
      hudHint.textContent = 'WASD เดินชม · ลากเมาส์เพื่อหันมอง · คลิกที่ภาพเพื่อดู';
      hudHint.classList.remove('visible');
    }, 3000);
  }
});

// ── Audio button ───────────────────────────────────────────
audioBtn.addEventListener('click', async () => {
  if (audioOn) {
    audio.stop();
    setAudioUI(false);
  } else {
    try {
      await audio.start();
      setAudioUI(true);
    } catch(e) {
      console.warn('Audio failed:', e);
    }
  }
});

// ── Tour button ────────────────────────────────────────────
tourBtn.addEventListener('click', () => tour.toggle());

// ── Help button ────────────────────────────────────────────
helpBtn.addEventListener('click', () => {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:200;display:flex;align-items:center;justify-content:center;`;
  t.innerHTML = `
    <div style="background:#1a1208;border:1px solid #3a2a18;border-radius:12px;padding:32px 40px;color:#e0d8c8;max-width:380px;font-family:'Inter',sans-serif">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;margin-bottom:20px;color:#f0e8d8">วิธีใช้งาน</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;line-height:2.2">
        <tr><td style="color:#4caf7d;padding-right:20px">W A S D</td><td style="color:#a09880">เดินหน้า/หลัง/ซ้าย/ขวา</td></tr>
        <tr><td style="color:#4caf7d">Mouse</td><td style="color:#a09880">หันมองรอบ</td></tr>
        <tr><td style="color:#4caf7d">Space</td><td style="color:#a09880">กระโดด</td></tr>
        <tr><td style="color:#4caf7d">คลิกภาพ</td><td style="color:#a09880">ดูรายละเอียดผลงาน</td></tr>
        <tr><td style="color:#4caf7d">ESC</td><td style="color:#a09880">ออกจากโหมดเดิน</td></tr>
        <tr><td style="color:#4caf7d">คลิกหน้าจอ</td><td style="color:#a09880">กลับเข้าโหมดเดิน</td></tr>
        <tr><td style="color:#4caf7d;padding-top:12px">มือถือ</td><td style="color:#a09880;padding-top:12px">Joystick ซ้าย, ลากขวาหันมอง</td></tr>
      </table>
      <button onclick="this.parentElement.parentElement.remove()" style="margin-top:24px;width:100%;padding:10px;border-radius:8px;background:#4caf7d;border:none;color:#0a0806;font-size:13px;font-weight:500;cursor:pointer;">ตกลง</button>
    </div>
  `;
  document.body.appendChild(t);
  t.addEventListener('click', e => { if (e.target === t) t.remove(); });
});

// ── Nearest artwork counter ────────────────────────────────
let nearestIndex = -1;
const _tmpVec = new THREE.Vector3();

function updateNearest() {
  import('./gallery.js').then(({ ARTWORK_POSITIONS }) => {
    let best = 0, bestDist = Infinity;
    const camPos = controls.position;
    ARTWORK_POSITIONS.forEach((pos, i) => {
      _tmpVec.set(pos.x, 1.65, pos.z);
      const d = camPos.distanceTo(_tmpVec);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    nearestIndex = best;
    currentEl.textContent = best + 1;
  });
}

// ── Render loop ────────────────────────────────────────────
let frameCount = 0;
function animate() {
  requestAnimationFrame(animate);
  controls.update(-42, 0.5);
  viewer.update();
  tour.update();
  if (frameCount % 6  === 0) minimap.draw(tour.active ? tour.index : nearestIndex);
  if (frameCount % 20 === 0 && controls.locked) updateNearest();
  renderer.render(scene, camera);
  frameCount++;
}
animate();