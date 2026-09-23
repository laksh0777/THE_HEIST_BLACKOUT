import Phaser from 'phaser';
import { SCENES, PALETTE, GAME_WIDTH, GAME_HEIGHT } from '../core/Constants';
import { MenuButton } from '../ui/MenuButton';

interface MissionDef {
  id:       string;
  name:     string;
  subtitle: string;
  reward:   string;
  level:    number;
  color:    number;
  locked:   boolean;
}

const MISSIONS: MissionDef[] = [
  { id: '01', name: 'BLACKOUT HQ',  subtitle: 'Corporate Intelligence HQ', reward: 'CASH  ₹100',        level: 1, color: PALETTE.CYAN,   locked: false },
  { id: '02', name: 'THE FACTORY',  subtitle: 'Industrial Facility',        reward: 'DIAMOND  ₹300',     level: 2, color: 0x40c4ff,       locked: true  },
  { id: '03', name: 'THE CITADEL',  subtitle: 'Military High-Security',     reward: 'GOLD  ₹500',        level: 3, color: PALETTE.GOLD,   locked: true  },
  { id: '04', name: 'ORION LAB',    subtitle: 'Advanced Research Facility', reward: 'MASTERPIECE  ₹1000',level: 4, color: 0xb388ff,       locked: true  },
  { id: '05', name: 'DEEP ZERO',    subtitle: 'Underground Secret Bunker',  reward: 'CLASSIFIED',        level: 5, color: PALETTE.RED,    locked: true  },
];

export class MissionSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MISSION_SELECT });
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

    this.add.text(cx, 20, 'OPERATIONS  //  SELECT MISSION', {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '20px',
      color:      '#00e5ff',
    }).setOrigin(0.5, 0.5);

    this.add.text(16, 20, '◄', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '16px',
      color:      '#3a7a8a',
    }).setOrigin(0, 0.5);

    // ── Mission cards ────────────────────────────────────────
    const CARD_W   = 200;
    const CARD_H   = 320;
    const CARD_GAP = 20;
    const totalW   = MISSIONS.length * CARD_W + (MISSIONS.length - 1) * CARD_GAP;
    const startX   = cx - totalW / 2;
    const cardY    = H / 2 - CARD_H / 2 + 20;

    MISSIONS.forEach((m, i) => {
      const cardX = startX + i * (CARD_W + CARD_GAP);
      this.drawMissionCard(cardX, cardY, CARD_W, CARD_H, m);
    });

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

  private drawMissionCard(
    x: number, y: number, w: number, h: number, m: MissionDef,
  ): void {
    const g      = this.add.graphics();
    const locked = m.locked;
    const col    = locked ? PALETTE.GREY : m.color;

    // Card bg
    g.fillStyle(locked ? 0x050d18 : 0x060f1c, 1);
    g.fillRect(x, y, w, h);

    // Border
    g.lineStyle(1, col, locked ? 0.2 : 0.7);
    g.strokeRect(x, y, w, h);

    // Top accent bar
    g.fillStyle(col, locked ? 0.08 : 0.3);
    g.fillRect(x, y, w, 4);

    // Mission ID
    this.add.text(x + 12, y + 14, m.id, {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '22px',
      color:      locked ? '#1a2a3a' : Phaser.Display.Color.IntegerToColor(col).rgba,
    });

    // Security level dots
    for (let d = 0; d < 5; d++) {
      g.fillStyle(d < m.level ? col : PALETTE.GREY_DIM, d < m.level ? (locked ? 0.2 : 0.9) : 0.3);
      g.fillCircle(x + w - 16 - d * 14, y + 22, 4);
    }

    // Divider
    g.lineStyle(1, col, locked ? 0.1 : 0.3);
    g.lineBetween(x + 12, y + 44, x + w - 12, y + 44);

    // Name
    this.add.text(x + 12, y + 56, m.name, {
      fontFamily: '"Orbitron", monospace',
      fontSize:   '13px',
      fontStyle:  'bold',
      color:      locked ? '#1a3040' : '#ffffff',
      wordWrap:   { width: w - 24 },
    });

    // Subtitle
    this.add.text(x + 12, y + 82, m.subtitle, {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '10px',
      color:      locked ? '#0d1e2a' : '#3a7a8a',
      wordWrap:   { width: w - 24 },
    });

    // Security level label
    this.add.text(x + 12, y + 130, `SECURITY LEVEL ${m.level}`, {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '10px',
      color:      locked ? '#0d1e2a' : Phaser.Display.Color.IntegerToColor(col).rgba,
    });

    // Reward
    this.add.text(x + 12, y + 150, locked ? '?????  LOCKED' : m.reward, {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize:   '11px',
      color:      locked ? '#0d1e2a' : '#ffffff',
    });

    // Lock icon
    if (locked) {
      this.add.text(x + w / 2, y + h / 2 + 20, '🔒', {
        fontSize: '28px',
        color:    '#1a2a3a',
      }).setOrigin(0.5).setAlpha(0.4);
    }

    // LOOT SECURED badge (only first)
    if (!locked) {
      g.fillStyle(col, 0.15);
      g.fillRect(x + 12, y + h - 44, w - 24, 28);
      g.lineStyle(1, col, 0.5);
      g.strokeRect(x + 12, y + h - 44, w - 24, 28);
      
      new MenuButton({
        scene: this,
        x: x + w / 2,
        y: y + h - 30,
        label: 'START HEIST',
        width: w - 24,
        height: 28,
        variant: 'primary',
        onClick: () => {
          console.log('[HEIST 01] BUTTON CLICK');
          console.log('[HEIST 02] MISSION = ' + m.id);
          console.log('[HEIST 03] START MISSION CALLED');
          console.log('[HEIST 04] TRANSITION CALLED');
          this.scene.start(SCENES.INFILTRATION, { missionId: m.id });
        }
      });
    }
  }
}
