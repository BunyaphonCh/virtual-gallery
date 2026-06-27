const SPEED        = 0.055;
const LOOK_SENS    = 0.002;
const MOBILE_SPEED = 0.045;
const JUMP_FORCE   = 0.12;
const GRAVITY      = 0.008;
const EYE_HEIGHT   = 1.65;
const PI_2         = Math.PI / 2;

export class GalleryControls {
  constructor(camera, domElement) {
    this.camera   = camera;
    this.dom      = domElement;
    this.locked   = false;
    this.isMobile = window.matchMedia('(pointer: coarse)').matches;
    this.keys     = {};

    // วิธีของ Three.js PointerLockControls:
    // แยกกล้องออกเป็น 2 object ซ้อนกัน
    // _pitchObject (X rotation) อยู่ใน _yawObject (Y rotation)
    this._pitchObject = new THREE.Object3D();
    this._pitchObject.add(camera);

    this._yawObject = new THREE.Object3D();
    this._yawObject.position.y = EYE_HEIGHT;
    this._yawObject.add(this._pitchObject);

    // Jump
    this._velY     = 0;
    this._onGround = true;

    // Mobile
    this.joy  = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    this.look = { active: false, prevX: 0, prevY: 0 };

    this._tmp = {
      dir:   new THREE.Vector3(),
      right: new THREE.Vector3(),
      flat:  new THREE.Vector3(),
    };

    this._initDesktop();
    if (this.isMobile) this._initMobile();
  }

  // ตำแหน่งกล้องจริงๆ อ่านจาก _yawObject
  get position() { return this._yawObject.position; }

  _initDesktop() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Escape') this._unlock();
      if (e.code === 'Space' && this._onGround) {
        this._velY     = JUMP_FORCE;
        this._onGround = false;
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });

    document.addEventListener('mousemove', e => {
      if (!this.locked) return;

      // yaw = หมุนรอบ Y ของ _yawObject (ซ้าย-ขวา) → ไม่มี limit
      this._yawObject.rotation.y   -= e.movementX * LOOK_SENS;

      // pitch = หมุนรอบ X ของ _pitchObject (ขึ้น-ลง) → clamp ±89°
      this._pitchObject.rotation.x -= e.movementY * LOOK_SENS;
      this._pitchObject.rotation.x  = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, this._pitchObject.rotation.x));
    });
  }

  lock() {
    if (!this.isMobile) this.dom.requestPointerLock?.();
    else this.locked = true;
  }

  _unlock() { document.exitPointerLock?.(); }

  _initMobile() {
    const base  = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');

    base.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      this.joy = { active: true, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', e => {
      if (!this.joy.active) return;
      const t    = e.changedTouches[0];
      const dx   = t.clientX - this.joy.startX;
      const dy   = t.clientY - this.joy.startY;
      const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 36);
      const ang  = Math.atan2(dy, dx);
      this.joy.dx = Math.cos(ang) * dist / 36;
      this.joy.dy = Math.sin(ang) * dist / 36;
      thumb.style.transform = `translate(${Math.cos(ang)*dist*0.5}px,${Math.sin(ang)*dist*0.5}px)`;
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
      this.joy = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
      thumb.style.transform = '';
    });

    document.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      if (t.clientX > window.innerWidth * 0.35)
        this.look = { active: true, prevX: t.clientX, prevY: t.clientY };
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!this.look.active) return;
      const t = e.changedTouches[0];
      this._yawObject.rotation.y   -= (t.clientX - this.look.prevX) * LOOK_SENS * 1.5;
      this._pitchObject.rotation.x -= (t.clientY - this.look.prevY) * LOOK_SENS * 1.5;
      this._pitchObject.rotation.x  = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, this._pitchObject.rotation.x));
      this.look.prevX = t.clientX;
      this.look.prevY = t.clientY;
    }, { passive: true });

    document.addEventListener('touchend', () => { this.look.active = false; });
  }

  update(boundsMinZ, boundsMaxZ) {
    if (!this.locked) return;

    const { dir, right, flat } = this._tmp;

    // ทิศที่กล้องหัน (world space)
    this.camera.getWorldDirection(dir);
    flat.set(dir.x, 0, dir.z).normalize();
    right.crossVectors(flat, new THREE.Vector3(0, 1, 0)).normalize();

    const pos = this._yawObject.position;

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    pos.addScaledVector(flat,   SPEED);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  pos.addScaledVector(flat,  -SPEED);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  pos.addScaledVector(right, -SPEED);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) pos.addScaledVector(right,  SPEED);

    if (this.joy.active) {
      pos.addScaledVector(flat,  -this.joy.dy * MOBILE_SPEED);
      pos.addScaledVector(right,  this.joy.dx * MOBILE_SPEED);
    }

    // Jump physics
    this._velY -= GRAVITY;
    pos.y += this._velY;
    if (pos.y <= EYE_HEIGHT) {
      pos.y          = EYE_HEIGHT;
      this._velY     = 0;
      this._onGround = true;
    }

    pos.x = Math.max(-4.0, Math.min(4.0, pos.x));
    pos.z = Math.max(boundsMinZ, Math.min(boundsMaxZ, pos.z));
  }

  // หันกล้องไปหา target (ใช้โดย tour.js)
  lookAt(target) {
    const pos = this._yawObject.position;
    const dx  = target.x - pos.x;
    const dz  = target.z - pos.z;
    const dy  = target.y - pos.y;
    const hDist = Math.sqrt(dx*dx + dz*dz);

    this._yawObject.rotation.y   = Math.atan2(-dx, -dz);
    this._pitchObject.rotation.x = Math.atan2(dy, hDist);
  }
}