// gallery.js — builds the corridor room + places 16 artwork frames

import { ARTWORKS, makeArtworkTexture } from './artworks.js';

const CORRIDOR_LENGTH = 44;   // Z extends from 0 to -CORRIDOR_LENGTH
const CORRIDOR_WIDTH  = 10;
const CORRIDOR_HEIGHT = 8;
const ART_SPACING     = 4.5; // meters between each artwork along Z
const ART_Y           = 2.4; // center height of artworks
const ART_MARGIN      = 0.2; // gap between wall and frame back

export const ARTWORK_POSITIONS = []; // populated below

export function buildGallery(scene) {
  _buildCorridor(scene);
  const frames = _placeArtworks(scene);
  _addLighting(scene);
  return frames;
}

function _buildCorridor(scene) {
  // ── Floor (wood planks) ──
  const floorTex = _makeFloorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, CORRIDOR_LENGTH / 4);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH),
    new THREE.MeshLambertMaterial({ map: floorTex })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -(CORRIDOR_LENGTH / 2));
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Ceiling ──
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0x2c2118 });
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH),
    ceilMat
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, CORRIDOR_HEIGHT, -(CORRIDOR_LENGTH / 2));
  scene.add(ceil);

  // ── Walls ──
  const wallColor = 0xe8e0d0;
  const wallMat   = new THREE.MeshLambertMaterial({ color: wallColor });
  const wallMatDark = new THREE.MeshLambertMaterial({ color: 0x9c8870 }); // dado rail zone

  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_LENGTH, CORRIDOR_HEIGHT),
    wallMat
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-CORRIDOR_WIDTH / 2, CORRIDOR_HEIGHT / 2, -(CORRIDOR_LENGTH / 2));
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_LENGTH, CORRIDOR_HEIGHT),
    wallMat
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(CORRIDOR_WIDTH / 2, CORRIDOR_HEIGHT / 2, -(CORRIDOR_LENGTH / 2));
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Back wall (far end)
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_HEIGHT),
    wallMat
  );
  backWall.position.set(0, CORRIDOR_HEIGHT / 2, -CORRIDOR_LENGTH);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Front wall (entry end)
  const frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_HEIGHT),
    wallMat
  );
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, CORRIDOR_HEIGHT / 2, 0.01);
  scene.add(frontWall);

  // Dado rail (lower trim) both sides
  _addDado(scene, wallMatDark);

  // Crown molding (top trim)
  _addCrown(scene);
}

function _addDado(scene, mat) {
  const dado = 0.9; // dado height
  const dadoGeo = new THREE.BoxGeometry(CORRIDOR_LENGTH, dado, 0.04);

  const left = new THREE.Mesh(dadoGeo, mat);
  left.position.set(-CORRIDOR_WIDTH / 2 + 0.02, dado / 2, -(CORRIDOR_LENGTH / 2));
  left.rotation.y = Math.PI / 2;
  scene.add(left);

  const right = new THREE.Mesh(dadoGeo, mat);
  right.position.set(CORRIDOR_WIDTH / 2 - 0.02, dado / 2, -(CORRIDOR_LENGTH / 2));
  right.rotation.y = -Math.PI / 2;
  scene.add(right);
}

function _addCrown(scene) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xd0c8b8 });
  const crownGeo = new THREE.BoxGeometry(CORRIDOR_LENGTH, 0.15, 0.12);

  [-CORRIDOR_WIDTH / 2 + 0.06, CORRIDOR_WIDTH / 2 - 0.06].forEach((x, i) => {
    const c = new THREE.Mesh(crownGeo, mat);
    c.position.set(x, CORRIDOR_HEIGHT - 0.075, -(CORRIDOR_LENGTH / 2));
    c.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(c);
  });
}

function _makeFloorTexture() {
  const W = 512, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // Base wood color
  const baseColors = ['#5c3d1e', '#6b4820', '#7a5525', '#6a4218'];

  // Draw planks (horizontal strips since floor is along Z)
  const plankW = W;
  const plankH = Math.floor(H / 8);
  for (let row = 0; row < 8; row++) {
    const bIdx = row % baseColors.length;
    ctx.fillStyle = baseColors[bIdx];
    ctx.fillRect(0, row * plankH, plankW, plankH);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 12; g++) {
      const gx = Math.random() * plankW;
      ctx.beginPath();
      ctx.moveTo(gx, row * plankH);
      ctx.bezierCurveTo(
        gx + Math.random() * 20 - 10, row * plankH + plankH * 0.3,
        gx + Math.random() * 20 - 10, row * plankH + plankH * 0.7,
        gx + Math.random() * 10 - 5,  (row + 1) * plankH
      );
      ctx.stroke();
    }

    // Plank gap
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, row * plankH, plankW, 2);
  }

  // Sheen overlay
  const sheen = ctx.createLinearGradient(0, 0, W, 0);
  sheen.addColorStop(0, 'rgba(255,240,200,0.06)');
  sheen.addColorStop(0.5, 'rgba(255,240,200,0.12)');
  sheen.addColorStop(1, 'rgba(255,240,200,0.06)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  return new THREE.CanvasTexture(cv);
}

function _placeArtworks(scene) {
  const frames = [];
  const total = ARTWORKS.length; // 16

  for (let i = 0; i < total; i++) {
    const art    = ARTWORKS[i];
    const side   = i % 2 === 0 ? 'left' : 'right'; // alternate sides
    const zIndex = Math.floor(i / 2);                // pair index
    const z      = -(2 + zIndex * ART_SPACING);      // start 2m in

    const x   = side === 'left' ? -CORRIDOR_WIDTH / 2 + ART_MARGIN : CORRIDOR_WIDTH / 2 - ART_MARGIN;
    const ry  = side === 'left' ? Math.PI / 2 : -Math.PI / 2;

    const frameGroup = _makeFrame(art, x, ART_Y, z, ry, i);
    scene.add(frameGroup);
    frames.push(frameGroup);

    ARTWORK_POSITIONS.push({ x, y: ART_Y, z, side, index: i });
  }

  return frames;
}

function _makeFrame(art, x, y, z, ry, index) {
  const FW = 1.6, FH = 2.1; // canvas size
  const BORDER = 0.05;       // frame border width
  const DEPTH  = 0.03;       // frame depth

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  group.userData = { artIndex: index, art };

  // Outer frame (dark gold)
  const outerMat = new THREE.MeshLambertMaterial({ color: 0xb8962e });
  const outerGeo = new THREE.BoxGeometry(FW + BORDER*2, FH + BORDER*2, DEPTH);
  const outerFrame = new THREE.Mesh(outerGeo, outerMat);
  outerFrame.castShadow = true;
  group.add(outerFrame);

  // Inner frame (cream liner)
  const linerMat = new THREE.MeshLambertMaterial({ color: 0xf0e8d8 });
  const linerGeo = new THREE.BoxGeometry(FW + BORDER*0.6, FH + BORDER*0.6, DEPTH + 0.002);
  const liner = new THREE.Mesh(linerGeo, linerMat);
  liner.position.z = 0.001;
  group.add(liner);

  // Artwork canvas
  const tex     = makeArtworkTexture(art);
  const artMat  = new THREE.MeshLambertMaterial({ map: tex });
  const artMesh = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), artMat);
  artMesh.position.z = DEPTH / 2 + 0.005;
  artMesh.userData  = { artIndex: index, art, isArtwork: true };
  group.add(artMesh);

  // Artwork number label (small plaque below frame)
  // (handled via DOM overlay based on proximity — see tour.js)

  return group;
}

function _addLighting(scene) {
  // Ambient: warm gallery light
  const ambient = new THREE.AmbientLight(0xfff5e8, 0.55);
  scene.add(ambient);

  // Hemisphere (warm ceiling / cool floor)
  const hemi = new THREE.HemisphereLight(0xfff5dc, 0x1a0f00, 0.35);
  scene.add(hemi);

  // Spotlights for each artwork
  for (let i = 0; i < ARTWORK_POSITIONS.length; i++) {
    const pos  = ARTWORK_POSITIONS[i];
    const side = pos.side;

    const spot = new THREE.SpotLight(0xfff5d0, 2.8, 7, Math.PI / 9, 0.5, 1.8);

    // Position spotlight on ceiling above and slightly in front
    const ceilX = side === 'left' ? -CORRIDOR_WIDTH / 2 + 1.5 : CORRIDOR_WIDTH / 2 - 1.5;
    spot.position.set(ceilX, CORRIDOR_HEIGHT - 0.2, pos.z);
    spot.castShadow = false; // performance

    // Target: center of artwork
    const target = new THREE.Object3D();
    target.position.set(pos.x, pos.y, pos.z);
    scene.add(target);
    spot.target = target;

    scene.add(spot);
  }

  // Subtle running lights along ceiling center
  for (let z = -3; z > -CORRIDOR_LENGTH + 2; z -= 6) {
    const pt = new THREE.PointLight(0xfff0d0, 0.4, 8);
    pt.position.set(0, CORRIDOR_HEIGHT - 0.3, z);
    scene.add(pt);
  }
}