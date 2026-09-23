export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private activeNodes: Set<AudioScheduledSourceNode> = new Set();
  private enabled: boolean = true;
  private lastFootstepTime: number = 0;
  
  private constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
      this.enabled = false;
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
  
  public resumeContext(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public stopAll(): void {
    this.activeNodes.forEach(node => {
      try {
        node.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    this.activeNodes.clear();
  }

  private playTone(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1, rampDown: boolean = true): void {
    if (!this.enabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    if (rampDown) {
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    }

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
    
    this.activeNodes.add(osc);
    osc.onended = () => {
      this.activeNodes.delete(osc);
      gainNode.disconnect();
    };
  }

  // --- 1. Player Audio ---
  public playFootstep(type: 'walk' | 'sprint' | 'crouch'): void {
    if (!this.enabled || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    let interval = 0.4;
    let freq = 120;
    let vol = 0.05;
    let dur = 0.05;

    if (type === 'sprint') {
      interval = 0.25;
      freq = 150;
      vol = 0.08;
    } else if (type === 'crouch') {
      interval = 0.6;
      freq = 90;
      vol = 0.02;
    }

    if (now - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = now;

    // A low thud for footstep
    this.playTone(freq, 'sine', dur, vol, true);
  }

  // --- 2. Interaction Audio ---
  public playInteraction(type: 'door' | 'vault' | 'collect' | 'escape' | 'denied'): void {
    if (!this.enabled || !this.ctx) return;

    switch (type) {
      case 'door':
        this.playTone(400, 'square', 0.1, 0.05, true);
        break;
      case 'denied':
        this.playTone(150, 'sawtooth', 0.2, 0.1, false);
        break;
      case 'vault':
        this.playTone(300, 'sine', 0.5, 0.1, false);
        break;
      case 'collect':
        // Double blip for collect
        this.playTone(800, 'square', 0.1, 0.05, true);
        setTimeout(() => this.playTone(1200, 'square', 0.1, 0.05, true), 100);
        break;
      case 'escape':
        this.playTone(600, 'triangle', 0.3, 0.08, true);
        break;
    }
  }

  // --- 3. Security Audio ---
  public playSecurityAlarm(level: 'suspicious' | 'alert' | 'critical' | 'failed'): void {
    if (!this.enabled || !this.ctx) return;

    switch (level) {
      case 'suspicious':
        this.playTone(500, 'sine', 0.2, 0.05, true);
        break;
      case 'alert':
        this.playTone(700, 'square', 0.3, 0.1, true);
        break;
      case 'critical':
        this.playTone(900, 'sawtooth', 0.4, 0.15, true);
        break;
      case 'failed':
        // Long descending bass drop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
        this.activeNodes.add(osc);
        osc.onended = () => { this.activeNodes.delete(osc); gain.disconnect(); };
        break;
    }
  }

  // --- 4. CCTV Audio ---
  public playCCTVWarning(): void {
    this.playTone(1000, 'square', 0.1, 0.05, true);
  }

  // --- 5. Guard Audio ---
  public playGuardState(state: string): void {
    if (!this.enabled || !this.ctx) return;

    // 'PATROL' = 0, 'SUSPICIOUS' = 1, 'INVESTIGATE' = 2, 'ALERT' = 3, 'CHASE' = 4, 'RETURN' = 5
    if (state === 'SUSPICIOUS') {
      this.playTone(350, 'sine', 0.1, 0.05, true);
    } else if (state === 'INVESTIGATE') {
      this.playTone(350, 'triangle', 0.15, 0.05, true);
    } else if (state === 'ALERT') {
      this.playTone(450, 'square', 0.2, 0.08, true);
    } else if (state === 'CHASE') {
      this.playTone(550, 'sawtooth', 0.25, 0.1, true);
    }
  }

  // --- 6. Victory Audio ---
  public playVictory(): void {
    if (!this.enabled || !this.ctx) return;
    
    // A rising arpeggio
    const notes = [440, 554, 659, 880];
    let timeOffset = 0;
    for (const freq of notes) {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.4, 0.1, true);
      }, timeOffset * 1000);
      timeOffset += 0.15;
    }
  }
}

export const audioManager = AudioManager.getInstance();
