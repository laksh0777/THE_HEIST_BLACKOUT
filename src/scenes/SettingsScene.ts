import Phaser from 'phaser';
import { SCENES, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../core/Constants';
import { MenuButton } from '../ui/MenuButton';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.SETTINGS });
  }

  create(): void {
    const W  = GAME_WIDTH;
    const H  = GAME_HEIGHT;
    const cx = W / 2;
    const cy = H / 2;

    // ── Background ──────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.BG, 1);
    bg.fillRect(0, 0, W, H);
    bg.lineStyle(1, PALETTE.CYAN, 0.04);
    for (let x = 0; x <= W; x += 40) bg.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) bg.lineBetween(0, y, W, y);

    // ── Top bar ──────────────────────────────────────────────
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.8);
    topBar.fillRect(0, 0, W, 60);
    topBar.lineStyle(1, PALETTE.CYAN, 0.3);
    topBar.lineBetween(0, 60, W, 60);

    this.add.text(cx, 20, 'SETTINGS  //  SYSTEM CONFIGURATION', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '20px',
      color:      '#00e5ff',
    }).setOrigin(0.5, 0.5);

    // ── Panel ────────────────────────────────────────────────
    const panelW = 560;
    const panelH = 440;
    const panel  = this.add.graphics();
    panel.fillStyle(0x010d1e, 0.9);
    panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.lineStyle(1, PALETTE.CYAN, 0.25);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // Corner accents
    this.drawCornerAccents(panel, cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // ── Settings rows ────────────────────────────────────────
    const settings = [
      { label: 'MASTER VOLUME',  value: 0.8,  color: PALETTE.CYAN  },
      { label: 'SFX VOLUME',     value: 0.7,  color: PALETTE.CYAN  },
      { label: 'MUSIC VOLUME',   value: 0.5,  color: PALETTE.CYAN  },
      { label: 'SCREEN SHAKE',   value: 1.0,  color: PALETTE.GREEN },
      { label: 'SHOW MINIMAP',   value: 1.0,  color: PALETTE.GREEN },
      { label: 'SHOW CCTV HINT', value: 0.0,  color: PALETTE.GREY  },
    ];

    const ROW_H  = 54;
    const startY = cy - panelH / 2 + 30;
    const labelX = cx - panelW / 2 + 24;
    const sliderX = cx + 20;
    const sliderW = 200;

    settings.forEach((s, i) => {
      const rowY = startY + i * ROW_H;

      // Alternate row bg
      if (i % 2 === 0) {
        panel.fillStyle(PALETTE.CYAN, 0.03);
        panel.fillRect(cx - panelW / 2 + 8, rowY + 4, panelW - 16, ROW_H - 8);
      }

      // Label
      this.add.text(labelX, rowY + ROW_H / 2, s.label, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '13px',
        color:      '#7aaabb',
      }).setOrigin(0, 0.5);

      // Slider track
      panel.fillStyle(PALETTE.GREY_DIM, 1);
      panel.fillRect(sliderX, rowY + ROW_H / 2 - 3, sliderW, 6);

      // Slider fill
      panel.fillStyle(s.color, 0.8);
      panel.fillRect(sliderX, rowY + ROW_H / 2 - 3, sliderW * s.value, 6);

      // Slider handle
      panel.fillStyle(s.value > 0 ? s.color : PALETTE.GREY, 1);
      panel.fillCircle(sliderX + sliderW * s.value, rowY + ROW_H / 2, 8);
      panel.fillStyle(PALETTE.BG, 1);
      panel.fillCircle(sliderX + sliderW * s.value, rowY + ROW_H / 2, 4);

      // Value pct text
      const pct = s.value < 0.05 ? 'OFF' : (s.value >= 0.99 ? 'ON / 100%' : Math.round(s.value * 100) + '%');
      this.add.text(sliderX + sliderW + 16, rowY + ROW_H / 2, pct, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '11px',
        color:      Phaser.Display.Color.IntegerToColor(s.color).rgba,
      }).setOrigin(0, 0.5);
    });

    // Note
    this.add.text(cx, cy + panelH / 2 - 24, 'SETTINGS ARE VISUAL ONLY IN THIS BUILD', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '10px',
      color:      '#0d2a38',
    }).setOrigin(0.5);

    // ── Back button ──────────────────────────────────────────
    new MenuButton({
      scene:   this,
      x:       cx,
      y:       H - 44,
      label:   '◄  BACK TO MAIN MENU',
      width:   280,
      height:  40,
      variant: 'secondary',
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });
  }

  private drawCornerAccents(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
  ): void {
    const len = 20;
    g.lineStyle(2, PALETTE.CYAN, 0.6);
    g.beginPath(); g.moveTo(x, y + len); g.lineTo(x, y); g.lineTo(x + len, y); g.strokePath();
    g.beginPath(); g.moveTo(x + w - len, y); g.lineTo(x + w, y); g.lineTo(x + w, y + len); g.strokePath();
    g.beginPath(); g.moveTo(x, y + h - len); g.lineTo(x, y + h); g.lineTo(x + len, y + h); g.strokePath();
    g.beginPath(); g.moveTo(x + w - len, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w, y + h - len); g.strokePath();
  }
}
