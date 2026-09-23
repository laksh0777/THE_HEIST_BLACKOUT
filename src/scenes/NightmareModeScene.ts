import Phaser from 'phaser';
import { SCENES, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../core/Constants';
import { MenuButton } from '../ui/MenuButton';

export class NightmareModeScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.NIGHTMARE });
  }

  create(): void {
    const W  = GAME_WIDTH;
    const H  = GAME_HEIGHT;
    const cx = W / 2;
    const cy = H / 2;

    // ── Background ──────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x080000, 1);
    bg.fillRect(0, 0, W, H);
    bg.lineStyle(1, PALETTE.RED, 0.04);
    for (let x = 0; x <= W; x += 40) bg.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) bg.lineBetween(0, y, W, y);

    // ── Top bar ──────────────────────────────────────────────
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.85);
    topBar.fillRect(0, 0, W, 60);
    topBar.lineStyle(1, PALETTE.RED, 0.5);
    topBar.lineBetween(0, 60, W, 60);

    this.add.text(cx, 20, '☠  NIGHTMARE MODE  ☠', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '22px',
      color:      '#ff1744',
    }).setOrigin(0.5, 0.5);

    // ── Central panel ────────────────────────────────────────
    const panelW = 520;
    const panelH = 380;
    const panel  = this.add.graphics();
    panel.fillStyle(0x0a0000, 0.9);
    panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.lineStyle(1, PALETTE.RED, 0.5);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // Corner accents (red)
    panel.lineStyle(2, PALETTE.RED, 0.9);
    const [px, py] = [cx - panelW / 2, cy - panelH / 2];
    const len = 20;
    panel.beginPath(); panel.moveTo(px, py + len); panel.lineTo(px, py); panel.lineTo(px + len, py); panel.strokePath();
    panel.beginPath(); panel.moveTo(px + panelW - len, py); panel.lineTo(px + panelW, py); panel.lineTo(px + panelW, py + len); panel.strokePath();
    panel.beginPath(); panel.moveTo(px, py + panelH - len); panel.lineTo(px, py + panelH); panel.lineTo(px + len, py + panelH); panel.strokePath();
    panel.beginPath(); panel.moveTo(px + panelW - len, py + panelH); panel.lineTo(px + panelW, py + panelH); panel.lineTo(px + panelW, py + panelH - len); panel.strokePath();

    // Content
    this.add.text(cx, cy - 140, 'NIGHTMARE MODE', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '28px',
      fontStyle:  'bold',
      color:      '#ff1744',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 105, '// CLASSIFIED', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '14px',
      color:      '#5a1020',
    }).setOrigin(0.5);

    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, PALETTE.RED, 0.4);
    divGfx.lineBetween(cx - 180, cy - 82, cx + 180, cy - 82);

    const lines = [
      '● MORE GUARDS  //  FASTER CCTV',
      '● HARDER VAULT PUZZLES  //  LESS TIME',
      '● STRONGER LOCKDOWN  //  REDUCED MINIMAP',
      '● HIGHER REWARDS  //  EXTREME DIFFICULTY',
    ];

    lines.forEach((l, i) => {
      this.add.text(cx, cy - 56 + i * 30, l, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '13px',
        color:      '#7a1020',
      }).setOrigin(0.5);
    });

    this.add.text(cx, cy + 80, 'COMPLETE ALL 5 OPERATIONS TO UNLOCK', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '12px',
      color:      '#3a0808',
    }).setOrigin(0.5);

    // Lock icon
    this.add.text(cx, cy + 110, '🔒  LOCKED', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '16px',
      color:      '#2a0808',
    }).setOrigin(0.5);

    // ── Back button ──────────────────────────────────────────
    new MenuButton({
      scene:   this,
      x:       cx,
      y:       H - 44,
      label:   '◄  BACK TO MAIN MENU',
      width:   280,
      height:  40,
      variant: 'danger',
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });
  }
}
