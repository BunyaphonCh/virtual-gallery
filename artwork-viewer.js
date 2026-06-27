import { ARTWORKS } from './artworks.js';
import { ARTWORK_POSITIONS } from './gallery.js';
import { drawInfoThumb } from './artworks.js';

const FLY_DURATION = 1200;
const VIEW_DIST    = 2.0;

export class ArtworkViewer {
  constructor(camera, controls, renderer, scene) {
    this.camera    = camera;
    this.controls  = controls;
    this.renderer  = renderer;
    this.scene     = scene;
    this.raycaster = new THREE.Raycaster();

    this.flying      = false;
    this.flyStart    = 0;
    this.flyFromPos  = new THREE.Vector3();
    this.flyToPos    = new THREE.Vector3();
    this.flyToYaw    = 0;
    this.flyFromYaw  = 0;
    this.currentIndex = -1;
    this.artworkMeshes = [];

    this.panel    = document.getElementById('info-panel');
    this.closeBtn = document.getElementById('info-close');
    this.prevBtn  = document.getElementById('info-prev');
    this.nextBtn  = document.getElementById('info-next');
    this.thumb    = document.getElementById('info-thumb');
    this.thumb.width  = 340;
    this.thumb.height = 200;

    this._bindDOM();
  }

  setMeshes(frames) {
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

    this.renderer.domElement.addEventListener('click', () => {
      if (!this.controls.locked || this.flying) return;
      this._trySelect(0.5, 0.5);
    });

    this.renderer.domElement.addEventListener('touchend', e => {
      if (this.flying) return;
      const t  = e.changedTouches[0];
      const nx = t.clientX / window.innerWidth  * 2 - 1;
      const ny = -(t.clientY / window.innerHeight) * 2 + 1;
      this._trySelect((nx + 1) / 2, (1 - ny) / 2);
    });
  }

  _trySelect(nx, ny) {
    this.raycaster.setFromCamera(new THREE.Vector2(nx*2-1, -(ny*2-1)), this.camera);
    const hits = this.raycaster.intersectObjects(this.artworkMeshes);
    if (hits.length && hits[0].distance < 6) {
      this._openArtwork(hits[0].object.userData.artIndex);
    }
  }

  _openArtwork(index) {
    this.currentIndex = index;
    this._showPanel(index);
    this._flyToArtwork(index);
    document.exitPointerLock?.();
    this.controls.locked = false;
  }

  _flyToArtwork(index) {
    const pos    = ARTWORK_POSITIONS[index];
    const side   = pos.side;
    const offsetX = side === 'left' ? VIEW_DIST : -VIEW_DIST;

    this.flyToPos.set(pos.x + offsetX, 1.65, pos.z);
    // yaw target = หันเข้าหาภาพ
    const dx = pos.x - this.flyToPos.x;
    const dz = pos.z - this.flyToPos.z;
    this.flyToYaw = Math.atan2(-dx, -dz);

    this.flyFromPos.copy(this.controls.position);
    this.flyFromYaw   = this.controls._yawObject.rotation.y;
    this.flyFromPitch = this.controls._pitchObject.rotation.x;
    this.flyStart     = performance.now();
    this.flying       = true;
  }

  update() {
    if (!this.flying) return;

    const elapsed = performance.now() - this.flyStart;
    const t    = Math.min(elapsed / FLY_DURATION, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;

    // เลื่อน yawObject position (ตำแหน่งจริงของกล้อง)
    this.controls.position.lerpVectors(this.flyFromPos, this.flyToPos, ease);

    let yawDiff = this.flyToYaw - this.flyFromYaw;
    if (yawDiff >  Math.PI) yawDiff -= Math.PI * 2;
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.controls._yawObject.rotation.y = this.flyFromYaw + yawDiff * ease;

    // reset pitch → 0 (มองตรง) อย่างนุ่มนวล
    this.controls._pitchObject.rotation.x = this.flyFromPitch * (1 - ease);

    if (t >= 1) {
      this.controls._pitchObject.rotation.x = 0;
      this.flying = false;
    }
  }

  _showPanel(index) {
    const art = ARTWORKS[index];
    document.getElementById('info-num').textContent       = `NO. ${String(art.id).padStart(2,'0')} / 16`;
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