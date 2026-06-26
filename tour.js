import { ARTWORK_POSITIONS } from './gallery.js';
import { ARTWORKS } from './artworks.js';

const DWELL_TIME    = 4000;  // ms to pause in front of each artwork
const TRAVEL_SPEED  = 0.04;  // units/frame toward target
const VIEW_DIST     = 2.2;

export class AutoTour {
  constructor(camera, controls, viewer) {
    this.camera   = camera;
    this.controls = controls;
    this.viewer   = viewer;

    this.active  = false;
    this.index   = 0;
    this.phase   = 'idle';   // 'travel' | 'dwell' | 'idle'
    this.dwellT  = 0;
    this.target  = new THREE.Vector3();

    this.labelEl = document.getElementById('tour-label');
    this.tourBtn = document.getElementById('tour-btn');
  }

  start() {
    if (this.active) return;
    this.active  = true;
    this.index   = 0;
    this.phase   = 'travel';
    document.exitPointerLock?.();
    this.controls.locked = false;
    this.tourBtn.classList.add('touring');
    this.tourBtn.innerHTML = '<span class="icon">■</span> หยุดทัวร์';
    this._setTarget(this.index);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.phase  = 'idle';
    this._hideLabel();
    this.tourBtn.classList.remove('touring');
    this.tourBtn.innerHTML = '<span class="icon">▶</span> ทัวร์อัตโนมัติ';
    // close info panel
    document.getElementById('info-panel').classList.remove('open');
  }

  toggle() { this.active ? this.stop() : this.start(); }

  _setTarget(i) {
    const pos  = ARTWORK_POSITIONS[i];
    const side = pos.side;
    const offX = side === 'left' ? VIEW_DIST : -VIEW_DIST;
    this.target.set(pos.x + offX, 1.65, pos.z);
  }

  update() {
    if (!this.active) return;

    if (this.phase === 'travel') {
      // Move camera smoothly toward target
      const diff   = this.target.clone().sub(this.camera.position);
      const dist   = diff.length();
      if (dist < 0.15) {
        // Arrived
        this.camera.position.copy(this.target);
        this._arriveAt(this.index);
      } else {
        const step = Math.min(TRAVEL_SPEED, dist);
        this.camera.position.addScaledVector(diff.normalize(), step);
        // Turn to face artwork
        const pos = ARTWORK_POSITIONS[this.index];
        this.controls.lookAt(new THREE.Vector3(pos.x, 1.65, pos.z));
      }
    }

    if (this.phase === 'dwell') {
      const now = performance.now();
      if (now - this.dwellT > DWELL_TIME) {
        this._next();
      }
    }
  }

  _arriveAt(i) {
    this.phase  = 'dwell';
    this.dwellT = performance.now();

    const art = ARTWORKS[i];
    this._showLabel(`${String(i+1).padStart(2,'0')} · ${art.title}`);

    // Open info panel
    this.viewer._showPanel(i);
    this.viewer.currentIndex = i;
  }

  _next() {
    this._hideLabel();
    document.getElementById('info-panel').classList.remove('open');
    this.index++;
    if (this.index >= ARTWORK_POSITIONS.length) {
      // Tour complete — go back to start
      this.index = 0;
      this.camera.position.set(0, 1.65, 3.5);
      this.stop();
      return;
    }
    this.phase = 'travel';
    this._setTarget(this.index);
  }

  _showLabel(text) {
    this.labelEl.textContent = text;
    this.labelEl.classList.add('show');
  }

  _hideLabel() {
    this.labelEl.classList.remove('show');
  }

  // Returns index of the artwork closest to the camera
  nearestIndex() {
    let best = 0, bestDist = Infinity;
    ARTWORK_POSITIONS.forEach((pos, i) => {
      const d = this.camera.position.distanceTo(new THREE.Vector3(pos.x, 1.65, pos.z));
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }
}