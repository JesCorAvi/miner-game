import * as THREE from 'three';

type ToneType = OscillatorType;

const MIN_GAIN = 0.0001;

export type WeaponSound = 'pickaxe' | 'tesla' | 'drill' | 'shotgun' | 'grenade';

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private ready = false;
  private jetpackGain: GainNode | null = null;
  private drillGain: GainNode | null = null;
  private readonly forward = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private lastFootstepAt = 0;
  private pickupWindowStart = 0;
  private pickupCombo = 0;
  private saturationCurve: Float32Array<ArrayBuffer> | null = null;

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.context || !this.master) {
      return;
    }
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.64, now, 0.04);
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  async init(): Promise<void> {
    if (this.context) {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return;
    }
    try {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = this.muted ? 0 : 0.64;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 22;
      compressor.ratio.value = 4.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;
      master.connect(compressor);
      compressor.connect(context.destination);
      this.context = context;
      this.master = master;
      this.noiseBuffer = this.buildNoiseBuffer(context);
      this.buildAmbient(context, master);
      this.buildLoops(context, master);
      if (context.state === 'suspended') {
        await context.resume();
      }
      this.ready = true;
    } catch {
      this.context = null;
      this.master = null;
      this.ready = false;
    }
  }

  async resume(): Promise<void> {
    if (!this.context) {
      await this.init();
      return;
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  private buildNoiseBuffer(context: AudioContext): AudioBuffer {
    const length = Math.floor(context.sampleRate * 2.2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.84 + white * 0.16;
      data[index] = last;
    }
    return buffer;
  }

  private buildAmbient(context: AudioContext, destination: AudioNode): void {
    const ambient = context.createGain();
    ambient.gain.value = 0.032;
    ambient.connect(destination);

    const low = context.createOscillator();
    low.type = 'sine';
    low.frequency.value = 41;
    const lowGain = context.createGain();
    lowGain.gain.value = 0.22;
    low.connect(lowGain);
    lowGain.connect(ambient);
    low.start();

    const harmonic = context.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.value = 67;
    const harmonicGain = context.createGain();
    harmonicGain.gain.value = 0.045;
    harmonic.connect(harmonicGain);
    harmonicGain.connect(ambient);
    harmonic.start();

    if (this.noiseBuffer) {
      const noise = context.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 155;
      filter.Q.value = 0.7;
      const gain = context.createGain();
      gain.gain.value = 0.24;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ambient);
      noise.start();

      const wind = context.createBufferSource();
      wind.buffer = this.noiseBuffer;
      wind.loop = true;
      wind.playbackRate.value = 0.42;
      const windFilter = context.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 310;
      windFilter.Q.value = 0.6;
      const windGain = context.createGain();
      windGain.gain.value = 0.045;
      wind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ambient);
      wind.start();
    }
  }

  private buildLoops(context: AudioContext, destination: AudioNode): void {
    if (!this.noiseBuffer) {
      return;
    }
    const jetpack = context.createGain();
    jetpack.gain.value = 0;
    jetpack.connect(destination);
    const jetNoise = context.createBufferSource();
    jetNoise.buffer = this.noiseBuffer;
    jetNoise.loop = true;
    jetNoise.playbackRate.value = 1.6;
    const jetFilter = context.createBiquadFilter();
    jetFilter.type = 'bandpass';
    jetFilter.frequency.value = 820;
    jetFilter.Q.value = 0.7;
    const jetTone = context.createOscillator();
    jetTone.type = 'sawtooth';
    jetTone.frequency.value = 73;
    const jetToneGain = context.createGain();
    jetToneGain.gain.value = 0.16;
    jetNoise.connect(jetFilter);
    jetFilter.connect(jetpack);
    jetTone.connect(jetToneGain);
    jetToneGain.connect(jetpack);
    jetNoise.start();
    jetTone.start();
    this.jetpackGain = jetpack;

    const drill = context.createGain();
    drill.gain.value = 0;
    drill.connect(destination);
    const drillNoise = context.createBufferSource();
    drillNoise.buffer = this.noiseBuffer;
    drillNoise.loop = true;
    drillNoise.playbackRate.value = 2.8;
    const drillFilter = context.createBiquadFilter();
    drillFilter.type = 'bandpass';
    drillFilter.frequency.value = 1650;
    drillFilter.Q.value = 1.8;
    const motor = context.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.value = 128;
    const motorGain = context.createGain();
    motorGain.gain.value = 0.16;
    const drillNoiseGain = context.createGain();
    drillNoiseGain.gain.value = 0.32;
    drillNoise.connect(drillFilter);
    drillFilter.connect(drillNoiseGain);
    drillNoiseGain.connect(drill);
    motor.connect(motorGain);
    motorGain.connect(drill);
    drillNoise.start();
    motor.start();
    this.drillGain = drill;
  }

  setJetpackActive(active: boolean): void {
    if (!this.context || !this.jetpackGain) {
      return;
    }
    const now = this.context.currentTime;
    this.jetpackGain.gain.cancelScheduledValues(now);
    this.jetpackGain.gain.setTargetAtTime(active ? 0.18 : 0, now, 0.07);
  }

  setDrillActive(active: boolean): void {
    if (!this.context || !this.drillGain) {
      return;
    }
    const now = this.context.currentTime;
    this.drillGain.gain.cancelScheduledValues(now);
    this.drillGain.gain.setTargetAtTime(active ? 0.11 : 0, now, 0.04);
  }

  updateListener(camera: THREE.PerspectiveCamera): void {
    if (!this.context) {
      return;
    }
    const listener = this.context.listener;
    const position = camera.position;
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(position.x, this.context.currentTime, 0.02);
      listener.positionY.setTargetAtTime(position.y, this.context.currentTime, 0.02);
      listener.positionZ.setTargetAtTime(position.z, this.context.currentTime, 0.02);
    } else {
      listener.setPosition(position.x, position.y, position.z);
    }
    camera.getWorldDirection(this.forward);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (listener.forwardX) {
      listener.forwardX.setTargetAtTime(this.forward.x, this.context.currentTime, 0.02);
      listener.forwardY.setTargetAtTime(this.forward.y, this.context.currentTime, 0.02);
      listener.forwardZ.setTargetAtTime(this.forward.z, this.context.currentTime, 0.02);
      listener.upX.setTargetAtTime(this.up.x, this.context.currentTime, 0.02);
      listener.upY.setTargetAtTime(this.up.y, this.context.currentTime, 0.02);
      listener.upZ.setTargetAtTime(this.up.z, this.context.currentTime, 0.02);
    } else {
      listener.setOrientation(this.forward.x, this.forward.y, this.forward.z, this.up.x, this.up.y, this.up.z);
    }
  }

  private panner(position: THREE.Vector3): PannerNode | null {
    if (!this.context) {
      return null;
    }
    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.2;
    panner.maxDistance = 75;
    panner.rolloffFactor = 1.25;
    panner.coneInnerAngle = 360;
    if (panner.positionX) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    } else {
      panner.setPosition(position.x, position.y, position.z);
    }
    panner.connect(this.master as AudioNode);
    return panner;
  }

  private noise(
    position: THREE.Vector3 | null,
    filterType: BiquadFilterType,
    frequency: number,
    duration: number,
    gainValue: number,
    delay = 0,
    q = 1,
    pitch = 1,
  ): void {
    const context = this.ready ? this.context : null;
    if (!context || !this.master || !this.noiseBuffer) {
      return;
    }
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = Math.max(0.5, pitch);
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = context.createGain();
    const destination = position ? this.panner(position) : this.master;
    if (!destination) {
      return;
    }
    const start = context.currentTime + delay;
    gain.gain.setValueAtTime(MIN_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, gainValue), start + 0.005);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start, Math.random() * 1.2, duration + 0.03);
    source.stop(start + duration + 0.04);
    if (destination !== this.master) {
      source.onended = () => {
        destination.disconnect();
      };
    }
  }

  private tone(
    position: THREE.Vector3 | null,
    type: ToneType,
    frequency: number,
    duration: number,
    gainValue: number,
    delay = 0,
    endFrequency?: number,
    pitch = 1,
  ): void {
    const context = this.ready ? this.context : null;
    if (!context || !this.master) {
      return;
    }
    const oscillator = context.createOscillator();
    oscillator.type = type;
    const detune = THREE.MathUtils.clamp(1200 * Math.log2(pitch), -1200, 1200);
    oscillator.detune.value = detune;
    const start = context.currentTime + delay;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    }
    const gain = context.createGain();
    gain.gain.setValueAtTime(MIN_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, gainValue), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration);
    const destination = position ? this.panner(position) : this.master;
    if (!destination) {
      return;
    }
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
    if (destination !== this.master) {
      oscillator.onended = () => destination.disconnect();
    }
  }

  private getSaturationCurve(): Float32Array<ArrayBuffer> {
    if (!this.saturationCurve) {
      const samples = 1024;
      const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
      const drive = 2.6;
      const normalizer = Math.tanh(drive);
      for (let index = 0; index < samples; index += 1) {
        const x = (index / (samples - 1)) * 2 - 1;
        curve[index] = Math.tanh(x * drive) / normalizer;
      }
      this.saturationCurve = curve;
    }
    return this.saturationCurve;
  }

  private crunchNoise(
    position: THREE.Vector3,
    frequency: number,
    q: number,
    duration: number,
    gainValue: number,
    delay: number,
    pitch: number,
  ): void {
    const context = this.ready ? this.context : null;
    if (!context || !this.master || !this.noiseBuffer) {
      return;
    }
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = Math.max(0.5, pitch);
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const shaper = context.createWaveShaper();
    shaper.curve = this.getSaturationCurve();
    shaper.oversample = '2x';
    const gain = context.createGain();
    const destination = position ? this.panner(position) : this.master;
    if (!destination) {
      return;
    }
    const start = context.currentTime + delay;
    gain.gain.setValueAtTime(MIN_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, gainValue), start + 0.003);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration);
    source.connect(filter);
    filter.connect(shaper);
    shaper.connect(gain);
    gain.connect(destination);
    source.start(start, Math.random() * 1.2, duration + 0.03);
    source.stop(start + duration + 0.04);
    if (destination !== this.master) {
      source.onended = () => destination.disconnect();
    }
  }

  private clink(
    position: THREE.Vector3,
    firstFrequency: number,
    secondFrequency: number,
    duration: number,
    gainValue: number,
    pitch: number,
  ): void {
    const context = this.ready ? this.context : null;
    if (!context || !this.master) {
      return;
    }
    const destination = position ? this.panner(position) : this.master;
    if (!destination) {
      return;
    }
    const start = context.currentTime;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1500;
    highpass.Q.value = 0.7;
    const triangle = context.createOscillator();
    triangle.type = 'triangle';
    triangle.frequency.value = firstFrequency * pitch;
    const square = context.createOscillator();
    square.type = 'square';
    square.frequency.value = secondFrequency * pitch;
    const triangleGain = context.createGain();
    triangleGain.gain.value = gainValue;
    const squareGain = context.createGain();
    squareGain.gain.value = gainValue * 0.42;
    const output = context.createGain();
    output.gain.setValueAtTime(MIN_GAIN, start);
    output.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, gainValue * 1.35), start + 0.001);
    output.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration);
    triangle.connect(triangleGain);
    square.connect(squareGain);
    triangleGain.connect(highpass);
    squareGain.connect(highpass);
    highpass.connect(output);
    output.connect(destination);
    triangle.start(start);
    square.start(start);
    triangle.stop(start + duration + 0.01);
    square.stop(start + duration + 0.01);
    if (destination !== this.master) {
      square.onended = () => destination.disconnect();
    }
  }

  private thud(
    position: THREE.Vector3,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    gainValue: number,
    pitch: number,
  ): void {
    const context = this.ready ? this.context : null;
    if (!context || !this.master) {
      return;
    }
    const destination = position ? this.panner(position) : this.master;
    if (!destination) {
      return;
    }
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(startFrequency * pitch, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency * pitch),
      start + duration,
    );
    const gain = context.createGain();
    gain.gain.setValueAtTime(MIN_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, gainValue), start + 0.002);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration + 0.02);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
    if (destination !== this.master) {
      oscillator.onended = () => destination.disconnect();
    }
  }

  playPickaxe(position: THREE.Vector3, layer: number, hasNode: boolean, isOre = false): void {
    const pitch = 0.88 + Math.random() * 0.24;
    const layerIndex = Math.max(1, Math.min(4, layer));
    const crunchFrequency = isOre
      ? 1200 + layerIndex * 60
      : 900 + layerIndex * 150;
    const crunchGain = isOre ? 0.2 : hasNode ? 0.185 : 0.16;
    this.crunchNoise(position, crunchFrequency, 1.8, 0.06, crunchGain, 0, pitch);
    this.crunchNoise(position, crunchFrequency * 0.82, 1.8, 0.09, crunchGain * 0.82, 0.025, pitch);
    this.clink(
      position,
      isOre ? 2600 : 1950,
      isOre ? 4100 : 3120,
      0.04,
      isOre ? 0.17 : 0.12,
      pitch,
    );
    this.thud(position, 150, 42, 0.065, isOre ? 0.13 : 0.15, pitch);
  }

  playNodeBreak(position: THREE.Vector3, isOre: boolean): void {
    this.noise(position, 'lowpass', isOre ? 1900 : 850, 0.42, 0.22);
    this.noise(position, 'highpass', isOre ? 3400 : 2300, 0.22, 0.12, 0.02);
    this.tone(position, 'triangle', isOre ? 420 : 140, 0.32, 0.1, 0, isOre ? 130 : 42);
    if (isOre) {
      this.tone(position, 'sine', 820, 0.28, 0.045, 0.05, 1350);
      this.tone(position, 'sine', 1230, 0.24, 0.028, 0.12, 870);
    }
  }

  playShot(position: THREE.Vector3, weapon: WeaponSound): void {
    switch (weapon) {
      case 'shotgun':
        this.noise(position, 'lowpass', 900, 0.28, 0.35);
        this.noise(position, 'highpass', 1900, 0.12, 0.18, 0.01);
        this.tone(position, 'sawtooth', 96, 0.24, 0.11, 0, 42);
        break;
      case 'tesla':
        this.noise(position, 'highpass', 3100, 0.2, 0.12);
        this.tone(position, 'square', 740, 0.18, 0.04, 0, 170);
        this.tone(position, 'square', 1320, 0.17, 0.025, 0.06, 340);
        break;
      case 'grenade':
        this.noise(position, 'lowpass', 420, 0.2, 0.2);
        this.tone(position, 'triangle', 64, 0.22, 0.12, 0, 30);
        break;
      case 'drill':
        this.noise(position, 'bandpass', 1500, 0.06, 0.06, 0, 1.4);
        break;
      case 'pickaxe':
        this.playPickaxe(position, 1, false);
        break;
    }
  }

  playExplosion(position: THREE.Vector3, radius: number): void {
    const strength = Math.min(1.5, radius / 3);
    this.noise(position, 'lowpass', 600, 0.85, 0.4 * strength);
    this.noise(position, 'bandpass', 1200, 0.3, 0.22, 0.02, 0.9);
    this.tone(position, 'sawtooth', 72, 0.8, 0.16 * strength, 0, 28);
    this.tone(position, 'sine', 45, 0.9, 0.12, 0.035, 22);
  }

  playDeposit(position: THREE.Vector3, fromStaff = false): void {
    const gain = fromStaff ? 0.12 : 0.24;
    this.noise(position, 'lowpass', 420, 0.55, gain);
    this.noise(position, 'bandpass', 2200, 0.22, gain * 0.55, 0.08, 1.4);
    this.tone(position, 'triangle', 92, 0.48, gain * 0.7, 0, 48);
    this.tone(position, 'sine', 420, 0.3, gain * 0.3, 0.18, 740);
    this.tone(position, 'sine', 665, 0.35, gain * 0.22, 0.28, 880);
  }

  playLadder(position: THREE.Vector3): void {
    this.noise(position, 'bandpass', 1050, 0.13, 0.13, 0, 1.4);
    this.tone(position, 'triangle', 185, 0.16, 0.045, 0, 105);
    this.tone(position, 'square', 520, 0.08, 0.014, 0.02, 390);
  }

  playUnload(position: THREE.Vector3): void {
    this.noise(position, 'bandpass', 1700, 0.16, 0.1, 0, 1.3);
    this.tone(position, 'sine', 820, 0.18, 0.03, 0, 220);
    this.tone(position, 'triangle', 520, 0.22, 0.025, 0.045, 140);
  }

  playPickup(position: THREE.Vector3, index: number): void {
    const now = performance.now();
    if (now - this.pickupWindowStart > 220) {
      this.pickupWindowStart = now;
      this.pickupCombo = 0;
    }
    const combo = this.pickupCombo;
    this.pickupCombo += 1;
    const delay = Math.min(0.2, combo * 0.019);
    const base = Math.min(
      1400,
      600 + Math.min(9, combo) * 85 + (index % 4) * 12 + Math.random() * 18,
    );
    this.tone(position, 'sine', base, 0.07, 0.032, delay, base * 1.12);
    this.tone(position, 'triangle', base * 1.5, 0.05, 0.015, delay + 0.006, base * 1.65);
    this.noise(position, 'highpass', 2800, 0.018, 0.012, delay, 0.9, 1);
  }

  playChest(position: THREE.Vector3): void {
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      this.tone(position, 'triangle', frequency, 0.35, 0.04, index * 0.08);
    });
    this.noise(position, 'bandpass', 2800, 0.4, 0.06, 0.15, 2);
  }

  playFootstep(position: THREE.Vector3, running: boolean, layer: number): void {
    const now = performance.now();
    if (now - this.lastFootstepAt < 100) {
      return;
    }
    this.lastFootstepAt = now;
    this.noise(position, 'lowpass', 360 + layer * 30, running ? 0.07 : 0.095, running ? 0.035 : 0.022);
    this.tone(position, 'sine', 67 - layer * 2, 0.08, 0.012, 0, 42);
  }

  playError(): void {
    this.tone(null, 'sawtooth', 150, 0.2, 0.04, 0, 90);
    this.tone(null, 'square', 105, 0.18, 0.02, 0.05, 75);
  }

  playUi(): void {
    this.tone(null, 'square', 720, 0.035, 0.02, 0, 580);
  }

  playPurchase(): void {
    this.tone(null, 'triangle', 392, 0.12, 0.045);
    this.tone(null, 'triangle', 523.25, 0.14, 0.045, 0.09);
    this.tone(null, 'sine', 783.99, 0.18, 0.04, 0.19);
  }

  playQuotaWarning(): void {
    this.tone(null, 'triangle', 392, 0.16, 0.05);
    this.tone(null, 'triangle', 311.13, 0.22, 0.045, 0.21);
  }

  playDayComplete(success: boolean): void {
    if (success) {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.tone(null, 'sine', frequency, 0.42, 0.05, index * 0.11);
      });
      this.tone(null, 'triangle', 1567.98, 0.6, 0.025, 0.5);
    } else {
      this.noise(null, 'lowpass', 720, 0.65, 0.18);
      this.tone(null, 'sawtooth', 146.83, 0.9, 0.06, 0, 55);
      this.tone(null, 'triangle', 98, 1.15, 0.05, 0.22, 33);
    }
  }

  playVictory(): void {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, index) => {
      this.tone(null, 'sine', frequency, 0.55, 0.05, index * 0.13);
      this.tone(null, 'triangle', frequency * 0.5, 0.45, 0.025, index * 0.13);
    });
  }

  playDisconnect(): void {
    this.tone(null, 'square', 320, 0.16, 0.03, 0, 180);
    this.tone(null, 'square', 190, 0.24, 0.025, 0.18, 90);
  }

  dispose(): void {
    this.ready = false;
    this.jetpackGain = null;
    this.drillGain = null;
    this.master = null;
    this.noiseBuffer = null;
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}
