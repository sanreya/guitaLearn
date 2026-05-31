/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Guitar pitch definitions (Standard EADGBE)
export const GUITAR_NOTES_FREQ = [
  { note: "E2", freq: 82.41 },
  { note: "A2", freq: 110.00 },
  { note: "D3", freq: 146.83 },
  { note: "G3", freq: 196.00 },
  { note: "B3", freq: 246.94 },
  { note: "E4", freq: 329.63 }
];

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function getNoteFromFrequency(frequency: number): { note: string; centsOff: number } {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  const roundedNoteNum = Math.round(noteNum);
  const centsOff = Math.round((noteNum - roundedNoteNum) * 100);
  
  let midiIndex = (roundedNoteNum + 69) % 12;
  if (midiIndex < 0) midiIndex += 12;
  const octave = Math.floor((roundedNoteNum + 69) / 12) - 1;
  
  return {
    note: `${NOTE_NAMES[midiIndex]}${octave}`,
    centsOff
  };
}

// Simple autocorrelation algorithm for real-time pitch detection
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  // Perform basic RMS magnitude threshold to ignore silence
  let size = buffer.length;
  let rms = 0;

  for (let i = 0; i < size; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.015) {
    return -1; // Not enough signal
  }

  // Find range boundaries for plausible human guitar range (~50Hz to ~1000Hz)
  let r1 = 0;
  let r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = size - 1; i >= size / 2; i--) {
    if (Math.abs(buffer[i]) < thres) {
      r2 = i;
      break;
    }
  }

  buffer = buffer.slice(r1, r2);
  size = buffer.length;

  const c = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;

  // Interp high precision peak offset
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

// Audio Engine Manager using singleton approach
class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private isProcessing = false;

  getAudioContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  async startMicrophone(): Promise<AnalyserNode> {
    const context = this.getAudioContext();
    if (this.analyser) {
      return this.analyser;
    }

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 2048;

      this.micSource = context.createMediaStreamSource(this.microphoneStream);
      this.micSource.connect(this.analyser);
      this.isProcessing = true;
      return this.analyser;
    } catch (err) {
      console.warn("Microphone access failed", err);
      throw err;
    }
  }

  stopMicrophone() {
    this.isProcessing = false;
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    this.analyser = null;
  }

  // Synthesize a gorgeous model vintage-style plucked guitar string note
  playGuitarPluck(frequency: number, type: 'physics' | 'clean' | 'warm' = 'clean') {
    try {
      const context = this.getAudioContext();
      const osc = context.createOscillator();
      const osc2 = context.createOscillator(); // second harmonic
      const gainNode = context.createGain();
      const filter = context.createBiquadFilter();

      filter.type = 'lowpass';
      // guitar filter rolls off high freqs
      filter.frequency.setValueAtTime(frequency * 5, context.currentTime);
      filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, context.currentTime + 0.6);

      if (type === 'physics') {
        osc.type = 'sawtooth';
        osc2.type = 'triangle';
      } else if (type === 'warm') {
        osc.type = 'sine';
        osc2.type = 'triangle';
      } else {
        osc.type = 'triangle';
        osc2.type = 'sine';
      }

      osc.frequency.value = frequency;
      osc2.frequency.value = frequency * 2; // Octave overtone for depth

      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.02); // quick pluck attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.9); // smooth decay

      osc.connect(filter);
      osc2.connect(filter);
      
      // Let the second oscillator fade slightly alternative
      const osc2Gain = context.createGain();
      osc2Gain.gain.setValueAtTime(0.12, context.currentTime);
      osc2Gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);

      filter.connect(gainNode);
      gainNode.connect(context.destination);

      osc.start();
      osc2.start();
      osc.stop(context.currentTime + 1.2);
      osc2.stop(context.currentTime + 1.2);
    } catch (e) {
      console.warn("Pluck synthesizer failed", e);
    }
  }

  // Play a simple retro guitar metronome woodblock sound
  playMetronomeTick(isStrongBeat = false) {
    try {
      const context = this.getAudioContext();
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isStrongBeat ? 880 : 440, context.currentTime);

      gain.gain.setValueAtTime(0.2, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start();
      osc.stop(context.currentTime + 0.08);
    } catch (e) {
      console.warn("Metronome tick failed", e);
    }
  }

  // Play a standard success chord pattern
  playSuccessSound() {
    try {
      const c = [261.63, 329.63, 392.00, 523.25]; // C chord notes
      c.forEach((freq, idx) => {
        setTimeout(() => {
          this.playGuitarPluck(freq, 'physics');
        }, idx * 120);
      });
    } catch {}
  }

  // Play a fail interval chord pattern
  playFailSound() {
    try {
      this.playGuitarPluck(220, 'warm');
      setTimeout(() => {
        this.playGuitarPluck(207.65, 'warm'); // dissonant lower pitch
      }, 150);
    } catch {}
  }
}

export const audioEngine = new AudioEngine();
