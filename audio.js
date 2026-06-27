export class AmbientAudio {
  constructor() {
    this.ctx      = null;
    this.master   = null;
    this.reverb   = null;
    this.playing  = false;
    this.nodes    = [];
    this._schedID = null;
  }

  async init() {
    if (this.ctx) {
      // resume ถ้า browser suspend ไว้
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // resume ทันทีหลังสร้าง (บาง browser suspend auto)
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    this.reverb = await this._makeReverb(2.5);
    this.reverb.connect(this.master);
  }

  async start() {
    await this.init();
    if (this.playing) return;
    this.playing = true;

    // fade in เร็วขึ้น ดังขึ้น
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 2);

    this._startDrone();
    this._scheduleMelody();
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearTimeout(this._schedID);

    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);

    setTimeout(() => {
      this.nodes.forEach(n => { try { n.stop(); } catch(e){} });
      this.nodes = [];
    }, 2000);
  }

  async toggle() {
    if (this.playing) {
      this.stop();
    } else {
      await this.start();
    }
  }

  _startDrone() {
    // drone pad — เพิ่ม gain ให้ดังขึ้น
    const freqs = [55, 82.4, 110, 164.8];
    freqs.forEach(freq => {
      const osc     = this.ctx.createOscillator();
      const gain    = this.ctx.createGain();
      const lfo     = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      osc.type            = 'sine';
      osc.frequency.value = freq;
      lfo.frequency.value = 0.04 + Math.random() * 0.06;
      lfoGain.gain.value  = 4;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start();

      gain.gain.value = 0.22; // เพิ่มจาก 0.06 → 0.22
      osc.connect(gain);
      gain.connect(this.reverb);
      osc.start();
      this.nodes.push(osc, lfo);
    });

    // noise layer
    const bufSize = this.ctx.sampleRate * 2;
    const buf     = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.04;

    const noise  = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop   = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 600;

    noise.connect(filter);
    filter.connect(this.reverb);
    noise.start();
    this.nodes.push(noise);
  }

  _scheduleMelody() {
    if (!this.playing) return;

    const scale = [220, 261.6, 293.7, 349.2, 392, 440, 523.3, 587.3];
    const note  = scale[Math.floor(Math.random() * scale.length)];
    const dur   = 2.5 + Math.random() * 3;

    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type            = 'triangle';
    osc.frequency.value = note;

    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.5); // เพิ่มจาก 0.09 → 0.18
    gain.gain.linearRampToValueAtTime(0.12, t + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(gain);
    gain.connect(this.reverb);
    osc.start(t);
    osc.stop(t + dur);
    this.nodes.push(osc);

    const nextDelay = (1 + Math.random() * 3) * 1000;
    this._schedID = setTimeout(() => this._scheduleMelody(), nextDelay);
  }

  async _makeReverb(duration) {
    const sr    = this.ctx.sampleRate;
    const len   = sr * duration;
    const buf   = this.ctx.createBuffer(2, len, sr);
    const decay = 4.0;

    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }

    const conv = this.ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }
}