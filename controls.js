const SPEED        = 0.055;
const LOOK_SENS    = 0.0022;
const MOBILE_SPEED = 0.045;

export class GalleryControls {
  constructor(camera, domElement) {
    this.camera     = camera;
    this.dom        = domElement;
    this.locked     = false;
    this.isMobile   = window.matchMedia('(pointer: coarse)').matches;

    // Movement state
    this.keys = {};
    this.euler = new THREE.Euler(0, Math.PI, 0, 'YXZ'); // face down corridor
    this.camera.quaternion.setFromEuler(this.euler);

    // Joystick state (mobile)
    this.joy = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    // Look drag state (mobile, right half of screen)
    this.look = { active: false, startX: 0, startY: 0, prevX: 0, prevY: 0 };

    this._tmp = {
      dir:   new THREE.Vector3(),
      right: new THREE.Vector3(),
      flat:  new THREE.Vector3(),
    };

    this._initDesktop();
    if (this.isMobile) this._initMobile();
  }

  // ── Desktop ───────────────────────────────────────────────
  _initDesktop() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      e.code === 'Escape' && this._unlock();
    });
    document.addEventListener('keyup',   e => { this.keys[e.code] = false; });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.euler.y -= e.movementX * LOOK_SENS;
      this.euler.x -= e.movementY * LOOK_SENS;
      this.euler.x  = Math.max(-Math.PI * 0.38, Math.min(Math.PI * 0.38, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  lock() {
    if (!this.isMobile) {
      this.dom.requestPointerLock?.();
    } else {
      this.locked = true;
    }
  }

  _unlock() { document.exitPointerLock?.(); }

  // ── Mobile ────────────────────────────────────────────────
  _initMobile() {
    const base  = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');

    const onJoyStart = e => {
      const t = e.changedTouches[0];
      this.joy = { active: true, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
      e.preventDefault();
    };
    const onJoyMove = e => {
      if (!this.joy.active) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.joy.startX;
      const dy = t.clientY - this.joy.startY;
      const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 36);
      const ang  = Math.atan2(dy, dx);
      this.joy.dx = Math.cos(ang) * dist / 36;
      this.joy.dy = Math.sin(ang) * dist / 36;
      thumb.style.transform = `translate(${Math.cos(ang)*dist*0.5}px,${Math.sin(ang)*dist*0.5}px)`;
      e.preventDefault();
    };
    const onJoyEnd = () => {
      this.joy = { active: false, startX:0, startY:0, dx:0, dy:0 };
      thumb.style.transform = '';
    };

    base.addEventListener('touchstart', onJoyStart, { passive: false });
    document.addEventListener('touchmove',  onJoyMove,  { passive: false });
    document.addEventListener('touchend',   onJoyEnd);

    // Right-side drag = look
    document.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      if (t.clientX > window.innerWidth * 0.35) {
        this.look = { active: true, startX: t.clientX, startY: t.clientY, prevX: t.clientX, prevY: t.clientY };
      }
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!this.look.active) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.look.prevX;
      const dy = t.clientY - this.look.prevY;
      this.euler.y -= dx * LOOK_SENS * 1.5;
      this.euler.x -= dy * LOOK_SENS * 1.5;
      this.euler.x  = Math.max(-Math.PI * 0.38, Math.min(Math.PI * 0.38, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
      this.look.prevX = t.clientX;
      this.look.prevY = t.clientY;
    }, { passive: true });
    document.addEventListener('touchend', () => { this.look.active = false; });
  }

  // ── Update (call every frame) ──────────────────────────────
  update(boundsMinZ, boundsMaxZ) {
    if (!this.locked) return;

    const { dir, right, flat } = this._tmp;
    this.camera.getWorldDirection(dir);
    flat.set(dir.x, 0, dir.z).normalize();
    right.crossVectors(flat, new THREE.Vector3(0, 1, 0)).negate();

    // Desktop keys
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    this.camera.position.addScaledVector(flat, SPEED);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  this.camera.position.addScaledVector(flat, -SPEED);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  this.camera.position.addScaledVector(right, -SPEED);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.camera.position.addScaledVector(right, SPEED);

    // Mobile joystick
    if (this.joy.active) {
      this.camera.position.addScaledVector(flat,  -this.joy.dy * MOBILE_SPEED);
      this.camera.position.addScaledVector(right,  this.joy.dx * MOBILE_SPEED);
    }

    // Clamp to corridor
    this.camera.position.x = Math.max(-3.5, Math.min(3.5, this.camera.position.x));
    this.camera.position.z = Math.max(boundsMinZ, Math.min(boundsMaxZ, this.camera.position.z));
    this.camera.position.y = 1.65; // fixed eye height
  }

  // Smoothly set camera look direction toward a target point
  lookAt(target) {
    const dir = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
    this.euler.y = Math.atan2(-dir.x, -dir.z);
    this.euler.x = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    this.camera.quaternion.setFromEuler(this.euler);
  }
}