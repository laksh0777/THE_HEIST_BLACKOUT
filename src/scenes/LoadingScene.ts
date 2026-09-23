import Phaser from 'phaser';
import { SCENES, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../core/Constants';

const LOAD_MESSAGES = [
  'INITIALIZING SYSTEMS...',
  'LOADING TACTICAL DATA...',
  'SCANNING FACILITY MAPS...',
  'CALIBRATING DETECTION AI...',
  'ESTABLISHING SECURE CHANNEL...',
  'READY.',
];

export class LoadingScene extends Phaser.Scene {
  private barFill!:    Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private msgIndex  = 0;
  private progress  = 0;

  constructor() {
    super({ key: SCENES.LOADING });
  }

  create(): void {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    // ── Background ──────────────────────────────────────────
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(PALETTE.BG, 1);
    bgGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid overlay
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, PALETTE.CYAN, 0.04);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      gridGfx.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      gridGfx.lineBetween(0, y, GAME_WIDTH, y);
    }

    // ── Title ───────────────────────────────────────────────
    this.add.text(cx, cy - 120, 'THE HEIST // BLACKOUT', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '28px',
      color:      '#00e5ff',
    }).setOrigin(0.5).setAlpha(0.9);

    this.add.text(cx, cy - 85, 'GET IN.  GET THE LOOT.  GET OUT.', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '13px',
      color:      '#3a7a8a',
    }).setOrigin(0.5);

    // ── Bar outline ─────────────────────────────────────────
    const BAR_W = 400;
    const BAR_H = 6;
    const barX  = cx - BAR_W / 2;
    const barY  = cy - 20;

    const barBg = this.add.graphics();
    barBg.lineStyle(1, PALETTE.CYAN, 0.3);
    barBg.strokeRect(barX - 1, barY - 1, BAR_W + 2, BAR_H + 2);
    barBg.fillStyle(PALETTE.BG_MID, 1);
    barBg.fillRect(barX, barY, BAR_W, BAR_H);

    // ── Bar fill ─────────────────────────────────────────────
    this.barFill = this.add.graphics();

    // ── Status text ──────────────────────────────────────────
    this.statusText = this.add.text(cx, barY + 24, '', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '12px',
      color:      '#3a7a8a',
    }).setOrigin(0.5, 0);

    // ── Percentage text ──────────────────────────────────────
    const pctText = this.add.text(barX + BAR_W + 10, barY - 1, '0%', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '11px',
      color:      '#00e5ff',
    }).setOrigin(0, 0.5);

    // ── Drive the progress with a timed loop ─────────────────
    const BAR_W_INNER = BAR_W;

    const advance = (): void => {
      if (this.progress >= 1) {
        this.scene.start(SCENES.MAIN_MENU);
        return;
      }

      // Increment
      const step = Phaser.Math.FloatBetween(0.08, 0.18);
      this.progress = Math.min(1, this.progress + step);

      // Update bar
      this.barFill.clear();
      this.barFill.fillStyle(PALETTE.CYAN, 1);
      this.barFill.fillRect(barX, barY, BAR_W_INNER * this.progress, BAR_H);

      // Bright leading edge
      this.barFill.fillStyle(PALETTE.WHITE, 0.8);
      this.barFill.fillRect(
        barX + BAR_W_INNER * this.progress - 2,
        barY,
        2,
        BAR_H,
      );

      // Update percentage
      pctText.setText(Math.floor(this.progress * 100) + '%');

      // Cycle through messages
      const msgAt = Math.floor(this.progress * LOAD_MESSAGES.length);
      const clamp = Math.min(msgAt, LOAD_MESSAGES.length - 1);
      if (clamp !== this.msgIndex) {
        this.msgIndex = clamp;
      }
      this.statusText.setText(LOAD_MESSAGES[this.msgIndex]);

      // Schedule next tick
      const delay = this.progress >= 1 ? 400 : Phaser.Math.Between(180, 350);
      this.time.delayedCall(delay, advance);
    };

    // Kick off
    this.time.delayedCall(300, advance);
  }
}
