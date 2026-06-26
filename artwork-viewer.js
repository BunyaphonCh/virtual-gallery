import { ARTWORKS } from './artworks.js';
import { ARTWORK_POSITIONS } from './gallery.js';
import { drawInfoThumb } from './artworks.js';

const FLY_DURATION = 1200; // ms
const VIEW_DIST    = 2.0;  // meters in front of artwork

export class ArtworkViewer {
  constructor(camera, controls, renderer, scene) {
    this.camera    = camera;
    this.controls  = controls;
    this.renderer  = renderer;
    this.scene     = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouse     = new THREE.Vector2();

    this.flying       = false;
    this.flyStart     = 0;
    this.flyFromPos   = new THREE.Vector3();
    this.flyToPos     = new THREE.Vector3();
    this.flyFromQuat  = new THREE.Quaternion();
    this.flyToQuat    = new THREE.Quaternion();
    this.currentIndex = -1;

    this.artworkMeshes = []; // filled by setMeshes()

    // DOM
    this.panel      = document.getElementById('info-panel');
    this.closeBtn   = document.getElementById('info-close');
    this.prevBtn    = document.getElementById('info-prev');
    this.nextBtn    = document.getElementById('info-next');
    this.thumb      = document.getElementById('info-thumb');
    this.thumb.width  = 340;
    this.thumb.height = 200;

    this._bindDOM();
  }

  setMeshes(frames) {
    // frames is array of THREE.Group; collect the PlaneGeometry child (artwork surface)
    this.artworkMeshes = [];
    frames.forEach(group => {
      group.traverse(child => {
        if (child.userData?.isArtwork) this.artworkMeshes.push(child);
      });
    });
  }

  _bindDOM() {
    this.closeBtn.addEventListener('click', () => this._closePanel());
    this.prevBtn.addEventListener('click',  () => this._navigate(-1));
    this.nextBtn.addEventListener('click',  () => this._navigate(1));

    // Desktop click
    this.renderer.domElement.addEventListener('click', e => {
      if (!this.controls.locked || this.flying) return;
      this._trySelect(0.5, 0.5); // screen center (pointer-locked)
    });

    // Mobile tap
    this.renderer.domElement.addEventListener('touchend', e => {
      if (this.flying) return;
      const t = e.changedTouches[0];
      const nx = t.clientX / window.innerWidth  * 2 - 1;
      const ny = -(t.clientY / window.innerHeight) * 2 + 1;
      this._trySelect((nx + 1) / 2, (1 - ny) / 2);
    });
  }

  _trySelect(nx, ny) {
    this.raycaster.setFromCamera(
      new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1)),
      this.camera
    );
    const hits = this.raycaster.intersectObjects(this.artworkMeshes);
    if (hits.length && hits[0].distance < 6) {
      const idx = hits[0].object.userData.artIndex;
      this._openArtwork(idx);
    }
  }

  _openArtwork(index) {
    this.currentIndex = index;
    this._showPanel(index);
    this._flyToArtwork(index);
    // Unlock pointer so user can interact with panel
    document.exitPointerLock?.();
    this.controls.locked = false;
  }

  _flyToArtwork(index) {
    const pos  = ARTWORK_POSITIONS[index];
    const side = pos.side;

    // Target position: in front of the artwork
    const offsetX = side === 'left' ? VIEW_DIST : -VIEW_DIST;
    this.flyToPos.set(pos.x + offsetX, 1.65, pos.z);

    // Target look quaternion: face the artwork
    const lookDir = new THREE.Vector3(
      side === 'left' ? -1 : 1, 0, 0
    );
    const lookQ = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const mat = new THREE.Matrix4().lookAt(
      this.flyToPos,
      new THREE.Vector3(pos.x, 1.65, pos.z),
      up
    );
    lookQ.setFromRotationMatrix(mat);

    this.flyFromPos.copy(this.camera.position);
    this.flyFromQuat.copy(this.camera.quaternion);
    this.flyToQuat.copy(lookQ);
    this.flyStart = performance.now();
    this.flying   = true;
  }

  update() {
    if (!this.flying) return;

    const elapsed = performance.now() - this.flyStart;
    const t = Math.min(elapsed / FLY_DURATION, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease-in-out quad

    this.camera.position.lerpVectors(this.flyFromPos, this.flyToPos, ease);
    this.camera.quaternion.slerpQuaternions(this.flyFromQuat, this.flyToQuat, ease);

    if (t >= 1) this.flying = false;
  }

  _showPanel(index) {
    const art = ARTWORKS[index];
    document.getElementById('info-num').textContent       = `NO. ${String(art.id).padStart(2, '0')} / 16`;
    document.getElementById('info-title').textContent     = art.title;
    document.getElementById('info-artist').textContent    = art.artist;
    document.getElementById('info-year').textContent      = art.year;
    document.getElementById('info-technique').textContent = art.technique;
    document.getElementById('info-desc').textContent      = art.desc;

    drawInfoThumb(art, this.thumb);

    this.panel.classList.add('open');
  }

  _closePanel() {
    this.panel.classList.remove('open');
    this.currentIndex = -1;
    // Re-lock controls
    this.controls.lock();
  }

  _navigate(dir) {
    const next = (this.currentIndex + dir + ARTWORKS.length) % ARTWORKS.length;
    this.currentIndex = next;
    this._showPanel(next);
    this._flyToArtwork(next);
  }

  get isOpen() { return this.panel.classList.contains('open'); }
}