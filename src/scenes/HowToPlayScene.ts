import Phaser from 'phaser';
import { SCENES, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../core/Constants';
import { MenuButton } from '../ui/MenuButton';

interface ControlEntry {
  key:    string;
  action: string;
}

const CONTROLS: ControlEntry[] = [
  { key: 'W / A / S / D',     action: 'Move Agent'          },
  { key: '↑ / ← / ↓ / →',    action: 'Move Agent (Alt)'    },
  { key: 'SHIFT',              action: 'Sprint'              },
  { key: 'CTRL',               action: 'Crouch'              },
  { key: 'E',                  action: 'Interact / Breach'   },
  { key: 'ESC',                action: 'Pause Game'          },
];

const TIPS: string[] = [
  '▸  Stay in shadows to reduce CCTV detection.',
  '▸  Crouch is limited to ~5 seconds — plan your approach.',
  '▸  Guards react to noise, vision, and CCTV alerts.',
  '▸  Every map has a safe route AND a risky shortcut.',
  '▸  Three strikes and you\'re burned.',
  '▸  Carrying loot increases noise — move carefully.',
];

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.HOW_TO_PLAY });
  }

  create(): void {
    const W  = GAME_WIDTH;
    const H  = GAME_HEIGHT;
    const cx = W / 2;

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

    this.add.text(cx, 20, 'HOW TO PLAY  //  AGENT BRIEFING', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '20px',
      color:      '#00e5ff',
    }).setOrigin(0.5, 0.5);

    // ── Two-column layout ────────────────────────────────────
    const colW    = 440;
    const leftX   = cx - colW - 20;
    const rightX  = cx + 20;
    const topY    = 90;

    // ─ Left: Controls ─────────────────────────────────────
    const leftPanel = this.add.graphics();
    leftPanel.fillStyle(0x010d1e, 0.8);
    leftPanel.fillRect(leftX, topY, colW, 400);
    leftPanel.lineStyle(1, PALETTE.CYAN, 0.2);
    leftPanel.strokeRect(leftX, topY, colW, 400);

    this.add.text(leftX + 16, topY + 16, 'CONTROLS', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '14px',
      color:      '#00e5ff',
    });

    leftPanel.lineStyle(1, PALETTE.CYAN, 0.2);
    leftPanel.lineBetween(leftX + 16, topY + 40, leftX + colW - 16, topY + 40);

    CONTROLS.forEach((c, i) => {
      const rowY = topY + 58 + i * 48;
      // Row bg alternating
      if (i % 2 === 0) {
        leftPanel.fillStyle(PALETTE.CYAN, 0.03);
        leftPanel.fillRect(leftX + 8, rowY - 8, colW - 16, 44);
      }

      // Key badge
      const keyGfx = this.add.graphics();
      keyGfx.fillStyle(PALETTE.CYAN, 0.15);
      keyGfx.fillRoundedRect(leftX + 16, rowY, 140, 28, 4);
      keyGfx.lineStyle(1, PALETTE.CYAN, 0.5);
      keyGfx.strokeRoundedRect(leftX + 16, rowY, 140, 28, 4);

      this.add.text(leftX + 86, rowY + 14, c.key, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '11px',
        color:      '#00e5ff',
      }).setOrigin(0.5, 0.5);

      this.add.text(leftX + 170, rowY + 14, c.action, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '12px',
        color:      '#7aaabb',
      }).setOrigin(0, 0.5);
    });

    // ─ Right: Tips & core loop ──────────────────────────────
    const rightPanel = this.add.graphics();
    rightPanel.fillStyle(0x010d1e, 0.8);
    rightPanel.fillRect(rightX, topY, colW, 180);
    rightPanel.lineStyle(1, PALETTE.CYAN, 0.2);
    rightPanel.strokeRect(rightX, topY, colW, 180);

    this.add.text(rightX + 16, topY + 16, 'CORE LOOP', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '14px',
      color:      '#00e5ff',
    });
    rightPanel.lineStyle(1, PALETTE.CYAN, 0.2);
    rightPanel.lineBetween(rightX + 16, topY + 40, rightX + colW - 16, topY + 40);

    const loopSteps = ['INFILTRATE', 'BREACH', 'LOOT', 'ESCAPE'];
    const loopColors = [PALETTE.CYAN, PALETTE.ORANGE, PALETTE.GOLD, PALETTE.GREEN];
    loopSteps.forEach((step, i) => {
      const lx = rightX + 20 + i * (colW / loopSteps.length);
      const lw = colW / loopSteps.length - 10;

      rightPanel.fillStyle(loopColors[i], 0.12);
      rightPanel.fillRect(lx, topY + 56, lw, 90);
      rightPanel.lineStyle(1, loopColors[i], 0.4);
      rightPanel.strokeRect(lx, topY + 56, lw, 90);

      this.add.text(lx + lw / 2, topY + 100, step, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '10px',
        color:      Phaser.Display.Color.IntegerToColor(loopColors[i]).rgba,
      }).setOrigin(0.5);
    });

    // Arrow separators
    for (let i = 0; i < loopSteps.length - 1; i++) {
      const ax = rightX + 20 + (i + 1) * (colW / loopSteps.length) - 5;
      this.add.text(ax, topY + 101, '→', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '12px',
        color:      '#1a3a4a',
      }).setOrigin(0.5);
    }

    // Tips panel
    const tipsPanel = this.add.graphics();
    tipsPanel.fillStyle(0x010d1e, 0.8);
    tipsPanel.fillRect(rightX, topY + 200, colW, 200);
    tipsPanel.lineStyle(1, PALETTE.CYAN, 0.2);
    tipsPanel.strokeRect(rightX, topY + 200, colW, 200);

    this.add.text(rightX + 16, topY + 216, 'AGENT TIPS', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '14px',
      color:      '#00e5ff',
    });
    tipsPanel.lineStyle(1, PALETTE.CYAN, 0.2);
    tipsPanel.lineBetween(rightX + 16, topY + 240, rightX + colW - 16, topY + 240);

    TIPS.forEach((tip, i) => {
      this.add.text(rightX + 16, topY + 256 + i * 22, tip, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize:   '11px',
        color:      '#3a6a7a',
        wordWrap:   { width: colW - 32 },
      });
    });

    // ── Timer info ────────────────────────────────────────────
    const timerPanel = this.add.graphics();
    timerPanel.fillStyle(PALETTE.ORANGE, 0.08);
    timerPanel.fillRect(cx - 200, topY + 420, 400, 50);
    timerPanel.lineStyle(1, PALETTE.ORANGE, 0.4);
    timerPanel.strokeRect(cx - 200, topY + 420, 400, 50);

    this.add.text(cx, topY + 445, '⏱  MISSION TIME:  03:00  //  GET IN AND GET OUT', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '12px',
      color:      '#ff6b00',
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
}
