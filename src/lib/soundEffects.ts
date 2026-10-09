/**
 * CognitiveSaathi Central Web Audio Synthesizer
 * Provides cute, interactive, zero-latency procedural sound effects.
 * Uses browser Web Audio API exclusively so no external audio files ever fail to load or throw runtime errors.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;

  /**
   * Lazily obtain and resume the Web Audio Context.
   * Handles autoplay restrictions gracefully by checking/resuming on user gesture.
   */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Sweet, cheerful high-pitch bubble pop glide
   * Sine wave gliding from 420Hz to 880Hz over 80ms duration.
   * Perfect for tile flips, instrument taps, and button clicks.
   */
  playPop(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.085);
    } catch (e) {
      // Audio errors are purely non-blocking
    }
  }

  /**
   * Warm 3-tone arpeggio chime (C5-E5-G5, triangle wave, 250ms total)
   * Plays when a correct pair or pattern match is found.
   */
  playMatch(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.06 }, // E5
        { freq: 783.99, time: 0.12 }, // G5
      ];

      notes.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.12, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + 0.19);
      });
    } catch (e) {
      // Non-blocking
    }
  }

  /**
   * Joyful 4-note celebratory fanfare (C5-E5-G5-C6, 400ms duration)
   * Triggers when an entire activity or game board is completed.
   */
  playVictory(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const fanfare = [
        { freq: 523.25, time: 0, dur: 0.14 },    // C5
        { freq: 659.25, time: 0.08, dur: 0.14 }, // E5
        { freq: 783.99, time: 0.16, dur: 0.16 }, // G5
        { freq: 1046.50, time: 0.24, dur: 0.24 }, // C6
      ];

      fanfare.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.15, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.01);
      });
    } catch (e) {
      // Non-blocking
    }
  }

  /**
   * Soft, low reassuring descending chime (400Hz down to 280Hz over 280ms)
   * Non-punitive, warm tone for unmatched tile attempts or gentle retries.
   */
  playGentleRetry(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.28);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.285);
    } catch (e) {
      // Non-blocking
    }
  }

  /**
   * Instrument or musical tone generator for rhythmic games (e.g. Dhol, Pepa, Taal)
   */
  playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.2): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch (e) {
      // Non-blocking
    }
  }
}

export const sounds = new SoundEffectsManager();
export const SoundEffects = sounds;
