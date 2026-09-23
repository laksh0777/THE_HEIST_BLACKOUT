import Phaser from 'phaser';
import { PALETTE } from '../core/Constants';

export interface MenuButtonConfig {
  scene:    Phaser.Scene;
  x:        number;
  y:        number;
  label:    string;
  width?:   number;
  height?:  number;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick:  () => void;
}

// ─── colour maps per variant ─────────────────────────────────
const BORDER_COLORS = {
  primary:   PALETTE.CYAN,
  secondary: PALETTE.GREY,
  danger:    PALETTE.RED,
} as const;

const TEXT_COLORS = {
  primary:   '#00e5ff',
  secondary: '#7a9ab8',
  danger:    '#ff1744',
} as const;

const GLOW_COLORS = {
  primary:   0x00e5ff,
  secondary: 0x3a4a5a,
  danger:    0xff1744,
} as const;

// ─── MenuButton ───────────────────────────────────────────────
export class MenuButton extends Phaser.GameObjects.Container {
  private bg:      Phaser.GameObjects.Graphics;
  private label:   Phaser.GameObjects.Text;
  private variant: 'primary' | 'secondary' | 'danger';
  private bw:      number;
  private bh:      number;
  private _hovered = false;

  constructor(cfg: MenuButtonConfig) {
    super(cfg.scene, cfg.x, cfg.y);

    this.bw      = cfg.width  ?? 300;
    this.bh      = cfg.height ?? 50;
    this.variant = cfg.variant ?? 'primary';

    // ── background ───────────────────────────────────────────
    this.bg = cfg.scene.add.graphics();
    this.drawBg(false);
    this.add(this.bg);

    // ── label ────────────────────────────────────────────────
    this.label = cfg.scene.add.text(0, 0, cfg.label, {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '16px',
      color:      TEXT_COLORS[this.variant],
      align:      'center',
    });
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    // ── interaction ──────────────────────────────────────────
    const hitArea = new Phaser.Geom.Rectangle(
      -this.bw / 2, -this.bh / 2, this.bw, this.bh,
    );
    this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    this.on('pointerover',  () => this.onHover(true));
    this.on('pointerout',   () => this.onHover(false));
    this.on('pointerdown',  () => this.onPress(cfg.onClick));

    cfg.scene.add.existing(this);
  }

  // ── draw ──────────────────────────────────────────────────
  private drawBg(hovered: boolean): void {
    this.bg.clear();

    const bw = this.bw;
    const bh = this.bh;
    const borderColor = BORDER_COLORS[this.variant];
    const glowColor   = GLOW_COLORS[this.variant];

    // Fill
    const fillAlpha = hovered ? 0.25 : 0.10;
    this.bg.fillStyle(hovered ? glowColor : PALETTE.GREY_DIM, fillAlpha);
    this.bg.fillRect(-bw / 2, -bh / 2, bw, bh);

    // Corner accent lines (top-left + bottom-right)
    const corner = 12;
    this.bg.lineStyle(1, borderColor, hovered ? 1 : 0.5);

    // Top border
    this.bg.beginPath();
    this.bg.moveTo(-bw / 2 + corner, -bh / 2);
    this.bg.lineTo( bw / 2,          -bh / 2);
    this.bg.strokePath();

    // Bottom border
    this.bg.beginPath();
    this.bg.moveTo(-bw / 2,          bh / 2);
    this.bg.lineTo( bw / 2 - corner, bh / 2);
    this.bg.strokePath();

    // Left border (partial)
    this.bg.lineStyle(1, borderColor, hovered ? 0.8 : 0.3);
    this.bg.beginPath();
    this.bg.moveTo(-bw / 2, -bh / 2 + corner);
    this.bg.lineTo(-bw / 2,  bh / 2);
    this.bg.strokePath();

    // Right border (partial)
    this.bg.beginPath();
    this.bg.moveTo(bw / 2, -bh / 2);
    this.bg.lineTo(bw / 2,  bh / 2 - corner);
    this.bg.strokePath();

    // Corner cuts
    this.bg.lineStyle(1, borderColor, hovered ? 1 : 0.5);

    this.bg.beginPath();
    this.bg.moveTo(-bw / 2,          -bh / 2 + corner);
    this.bg.lineTo(-bw / 2 + corner, -bh / 2);
    this.bg.strokePath();

    this.bg.beginPath();
    this.bg.moveTo( bw / 2 - corner, bh / 2);
    this.bg.lineTo( bw / 2,          bh / 2 - corner);
    this.bg.strokePath();

    // Scan line (decorative)
    if (hovered) {
      this.bg.lineStyle(1, glowColor, 0.15);
      this.bg.beginPath();
      this.bg.moveTo(-bw / 2 + 1, 0);
      this.bg.lineTo( bw / 2 - 1, 0);
      this.bg.strokePath();
    }
  }

  // ── hover ────────────────────────────────────────────────
  private onHover(state: boolean): void {
    if (this._hovered === state) return;
    this._hovered = state;
    this.drawBg(state);
    this.scene.tweens.add({
      targets:  this.label,
      scaleX:   state ? 1.05 : 1,
      scaleY:   state ? 1.05 : 1,
      duration: 100,
      ease:     'Quad.easeOut',
    });
  }

  // ── press ────────────────────────────────────────────────
  private onPress(callback: () => void): void {
    this.scene.tweens.add({
      targets:  this,
      scaleX:   0.96,
      scaleY:   0.96,
      duration: 80,
      yoyo:     true,
      ease:     'Quad.easeInOut',
      onComplete: callback,
    });
  }
}
