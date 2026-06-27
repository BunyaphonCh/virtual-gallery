import { ARTWORK_POSITIONS } from './gallery.js';
import { ARTWORKS } from './artworks.js';

const DWELL_TIME   = 4000;
const TRAVEL_SPEED = 0.04;
const VIEW_DIST    = 2.2;

export class AutoTour {
  constructor(camera, controls, viewer) {
    this.camera   = camera;
    this.controls = controls;
    this.viewer   = viewer;

    this.active = false;
    this.index  = 0;
    this.phase  = 'idle';
    this.dwellT = 0;
    this.target = new THREE.Vector3();

    this.labelEl = document.getElementById('tour-label');
    this.tourBtn = document.getElementById('tour-btn');
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.index  = 0;
    this.phase  = 'travel';
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
    document.getElementById('info-panel').classList.remove('open');
  }

  toggle() { this.active ? this.stop() : this.start(); }

  _setTarget(i) {
    const pos  = ARTWORK_POSITIONS[i];
    const offX = pos.side === 'left' ? VIEW_DIST : -VIEW_DIST;
    this.target.set(pos.x + offX, 1.65, pos.z);
  }

  update() {
    if (!this.active) return;

    if (this.phase === 'travel') {
      const pos  = this.controls.position;
      const diff = this.target.clone().sub(pos);
      diff.y = 0;
      const dist = diff.length();

      if (dist < 0.15) {
        pos.copy(this.target);
        this._arriveAt(this.index);
      } else {
        pos.addScaledVector(diff.normalize(), TRAVEL_SPEED);
        this.controls.lookAt(new THREE.Vector3(
          ARTWORK_POSITIONS[this.index].x,
          1.65,
          ARTWORK_POSITIONS[this.index].z
        ));
      }
    }

    if (this.phase === 'dwell') {
      if (performance.now() - this.dwellT > DWELL_TIME) this._next();
    }
  }

  _arriveAt(i) {
    this.phase  = 'dwell';
    this.dwellT = performance.now();
    const art   = ARTWORKS[i];
    this._showLabel(`${String(i+1).padStart(2,'0')} · ${art.title}`);
    this.viewer._showPanel(i);
    this.viewer.currentIndex = i;
  }

  _next() {
    this._hideLabel();
    document.getElementById('info-panel').classList.remove('open');
    this.index++;
    if (this.index >= ARTWORK_POSITIONS.length) {
      this.controls.position.set(0, 1.65, -1.5);
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

  _hideLabel() { this.labelEl.classList.remove('show'); }

  nearestIndex() {
    let best = 0, bestDist = Infinity;
    const pos = this.controls.position;
    ARTWORK_POSITIONS.forEach((p, i) => {
      const d = pos.distanceTo(new THREE.Vector3(p.x, 1.65, p.z));
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }
}