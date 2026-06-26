import { buildGallery } from './gallery.js';
import { GalleryControls } from './controls.js';
import { ArtworkViewer } from './artwork-viewer.js';
import { Minimap } from './minimap.js';
import { AmbientAudio } from './audio.js';
import { AutoTour } from './tour.js';
import { ARTWORKS } from './artworks.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0804);
scene.fog = new THREE.FogExp2(0x1a1208, 0.028);

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 120);
camera.position.set(0, 1.65, 3.5);

function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

resize();
window.addEventListener('resize', resize);

const frames = buildGallery(scene);

const controls = new GalleryControls(camera, canvas);
const viewer = new ArtworkViewer(camera, controls, renderer, scene);
viewer.setMeshes(frames);

const minimap = new Minimap(camera);
const audio = new AmbientAudio();
const tour = new AutoTour(camera, controls, viewer);

const overlay = document.getElementById('overlay');
const enterBtn = document.getElementById('enter-btn');
const controlsBar = document.getElementById('controls-bar');
const hudHint = document.getElementById('hud-hint');
const audioBtn = document.getElementById('audio-btn');
const tourBtn = document.getElementById('tour-btn');
const helpBtn = document.getElementById('help-btn');
const totalEl = document.getElementById('total-count');
const currentEl = document.getElementById('current-idx');

totalEl.textContent = ARTWORKS.length;

let audioOn = true;

enterBtn.addEventListener('click', async () => {
    overlay.classList.add('hidden');
    setTimeout(() => overlay.style.display = 'none', 700);
    controls.lock();
    controlsBar.classList.add('visible');
    hudHint.classList.add('visible');
    setTimeout(() => hudHint.classList.remove('visible'), 5000);

    try {
        await audio.start();
        audioBtn.querySelector('.dot').style.background = 'var(--accent)';
    } catch(e) { audioOn = false; }
});

audioBtn.addEventListener('click', async () => {
    if (audioOn) {
        audio.stop();
        audioBtn.classList, remove('active');
        audioOn = false;
    } else {
        await audio.start();
        audioBtn.classList.add('active');
        audioOn = true;
    }
});

tourBtn.addEventListener('click', () => tour.toggle());

helpBtn.addEventListener('click', () => {
    const t = document.createElement('div');
    t.style.cssText = `
        position: fixed; inset:0; background:rgba(0,0,0,0.8); z-index:200;
        display: flex; align-items:center; justify-content:center;
    `;
    t.innerHTML = `
    <div style="background:#1a1208;border:1px solid #3a2a18;border-radius:12px;padding:32px 40px;color:#e0d8c8;max-width:380px;font-family:'Inter',sans-serif">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;margin-bottom:20px;color:#f0e8d8">วิธีใช้งาน</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;line-height:2.2">
        <tr><td style="color:#4caf7d;padding-right:20px">W A S D</td><td style="color:#a09880">เดินหน้า/หลัง/ซ้าย/ขวา</td></tr>
        <tr><td style="color:#4caf7d">Mouse</td><td style="color:#a09880">หันมองรอบ</td></tr>
        <tr><td style="color:#4caf7d">คลิกภาพ</td><td style="color:#a09880">ดูรายละเอียดผลงาน</td></tr>
        <tr><td style="color:#4caf7d">ESC</td><td style="color:#a09880">ออกจากโหมดเดิน</td></tr>
        <tr><td style="color:#4caf7d">← →</td><td style="color:#a09880">เลื่อนผลงานใน panel</td></tr>
        <tr><td style="color:#4caf7d;padding-top:12px">มือถือ</td><td style="color:#a09880;padding-top:12px">Joystick ซ้าย, ลากขวาหันมอง</td></tr>
      </table>
      <button onclick="this.parentElement.parentElement.remove()" style="
        margin-top:24px;width:100%;padding:10px;border-radius:8px;
        background:#4caf7d;border:none;color:#0a0806;font-size:13px;
        font-weight:500;cursor:pointer;font-family:'Inter',sans-serif
      ">ตกลง</button>
    </div>
    `;
    document.body.appendChild(t);
    t.addEventListener('click', e => { if(e.target===t) t.remove();});
});

let nearestIndex = -1;
const _tmpVec = new THREE.Vector3();

function updateNearest() {
    let best = 0, bestDist = Infinity;
    import('./gallery.js').then(({ ARTWORK_POSITIONS }) => {
        ARTWORK_POSITIONS.forEach((pos, i) => {
            _tmpVec.set(pos.x, 1.65, pos.z);
            const d = camera.position.distanceTo(_tmpVec);
            if (d < bestDist) { bestDist = d; best = i; }
        });
        nearestIndex = best;
        currentEl.textContent = best + 1;
    });
}

let frameCount = 0;
function animate() {
    requestAnimationFrame(animate);

    controls.update(-78, 3.0);
    viewer.update();
    tour.update();

    if (frameCount % 6 === 0) {
        minimap.draw(tour.active ? tour.index : nearestIndex);
    }

    if (frameCount % 20 === 0 && controls.locked) {
        updateNearest();
    }

    renderer.render(scene, camera);
    frameCount++;
}
animate();