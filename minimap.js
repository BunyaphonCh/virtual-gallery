import { ARTWORK_POSITIONS } from './gallery.js';

const PAD        = 10;
const DOT_R      = 3;
const PLAYER_R   = 5;
const CONE_LEN   = 16;
const CONE_ANGLE = Math.PI / 4;

// Colours
const C_BG       = 'rgba(8,6,4,0.85)';
const C_WALL     = '#5a4a38';
const C_FLOOR    = '#2a1e14';
const C_DOT      = '#4caf7d';
const C_DOT_NEAR = '#a0ffcc';
const C_PLAYER   = '#ffffff';
const C_CONE     = 'rgba(255,245,200,0.18)';
const C_BORDER   = 'rgba(255,245,220,0.15)';

export class Minimap {
  constructor(camera) {
    this.camera  = camera;
    this.canvas  = document.getElementById('minimap');
    this.ctx     = this.canvas.getContext('2d');
    this.W       = this.canvas.width  = 120;
    this.H       = this.canvas.height = 180;

    // Corridor world bounds (from gallery.js)
    this.worldZ0 = 0;
    this.worldZ1 = -44;
    this.worldX0 = -5;
    this.worldX1 =  5;
  }

  // Convert world (x,z) → minimap pixel (px, py)
  _wp(worldX, worldZ) {
    const px = PAD + (worldX - this.worldX0) / (this.worldX1 - this.worldX0) * (this.W - PAD*2);
    const py = PAD + (worldZ - this.worldZ0) / (this.worldZ1 - this.worldZ0) * (this.H - PAD*2);
    return [px, py];
  }

  draw(nearestIndex) {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = C_BG;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 6);
    ctx.fill();

    // Corridor floor
    const [fx0, fy0] = this._wp(-5, 0);
    const [fx1, fy1] = this._wp(5, -80);
    ctx.fillStyle = C_FLOOR;
    ctx.fillRect(fx0, fy0, fx1-fx0, fy1-fy0);

    // Walls (left and right lines)
    ctx.strokeStyle = C_WALL;
    ctx.lineWidth = 2;
    const [lx, ly0] = this._wp(-5, 0);
    const [, ly1]   = this._wp(-5, -80);
    ctx.beginPath(); ctx.moveTo(lx, ly0); ctx.lineTo(lx, ly1); ctx.stroke();
    const [rx] = this._wp(5, 0);
    ctx.beginPath(); ctx.moveTo(rx, ly0); ctx.lineTo(rx, ly1); ctx.stroke();

    // Artwork dots
    ARTWORK_POSITIONS.forEach((pos, i) => {
      const [dx, dy] = this._wp(pos.x, pos.z);
      const isNear   = i === nearestIndex;
      ctx.beginPath();
      ctx.arc(dx, dy, isNear ? DOT_R + 1 : DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = isNear ? C_DOT_NEAR : C_DOT;
      ctx.fill();
    });

    // Player FOV cone
    const camPos   = this.camera.position;
    const [cx, cy] = this._wp(camPos.x, camPos.z);

    // Get camera yaw from quaternion
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const yaw = Math.atan2(dir.x, dir.z);

    // Draw cone
    const coneLeft  = yaw - CONE_ANGLE / 2;
    const coneRight = yaw + CONE_ANGLE / 2;
    const [tx0, ty0] = this._wp(
      camPos.x + Math.sin(coneLeft)  * (CONE_LEN / 8),
      camPos.z + Math.cos(coneLeft)  * (CONE_LEN / 8)
    );
    const [tx1, ty1] = this._wp(
      camPos.x + Math.sin(coneRight) * (CONE_LEN / 8),
      camPos.z + Math.cos(coneRight) * (CONE_LEN / 8)
    );
    ctx.fillStyle = C_CONE;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tx0, ty0);
    ctx.lineTo(tx1, ty1);
    ctx.closePath();
    ctx.fill();

    // Player dot
    ctx.fillStyle = C_PLAYER;
    ctx.beginPath();
    ctx.arc(cx, cy, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = C_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, W-1, H-1, 6);
    ctx.stroke();
  }
}