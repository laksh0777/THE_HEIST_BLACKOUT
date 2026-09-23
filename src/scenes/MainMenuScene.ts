import Phaser from 'phaser';
import { SCENES, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../core/Constants';
import { MenuButton } from '../ui/MenuButton';

// ──────────────────────────────────────────────────────────────
// Particle data type
// ──────────────────────────────────────────────────────────────
interface Particle {
  x:     number;
  y:     number;
  vx:    number;
  vy:    number;
  alpha: number;
  size:  number;
  life:  number;
  maxLife: number;
}

// ──────────────────────────────────────────────────────────────
// CCTV sweep light
// ──────────────────────────────────────────────────────────────
interface CCTVLight {
  x:        number;
  y:        number;
  angle:    number;
  speed:    number;   // deg/s
  range:    number;
  halfFov:  number;   // degrees
  minAngle: number;
  maxAngle: number;
  dir:      1 | -1;
}

export class MainMenuScene extends Phaser.Scene {
  // ── layers ─────────────────────────────────────────────────
  private bgGfx!:       Phaser.GameObjects.Graphics;
  private facilityGfx!: Phaser.GameObjects.Graphics;
  private lightGfx!:    Phaser.GameObjects.Graphics;
  private scanlineGfx!: Phaser.GameObjects.Graphics;
  private particleGfx!: Phaser.GameObjects.Graphics;

  // ── state ──────────────────────────────────────────────────
  private particles: Particle[] = [];
  private cctvLights: CCTVLight[] = [];
  private scanY = 0;
  private flickerTimer = 0;
  private time_ = 0;

  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  // ────────────────────────────────────────────────────────────
  create(): void {
    // ── graphics layers (back → front) ──────────────────────
    this.bgGfx       = this.add.graphics();
    this.facilityGfx = this.add.graphics();
    this.lightGfx    = this.add.graphics();
    this.scanlineGfx = this.add.graphics();
    this.particleGfx = this.add.graphics();

    // ── draw static background once ─────────────────────────
    this.drawBackground();
    this.drawFacility();

    // ── CCTV lights ─────────────────────────────────────────
    this.initCCTV();

    // ── particles ────────────────────────────────────────────
    this.initParticles();

    // ── UI ──────────────────────────────────────────────────
    this.buildUI();

    // ── scanline starting y ─────────────────────────────────
    this.scanY = -4;
  }

  // ────────────────────────────────────────────────────────────
  update(_time: number, delta: number): void {
    this.time_ += delta;
    const dt = delta / 1000;  // seconds

    this.updateCCTV(dt);
    this.updateParticles(dt);
    this.updateScanline(dt);
    this.updateFlicker(dt);
  }

  // ──────────────────────────────────────────────────────────
  // STATIC BACKGROUND
  // ──────────────────────────────────────────────────────────
  private drawBackground(): void {
    const g = this.bgGfx;
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    // Base fill
    g.fillStyle(PALETTE.BG, 1);
    g.fillRect(0, 0, W, H);

    // Fine grid
    g.lineStyle(1, PALETTE.CYAN, 0.04);
    for (let x = 0; x <= W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) g.lineBetween(0, y, W, y);

    // Subtle vignette (4 dark corner rectangles)
    const vW = 360; const vH = 240;
    g.fillStyle(0x000000, 0.5);
    // Corners represented by triangular-ish overlay (simple rect gradient not available — use layered rects)
    g.fillRect(0, 0, vW, 1);  // dummy — actual vignette done via alpha rects
    const vSteps = 8;
    for (let i = 0; i < vSteps; i++) {
      const t     = i / vSteps;
      const alpha = (1 - t) * 0.55;
      const pw    = vW * (1 - t);
      const ph    = vH * (1 - t);
      g.fillStyle(0x000000, alpha);
      g.fillRect(0,       0,       pw, 1);     // thin slices aren't visible — full rects:
      g.fillRect(0,       0,       1,  ph);
      g.fillRect(W - 1,  0,       1,  ph);
      g.fillRect(0,      H - 1,   pw, 1);
      g.fillRect(W - pw, H - 1,   pw, 1);
      g.fillRect(W - 1,  H - ph,  1,  ph);
    }
  }

  // ──────────────────────────────────────────────────────────
  // FACILITY SILHOUETTE
  // ──────────────────────────────────────────────────────────
  private drawFacility(): void {
    const g = this.facilityGfx;

    // Render a dark silhouetted "facility floor plan" in the background
    // Rooms drawn as filled rectangles with wall outlines
    const rooms: Array<[number, number, number, number]> = [
      // [x, y, w, h]
      [60,  80, 200, 120],   // top-left block
      [300, 60, 150, 90],
      [500, 50, 180, 100],
      [720, 80, 140, 80],
      [900, 60, 200, 110],
      [60,  400, 160, 110],
      [260, 420, 130, 90],
      [440, 380, 200, 130],
      [690, 400, 160, 100],
      [900, 390, 200, 120],
      [80,  230, 80,  120],
      [560, 210, 100, 140],
      [980, 210, 120, 130],
      [1100, 80, 140, 110],
      [1100, 400, 140, 100],
    ];

    for (const [rx, ry, rw, rh] of rooms) {
      g.fillStyle(PALETTE.STEEL, 0.6);
      g.fillRect(rx, ry, rw, rh);
      g.lineStyle(1, PALETTE.CYAN, 0.10);
      g.strokeRect(rx, ry, rw, rh);
    }

    // Corridors (thin horizontal/vertical strips)
    const corridors: Array<[number, number, number, number]> = [
      [260, 110, 40, 80],
      [450, 100, 50, 60],
      [680, 100, 40, 90],
      [860, 100, 40, 80],
      [160, 290, 200, 20],
      [360, 270, 200, 20],
      [580, 300, 180, 20],
      [820, 300, 180, 20],
      [60, 200, 20, 200],
      [1080, 200, 20, 200],
    ];

    for (const [rx, ry, rw, rh] of corridors) {
      g.fillStyle(PALETTE.BG_MID, 0.8);
      g.fillRect(rx, ry, rw, rh);
    }

    // Pillars
    const pillars: Array<[number, number]> = [
      [170, 160], [340, 180], [580, 160], [810, 160],
      [160, 440], [390, 450], [680, 460], [910, 450],
    ];
    for (const [px, py] of pillars) {
      g.fillStyle(PALETTE.BLUE, 0.25);
      g.fillRect(px - 6, py - 6, 12, 12);
      g.lineStyle(1, PALETTE.CYAN, 0.3);
      g.strokeRect(px - 6, py - 6, 12, 12);
    }

    // Tiny monitor glows
    const monitors: Array<[number, number]> = [
      [100, 110], [150, 110], [320, 90], [520, 80],
      [940, 90], [1120, 110], [480, 420], [720, 420],
    ];
    for (const [mx, my] of monitors) {
      g.fillStyle(PALETTE.CYAN, 0.18);
      g.fillRect(mx, my, 18, 12);
    }
  }

  // ──────────────────────────────────────────────────────────
  // CCTV
  // ──────────────────────────────────────────────────────────
  private initCCTV(): void {
    this.cctvLights = [
      { x: 180,  y: 100, angle: -30, speed: 22, range: 160, halfFov: 22, minAngle: -60, maxAngle: 10,  dir: 1 },
      { x: 640,  y: 50,  angle: 90,  speed: 18, range: 200, halfFov: 20, minAngle: 60,  maxAngle: 120, dir: -1 },
      { x: 1050, y: 90,  angle: 210, speed: 25, range: 150, halfFov: 18, minAngle: 180, maxAngle: 240, dir: 1 },
      { x: 80,   y: 500, angle: -10, speed: 15, range: 140, halfFov: 20, minAngle: -40, maxAngle: 30,  dir: -1 },
      { x: 1150, y: 460, angle: 200, speed: 20, range: 160, halfFov: 22, minAngle: 170, maxAngle: 250, dir: 1 },
    ];
  }

  private updateCCTV(dt: number): void {
    this.lightGfx.clear();

    for (const cam of this.cctvLights) {
      cam.angle += cam.speed * cam.dir * dt;

      if (cam.angle > cam.maxAngle) {
        cam.angle = cam.maxAngle;
        cam.dir   = -1;
      } else if (cam.angle < cam.minAngle) {
        cam.angle = cam.minAngle;
        cam.dir   = 1;
      }

      this.drawCCTVCone(cam);
    }
  }

  private drawCCTVCone(cam: CCTVLight): void {
    const g       = this.lightGfx;
    const angleRad = Phaser.Math.DegToRad(cam.angle);
    const fovRad   = Phaser.Math.DegToRad(cam.halfFov);
    const steps    = 12;

    // Build triangle fan as polygon
    const points: Phaser.Math.Vector2[] = [];
    points.push(new Phaser.Math.Vector2(cam.x, cam.y));

    for (let i = 0; i <= steps; i++) {
      const a = angleRad - fovRad + (2 * fovRad * i) / steps;
      points.push(new Phaser.Math.Vector2(
        cam.x + Math.cos(a) * cam.range,
        cam.y + Math.sin(a) * cam.range,
      ));
    }

    // Fill
    g.fillStyle(PALETTE.CYAN, 0.04);
    g.fillPoints(points, true);

    // Edge lines
    g.lineStyle(1, PALETTE.CYAN, 0.20);
    const leftA  = angleRad - fovRad;
    const rightA = angleRad + fovRad;
    g.lineBetween(cam.x, cam.y,
      cam.x + Math.cos(leftA)  * cam.range,
      cam.y + Math.sin(leftA)  * cam.range);
    g.lineBetween(cam.x, cam.y,
      cam.x + Math.cos(rightA) * cam.range,
      cam.y + Math.sin(rightA) * cam.range);

    // Camera dot
    g.fillStyle(PALETTE.CYAN, 0.9);
    g.fillCircle(cam.x, cam.y, 4);
    g.fillStyle(PALETTE.WHITE, 1);
    g.fillCircle(cam.x, cam.y, 2);
  }

  // ──────────────────────────────────────────────────────────
  // PARTICLES
  // ──────────────────────────────────────────────────────────
  private initParticles(): void {
    for (let i = 0; i < 60; i++) {
      this.particles.push(this.spawnParticle());
    }
  }

  private spawnParticle(): Particle {
    return {
      x:       Phaser.Math.Between(0, GAME_WIDTH),
      y:       Phaser.Math.Between(0, GAME_HEIGHT),
      vx:      Phaser.Math.FloatBetween(-8, 8),
      vy:      Phaser.Math.FloatBetween(-15, -5),
      alpha:   Phaser.Math.FloatBetween(0.1, 0.5),
      size:    Phaser.Math.FloatBetween(0.5, 2),
      life:    0,
      maxLife: Phaser.Math.FloatBetween(3, 8),
    };
  }

  private updateParticles(dt: number): void {
    this.particleGfx.clear();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;

      if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > GAME_WIDTH + 10) {
        this.particles[i] = this.spawnParticle();
        continue;
      }

      const t     = p.life / p.maxLife;
      const alpha = p.alpha * (1 - t);

      this.particleGfx.fillStyle(PALETTE.CYAN, alpha);
      this.particleGfx.fillCircle(p.x, p.y, p.size);
    }
  }

  // ──────────────────────────────────────────────────────────
  // SCANLINE
  // ──────────────────────────────────────────────────────────
  private updateScanline(dt: number): void {
    this.scanY += 180 * dt;  // pixels per second
    if (this.scanY > GAME_HEIGHT + 4) this.scanY = -4;

    this.scanlineGfx.clear();
    this.scanlineGfx.fillStyle(PALETTE.CYAN, 0.06);
    this.scanlineGfx.fillRect(0, this.scanY, GAME_WIDTH, 2);
    this.scanlineGfx.fillStyle(PALETTE.CYAN, 0.02);
    this.scanlineGfx.fillRect(0, this.scanY + 2, GAME_WIDTH, 4);
  }

  // ──────────────────────────────────────────────────────────
  // MONITOR FLICKER
  // ──────────────────────────────────────────────────────────
  private updateFlicker(dt: number): void {
    this.flickerTimer -= dt;
    if (this.flickerTimer <= 0) {
      // _flickerAlpha computed but not used — retained for future glow rendering
      this.flickerTimer = Phaser.Math.FloatBetween(0.05, 0.3);

      // Brief white flash across whole screen
      if (Math.random() < 0.05) {
        this.scanlineGfx.fillStyle(PALETTE.WHITE, 0.01);
        this.scanlineGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────
  private buildUI(): void {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    // ── Panel backing ────────────────────────────────────────
    const panelW = 440;
    const panelH = 500;
    const panel  = this.add.graphics();
    panel.fillStyle(0x000000, 0.65);
    panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.lineStyle(1, PALETTE.CYAN, 0.25);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // Corner accents
    this.drawCornerAccents(panel, cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // ── Title ────────────────────────────────────────────────
    const title = this.add.text(cx, cy - 200, 'THE HEIST', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '42px',
      fontStyle:  'bold',
      color:      '#ffffff',
      stroke:     '#00e5ff',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const subtitle = this.add.text(cx, cy - 157, '// BLACKOUT', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '28px',
      fontStyle:  'bold',
      color:      '#00e5ff',
    }).setOrigin(0.5);

    // Divider line
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, PALETTE.CYAN, 0.4);
    divGfx.lineBetween(cx - 160, cy - 128, cx + 160, cy - 128);
    divGfx.lineStyle(1, PALETTE.CYAN, 0.15);
    divGfx.lineBetween(cx - 120, cy - 124, cx + 120, cy - 124);

    // Tagline
    this.add.text(cx, cy - 108, 'GET IN.  GET THE LOOT.  GET OUT.', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '12px',
      color:      '#3a7a8a',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // ── Buttons ──────────────────────────────────────────────
    const BTN_W   = 320;
    const BTN_H   = 46;
    const BTN_GAP = 12;
    const BTN_START_Y = cy - 48;

    const buttons: Array<{ label: string; variant: 'primary' | 'secondary' | 'danger'; action: () => void }> = [
      {
        label:   '▶  START HEIST',
        variant: 'primary',
        action:  () => this.scene.start(SCENES.MISSION_SELECT),
      },
      {
        label:   '◈  OPERATIONS',
        variant: 'secondary',
        action:  () => this.scene.start(SCENES.MISSION_SELECT),
      },
      {
        label:   '☠  NIGHTMARE MODE',
        variant: 'danger',
        action:  () => this.scene.start(SCENES.NIGHTMARE),
      },
      {
        label:   '?  HOW TO PLAY',
        variant: 'secondary',
        action:  () => this.scene.start(SCENES.HOW_TO_PLAY),
      },
      {
        label:   '⚙  SETTINGS',
        variant: 'secondary',
        action:  () => this.scene.start(SCENES.SETTINGS),
      },
    ];

    buttons.forEach((btn, i) => {
      new MenuButton({
        scene:   this,
        x:       cx,
        y:       BTN_START_Y + i * (BTN_H + BTN_GAP),
        label:   btn.label,
        width:   BTN_W,
        height:  BTN_H,
        variant: btn.variant,
        onClick: btn.action,
      });
    });

    // ── Developer Credit ─────────────────────────────────────
    const creditContainer = this.add.container(GAME_WIDTH - 250, GAME_HEIGHT - 90);
    
    const creditBg = this.add.graphics();
    creditBg.fillStyle(0x000000, 0.7);
    creditBg.fillRect(0, 0, 230, 50);
    creditBg.lineStyle(1, 0x00e5ff, 0.3);
    creditBg.strokeRect(0, 0, 230, 50);
    
    // Small corner brackets
    const cLen = 6;
    creditBg.lineStyle(1.5, 0x00e5ff, 0.8);
    // top-left
    creditBg.beginPath(); creditBg.moveTo(0, cLen); creditBg.lineTo(0, 0); creditBg.lineTo(cLen, 0); creditBg.strokePath();
    // top-right
    creditBg.beginPath(); creditBg.moveTo(230 - cLen, 0); creditBg.lineTo(230, 0); creditBg.lineTo(230, cLen); creditBg.strokePath();
    // bottom-left
    creditBg.beginPath(); creditBg.moveTo(0, 50 - cLen); creditBg.lineTo(0, 50); creditBg.lineTo(cLen, 50); creditBg.strokePath();
    // bottom-right
    creditBg.beginPath(); creditBg.moveTo(230 - cLen, 50); creditBg.lineTo(230, 50); creditBg.lineTo(230, 50 - cLen); creditBg.strokePath();
    
    creditContainer.add(creditBg);
    
    const devText = this.add.text(12, 10, 'MADE BY LAKSH (CNC)', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '14px',
      fontStyle:  'bold',
      color:      '#ffffff',
      shadow: { offsetX: 0, offsetY: 0, color: '#00e5ff', blur: 6, fill: true }
    });
    creditContainer.add(devText);
    
    const secText = this.add.text(12, 30, 'BLACKOUT OPERATIONS PROJECT // 2026', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '9px',
      color:      '#5c8b99',
      letterSpacing: 1,
    });
    creditContainer.add(secText);
    
    // Animation
    creditContainer.setAlpha(0);
    this.tweens.add({ targets: creditContainer, alpha: 1, duration: 800, delay: 500, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: creditContainer, alpha: 0.65, duration: 2500, yoyo: true, repeat: -1, delay: 1300, ease: 'Sine.easeInOut' });

    // Security status bar (top)
    this.drawStatusBar();

    // ── Animate title in ─────────────────────────────────────
    title.setAlpha(0);
    subtitle.setAlpha(0);
    this.tweens.add({ targets: title,    alpha: 1, duration: 600, delay: 100, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 600, delay: 250, ease: 'Quad.easeOut' });
  }

  // ──────────────────────────────────────────────────────────
  private drawStatusBar(): void {
    const g = this.add.graphics();

    // Top bar bg
    g.fillStyle(0x000000, 0.7);
    g.fillRect(0, 0, GAME_WIDTH, 32);
    g.lineStyle(1, PALETTE.CYAN, 0.2);
    g.lineBetween(0, 32, GAME_WIDTH, 32);

    // Left: CCTV ONLINE
    this.add.text(16, 9, '● CCTV ONLINE', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '11px',
      color:      '#00e5ff',
    });

    // Center: facility name
    this.add.text(GAME_WIDTH / 2, 9, 'BLACKOUT CORP TACTICAL SYSTEMS', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '11px',
      color:      '#1a4a5a',
    }).setOrigin(0.5, 0);

    // Right: status
    this.add.text(GAME_WIDTH - 16, 9, 'SECURE  //  CLASSIFIED', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '11px',
      color:      '#1a4a5a',
    }).setOrigin(1, 0);

    // Bottom bar
    g.fillStyle(0x000000, 0.7);
    g.fillRect(0, GAME_HEIGHT - 24, GAME_WIDTH, 24);
    g.lineStyle(1, PALETTE.CYAN, 0.15);
    g.lineBetween(0, GAME_HEIGHT - 24, GAME_WIDTH, GAME_HEIGHT - 24);

    this.add.text(16, GAME_HEIGHT - 15, 'HEIST PROTOCOL ACTIVE', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '10px',
      color:      '#0d2a38',
    }).setOrigin(0, 0.5);

    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 15, 'BLACKOUT SYSTEMS  //  ALL RIGHTS RESERVED', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '10px',
      color:      '#0d2a38',
    }).setOrigin(1, 0.5);
  }

  // ──────────────────────────────────────────────────────────
  private drawCornerAccents(
    g:   Phaser.GameObjects.Graphics,
    x:   number,
    y:   number,
    w:   number,
    h:   number,
  ): void {
    const len = 20;
    const col = PALETTE.CYAN;
    const a   = 0.8;

    g.lineStyle(2, col, a);

    // Top-left
    g.beginPath(); g.moveTo(x, y + len); g.lineTo(x, y); g.lineTo(x + len, y); g.strokePath();
    // Top-right
    g.beginPath(); g.moveTo(x + w - len, y); g.lineTo(x + w, y); g.lineTo(x + w, y + len); g.strokePath();
    // Bottom-left
    g.beginPath(); g.moveTo(x, y + h - len); g.lineTo(x, y + h); g.lineTo(x + len, y + h); g.strokePath();
    // Bottom-right
    g.beginPath(); g.moveTo(x + w - len, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w, y + h - len); g.strokePath();
  }
}
