import Phaser from 'phaser';
import { PALETTE, THEME } from '../core/Constants';

export class PropFactory {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  
  private tileWidth = 64;
  private tileHeight = 32;
  private originX: number;
  private originY = 100;

  constructor(scene: Phaser.Scene, mapWidth: number = 40) {
    this.scene = scene;
    this.originX = (mapWidth * this.tileWidth) / 2;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(20); // Render above floor and walls
  }
  
  private toIso(tx: number, ty: number, heightOffGround: number = 0) {
    const isoX = this.originX + (tx - ty) * (this.tileWidth / 2);
    const isoY = this.originY + (tx + ty) * (this.tileHeight / 2) - heightOffGround;
    return { x: isoX, y: isoY };
  }

  // Generic box helper
  private drawBox(tx: number, ty: number, w: number, d: number, h: number, 
    topColor: number, leftColor: number, rightColor: number, lineColor: number) {
    
    const gfx = this.scene.add.graphics();
    
    const pt0 = this.toIso(tx, ty);
    const pt1 = this.toIso(tx + w, ty);
    const pt2 = this.toIso(tx + w, ty + d);
    const pt3 = this.toIso(tx, ty + d);

    // Top
    gfx.fillStyle(topColor, 1);
    gfx.fillPoints([
      {x: pt0.x, y: pt0.y - h}, 
      {x: pt1.x, y: pt1.y - h}, 
      {x: pt2.x, y: pt2.y - h}, 
      {x: pt3.x, y: pt3.y - h}
    ], true);
    gfx.lineStyle(1, lineColor, 0.5);
    gfx.strokePoints([
      {x: pt0.x, y: pt0.y - h}, 
      {x: pt1.x, y: pt1.y - h}, 
      {x: pt2.x, y: pt2.y - h}, 
      {x: pt3.x, y: pt3.y - h}
    ], true);

    // Left
    gfx.fillStyle(leftColor, 1);
    gfx.fillPoints([
      {x: pt3.x, y: pt3.y}, 
      {x: pt0.x, y: pt0.y}, 
      {x: pt0.x, y: pt0.y - h}, 
      {x: pt3.x, y: pt3.y - h}
    ], true);
    gfx.lineStyle(1, lineColor, 0.4);
    gfx.strokePoints([
      {x: pt3.x, y: pt3.y}, 
      {x: pt0.x, y: pt0.y}, 
      {x: pt0.x, y: pt0.y - h}, 
      {x: pt3.x, y: pt3.y - h}
    ], true);

    // Right
    gfx.fillStyle(rightColor, 1);
    gfx.fillPoints([
      {x: pt2.x, y: pt2.y}, 
      {x: pt3.x, y: pt3.y}, 
      {x: pt3.x, y: pt3.y - h}, 
      {x: pt2.x, y: pt2.y - h}
    ], true);
    gfx.lineStyle(1, lineColor, 0.4);
    gfx.strokePoints([
      {x: pt2.x, y: pt2.y}, 
      {x: pt3.x, y: pt3.y}, 
      {x: pt3.x, y: pt3.y - h}, 
      {x: pt2.x, y: pt2.y - h}
    ], true);

    this.container.add(gfx);
    return gfx;
  }

  // --- Specific Props ---

  public createDesk(tx: number, ty: number) {
    this.drawBox(tx + 0.1, ty + 0.1, 0.8, 0.8, 15, 0x112b45, 0x0a192b, 0x07111d, PALETTE.CYAN_DIM);
    // Monitor
    this.drawBox(tx + 0.4, ty + 0.2, 0.2, 0.6, 25, 0x000000, 0x001122, PALETTE.CYAN, PALETTE.CYAN);
  }

  public createServerRack(tx: number, ty: number) {
    this.drawBox(tx, ty, 1, 1, 50, 0x111111, 0x080808, 0x0a0a0a, PALETTE.CYAN_DIM);
    // Add blinking lights
    const gfx = this.scene.add.graphics();
    const frontPos = this.toIso(tx + 0.5, ty + 1, 30);
    gfx.fillStyle(PALETTE.CYAN, 0.8);
    gfx.fillRect(frontPos.x - 2, frontPos.y - 10, 4, 20);
    this.container.add(gfx);
  }

  public createStorageCrate(tx: number, ty: number) {
    this.drawBox(tx + 0.1, ty + 0.1, 0.8, 0.8, 20, 0x2a2a2a, 0x1a1a1a, 0x111111, 0x555555);
  }

  public createSecurityConsole(tx: number, ty: number) {
    this.drawBox(tx, ty, 1.5, 0.8, 18, 0x0a192b, 0x050d17, 0x03080e, PALETTE.RED);
    // Screens
    this.drawBox(tx + 0.2, ty + 0.1, 1.1, 0.2, 35, 0x000000, 0x000000, 0x3a0000, PALETTE.RED);
  }

  public createReceptionDesk(tx: number, ty: number) {
    this.drawBox(tx, ty, 2, 1, 20, 0x112b45, 0x0a192b, 0x07111d, PALETTE.CYAN);
  }

  public createMaintenancePipe(tx: number, ty: number, length: number, isVertical: boolean) {
    if (isVertical) {
      this.drawBox(tx + 0.4, ty, 0.2, length, 10, PALETTE.ORANGE, 0x8a3a00, 0x5a2a00, 0xffa500);
    } else {
      this.drawBox(tx, ty + 0.4, length, 0.2, 10, PALETTE.ORANGE, 0x8a3a00, 0x5a2a00, 0xffa500);
    }
  }

  public createVaultStructure(tx: number, ty: number) {
    this.drawBox(tx, ty, 4, 4, 40, 0x221c08, 0x161205, 0x0f0c03, PALETTE.GOLD);
    // Vault Door details
    const gfx = this.scene.add.graphics();
    const frontPos = this.toIso(tx + 2, ty + 4, 20);
    gfx.fillStyle(PALETTE.GOLD, 0.8);
    gfx.fillCircle(frontPos.x, frontPos.y, 15);
    gfx.lineStyle(2, 0xffffff, 0.8);
    gfx.strokeCircle(frontPos.x, frontPos.y, 10);
    this.container.add(gfx);
  }

  public createCentralLandmark(tx: number, ty: number) {
    // A large holographic projector base
    this.drawBox(tx, ty, 2, 2, 15, 0x112b45, 0x0a192b, 0x07111d, PALETTE.CYAN);
    // Hologram projection
    const gfx = this.scene.add.graphics();
    const topPos = this.toIso(tx + 1, ty + 1, 40);
    const botPos = this.toIso(tx + 1, ty + 1, 15);
    gfx.lineStyle(1, PALETTE.CYAN, 0.5);
    gfx.beginPath();
    gfx.moveTo(botPos.x, botPos.y);
    gfx.lineTo(topPos.x, topPos.y);
    gfx.strokePath();
    gfx.fillStyle(PALETTE.CYAN, 0.3);
    gfx.fillCircle(topPos.x, topPos.y, 25);
    this.container.add(gfx);
  }

  public createPillar(tx: number, ty: number) {
    this.drawBox(tx + 0.2, ty + 0.2, 0.6, 0.6, 60, 0x222222, 0x111111, 0x050505, PALETTE.CYAN_DIM);
  }

  public createSecurityScanner(tx: number, ty: number, isVertical: boolean = false) {
    if (isVertical) {
      this.drawBox(tx, ty + 0.2, 0.2, 0.6, 30, 0x112b45, 0x0a192b, 0x07111d, PALETTE.CYAN);
      this.drawBox(tx + 0.8, ty + 0.2, 0.2, 0.6, 30, 0x112b45, 0x0a192b, 0x07111d, PALETTE.CYAN);
    } else {
      this.drawBox(tx + 0.2, ty, 0.6, 0.2, 30, 0x112b45, 0x0a192b, 0x07111d, PALETTE.CYAN);
      this.drawBox(tx + 0.2, ty + 0.8, 0.6, 0.2, 30, 0x112b45, 0x0a192b, 0x07111d, PALETTE.CYAN);
    }
  }

  public createBench(tx: number, ty: number, isVertical: boolean = false) {
    if (isVertical) {
      this.drawBox(tx + 0.3, ty + 0.1, 0.4, 1.8, 10, 0x1a2332, 0x111622, 0x0a0f15, 0x3a4b60);
    } else {
      this.drawBox(tx + 0.1, ty + 0.3, 1.8, 0.4, 10, 0x1a2332, 0x111622, 0x0a0f15, 0x3a4b60);
    }
  }

  public createCoolingUnit(tx: number, ty: number) {
    this.drawBox(tx, ty, 1, 1, 40, 0x334455, 0x223344, 0x112233, PALETTE.CYAN_DIM);
    const gfx = this.scene.add.graphics();
    const pos = this.toIso(tx + 0.5, ty + 1, 35);
    gfx.fillStyle(0x00e5ff, 0.6);
    gfx.fillCircle(pos.x, pos.y, 4);
    this.container.add(gfx);
  }

  public createWallDisplay(tx: number, ty: number, isVertical: boolean = false) {
    // Thin box representing a screen on a wall
    if (isVertical) {
      this.drawBox(tx + 0.9, ty + 0.2, 0.1, 1.6, 25, 0x000000, 0x001122, PALETTE.CYAN, PALETTE.CYAN);
    } else {
      this.drawBox(tx + 0.2, ty + 0.9, 1.6, 0.1, 25, 0x000000, 0x001122, PALETTE.CYAN, PALETTE.CYAN);
    }
  }

  public createFilingCabinet(tx: number, ty: number) {
    this.drawBox(tx + 0.1, ty + 0.1, 0.8, 0.4, 25, 0x2a2a2a, 0x1a1a1a, 0x111111, 0x444444);
  }

  public createPlant(tx: number, ty: number) {
    // Pot
    this.drawBox(tx + 0.2, ty + 0.2, 0.6, 0.6, 10, 0x111111, 0x0a0a0a, 0x050505, 0x222222);
    // Plant leaves (synthetic/bioluminescent cyberpunk aesthetic)
    const gfx = this.scene.add.graphics();
    const pos = this.toIso(tx + 0.5, ty + 0.5, 20);
    gfx.fillStyle(THEME.cyan, 0.8);
    gfx.fillCircle(pos.x, pos.y, 8);
    gfx.fillCircle(pos.x - 5, pos.y + 5, 6);
    gfx.fillCircle(pos.x + 5, pos.y + 5, 6);
    gfx.fillCircle(pos.x, pos.y - 5, 6);
    this.container.add(gfx);
  }
}
