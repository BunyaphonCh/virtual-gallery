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
    if (this.ctx) return;
    this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    // Convolution reverb (synthesized IR)
    this.reverb = await this._makeReverb(3.5);
    this.reverb.connect(this.master);
  }

  async start() {
    await this.init();
    if (this.playing) return;
    this.playing = true;

    // Fade in
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 3);

    this._startDrone();
    this._scheduleMelody();
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearTimeout(this._schedID);

    // Fade out
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);

    setTimeout(() => {
      this.nodes.forEach(n => { try { n.stop(); } catch(e){} });
      this.nodes = [];
    }, 2500);
  }

  toggle() { this.playing ? this.stop() : this.start(); }

  // ── Private ───────────────────────────────────────────────

  _startDrone() {
    // Two slow detuned oscillators create a warm pad
    const freqs = [55, 82.4, 110, 164.8]; // A1 E2 A2 E3
    freqs.forEach(freq => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Slow detune wobble
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start();

      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(this.reverb);
      osc.start();
      this.nodes.push(osc, lfo);
    });

    // Soft noise for air texture
    const bufSize = this.ctx.sampleRate * 2;
    const buf     = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.015;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop   = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type      = 'lowpass';
    filter.frequency.value = 400;

    noise.connect(filter);
    filter.connect(this.reverb);
    noise.start();
    this.nodes.push(noise);
  }

  _scheduleMelody() {
    if (!this.playing) return;

    // Pentatonic minor scale in A (gallery-appropriate mood)
    const scale = [220, 261.6, 293.7, 349.2, 392, 440, 523.3, 587.3];
    const note  = scale[Math.floor(Math.random() * scale.length)];
    const dur   = 2 + Math.random() * 4;

    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = note;

    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.09, t + 0.4);
    gain.gain.linearRampToValueAtTime(0.06, t + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(gain);
    gain.connect(this.reverb);
    osc.start(t);
    osc.stop(t + dur);
    this.nodes.push(osc);

    const nextDelay = (1.5 + Math.random() * 4) * 1000;
    this._schedID = setTimeout(() => this._scheduleMelody(), nextDelay);
  }

  async _makeReverb(duration) {
    const sr    = this.ctx.sampleRate;
    const len   = sr * duration;
    const buf   = this.ctx.createBuffer(2, len, sr);
    const decay = 5.0;

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