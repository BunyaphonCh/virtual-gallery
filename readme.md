# 🖼️ The Long Gallery

> Virtual Art Exhibition — ลองใช้ Three.js ทำหอศิลป์ 3D

---

## เป้าหมาย

สร้างขึ้นเพื่อ**เรียนรู้ Three.js** โดยใช้ Virtual Art Gallery เป็น use case จริง ครอบคลุมสิ่งที่ต้องรู้ใน Three.js เกือบทั้งหมด ตั้งแต่ geometry, material, lighting, texture, camera controls ไปจนถึง raycasting

---

## สิ่งที่ได้เรียนรู้จาก Three.js

| หัวข้อ | สิ่งที่ทำในโปรเจกต์ |
|--------|---------------------|
| **Scene / Camera / Renderer** | ตั้งค่า WebGLRenderer, PerspectiveCamera, Scene พื้นฐาน |
| **Geometry** | PlaneGeometry (ผนัง/พื้น), BoxGeometry (กรอบรูป/เสา) |
| **Material** | MeshLambertMaterial พร้อม texture map |
| **Texture** | สร้าง CanvasTexture จาก Canvas 2D API |
| **Lighting** | AmbientLight, HemisphereLight, SpotLight, PointLight |
| **Fog** | FogExp2 สร้างบรรยากาศลึก |
| **Tone Mapping** | ACESFilmicToneMapping |
| **Raycasting** | คลิกภาพ → ตรวจว่าโดน mesh ไหน |
| **Camera Rig** | yawObject/pitchObject hierarchy สำหรับ FPS camera |
| **Animation** | requestAnimationFrame loop, lerp, slerp |
| **Object3D / Group** | จัดกลุ่ม mesh หลายชิ้นเป็น frame เดียว |

---

## ฟีเจอร์

- 🚶 เดินใน corridor 3D ด้วย **WASD** + **mouse look**
- 🖱️ **คลิกภาพ** → กล้องบินเข้าหา + เปิด info panel
- 🗺️ **Minimap** แสดงตำแหน่งและทิศที่หัน
- 🎵 **เสียงบรรยากาศ** สังเคราะห์ด้วย Web Audio API
- 🎬 **Auto Tour** พาชมทีละภาพอัตโนมัติ
- 📱 **Mobile** รองรับ joystick + drag look
- ⬆️ **กระโดด** ด้วย Space

---

## โครงสร้างไฟล์

```
virtual-gallery/
├── index.html          ← HTML shell + DOM elements ทั้งหมด
├── style.css           ← UI overlay (panel, minimap, controls bar)
├── main.js             ← bootstrap ประกอบทุก system เข้าด้วยกัน
├── gallery.js          ← สร้าง corridor 3D + วางกรอบรูป 16 ชิ้น
├── artworks.js         ← ข้อมูล 16 ผลงาน + สร้าง texture ด้วย Canvas 2D
├── controls.js         ← FPS camera controls (WASD + PointerLock + mobile)
├── artwork-viewer.js   ← click → fly animation + info panel
├── minimap.js          ← minimap 2D บน canvas
├── audio.js            ← ambient music ด้วย Web Audio API
└── tour.js             ← auto-tour sequencer
```

---

## วิธีรัน

ต้องรันผ่าน HTTP server เพราะใช้ ES Modules (เปิดเป็น `file://` ตรงๆ ไม่ได้)

```bash
# วิธีที่ 1: npx serve
cd virtual-gallery
npx serve .

# วิธีที่ 2: Python
cd virtual-gallery
python3 -m http.server 8080

# แล้วเปิด browser ที่ http://localhost:8080
```

---

## Tech Stack

| เทคโนโลยี | การใช้งาน |
|-----------|----------|
| **Three.js r128** | 3D rendering หลัก |
| **Pointer Lock API** | mouse look แบบ FPS |
| **Canvas 2D API** | สร้าง texture ภาพแต่ละชิ้น |
| **Web Audio API** | เสียงบรรยากาศสังเคราะห์ |
| **ES Modules** | แบ่งโค้ดเป็น module |
| **Vanilla JS** | ไม่มี framework |

---

## วิธีใส่รูปจริง

แก้ใน `artworks.js` เพิ่ม `imageUrl` ในแต่ละ artwork แล้วแก้ฟังก์ชัน `makeArtworkTexture`:

```js
// artworks.js
export const ARTWORKS = [
  {
    title: 'ชื่อภาพ',
    artist: 'ชื่อช่างภาพ',
    year: '2024',
    technique: 'Photography',
    desc: 'คำอธิบาย...',
    imageUrl: './images/photo1.jpg',  // ← เพิ่มตรงนี้
    palette: ['#...'],
    style: 'landscape',
  },
  // ...
]

// แล้วแก้ฟังก์ชัน makeArtworkTexture ให้โหลดรูปจริง
export function makeArtworkTexture(art) {
  if (art.imageUrl) {
    return new THREE.TextureLoader().load(art.imageUrl);
  }
  // ... โค้ดวาด placeholder เดิม
}
```

วางรูปไว้ใน folder `virtual-gallery/images/`

---

*สร้างด้วย Three.js r128 · Vanilla JS · ES Modules*