import Phaser from 'phaser';
import { PALETTE } from '../core/Constants';
import { MapManager } from '../maps/MapManager';
import { Player } from './Player';
import { TILE } from '../maps/MapConstants';
import { GameState } from '../core/GameState';
import { DOOR_STATE } from './Door';

export class CCTV {
  private scene: Phaser.Scene;
  private mapManager: MapManager;
  private player: Player;
  
  public gridX: number;
  public gridY: number;
  
  private container: Phaser.GameObjects.Container;
  private coneGraphics: Phaser.GameObjects.Graphics;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  
  private angle: number = 0; // 0 is right, 90 is down, 180 is left, 270 is up
  private sweepMin: number;
  private sweepMax: number;
  private sweepSpeed: number = 30; // degrees per second
  private sweepDir: number = 1;
  private fov: number = 60; // field of view in degrees
  private range: number = 6; // grid tiles
  
  // Iso constants
  private tileWidth = 64;
  private tileHeight = 32;
  private originX: number;
  private originY = 100;
  
  public isDetecting: boolean = false;

  constructor(scene: Phaser.Scene, mapManager: MapManager, player: Player, gx: number, gy: number, sweepMin: number, sweepMax: number) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.player = player;
    this.gridX = gx;
    this.gridY = gy;
    this.sweepMin = sweepMin;
    this.sweepMax = sweepMax;
    this.angle = sweepMin;
    
    this.originX = (this.mapManager.mapWidth * this.tileWidth) / 2;
    
    this.container = this.scene.add.container(0, 0);
    const pos = this.toIso(this.gridX + 0.5, this.gridY + 0.5);
    this.container.x = pos.x;
    this.container.y = pos.y - 40; // High up on the wall
    this.container.setDepth(25 + pos.y * 0.01);
    
    this.coneGraphics = this.scene.add.graphics();
    this.bodyGraphics = this.scene.add.graphics();
    
    this.container.add(this.coneGraphics);
    this.container.add(this.bodyGraphics);
    
    this.drawBody();
  }
  
  private toIso(tx: number, ty: number) {
    const isoX = this.originX + (tx - ty) * (this.tileWidth / 2);
    const isoY = this.originY + (tx + ty) * (this.tileHeight / 2);
    return { x: isoX, y: isoY };
  }

  private drawBody(): void {
    this.bodyGraphics.clear();
    // Wall mount
    this.bodyGraphics.fillStyle(0x111111, 1);
    this.bodyGraphics.fillRect(-6, -8, 12, 16);
    // Camera body
    this.bodyGraphics.fillStyle(0x1c2430, 1);
    this.bodyGraphics.fillRect(-5, -5, 10, 10);
    // Lens / Edge
    let color: number = PALETTE.CYAN;
    const state = GameState.getInstance().detectionState;
    if (state === 'SUSPICIOUS') color = PALETTE.ORANGE;
    if (state === 'SECURITY ALERT') color = 0xffa500;
    if (state === 'CRITICAL' || state === 'SECURITY CONTACT') color = PALETTE.RED;
    if (this.isDetecting || GameState.getInstance().isAlarmActive) color = PALETTE.RED;
    
    this.bodyGraphics.lineStyle(1, color, 0.8);
    this.bodyGraphics.strokeRect(-5, -5, 10, 10);
    // Lens glow
    this.bodyGraphics.fillStyle(color, 1);
    this.bodyGraphics.fillCircle(0, 0, 2);
  }

  public update(dt: number): void {
    // Sweep logic
    let currentSpeed = this.sweepSpeed;
    if (GameState.getInstance().securityEscalated) {
      currentSpeed = 45; // 1.5x speed
    }
    this.angle += currentSpeed * this.sweepDir * (dt / 1000);
    if (this.angle > this.sweepMax) {
      this.angle = this.sweepMax;
      this.sweepDir = -1;
    } else if (this.angle < this.sweepMin) {
      this.angle = this.sweepMin;
      this.sweepDir = 1;
    }
    
    this.checkDetection();
    this.drawBody(); // Redraw body to update lens color based on detection
    this.drawCone();
  }
  
  private checkDetection(): void {
    const dx = this.player.gridX - this.gridX;
    const dy = this.player.gridY - this.gridY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    this.isDetecting = false;
    
    let currentRange = this.range;
    if (this.player.isCrouching) currentRange *= 0.7;
    else if (this.player.isSprinting) currentRange *= 1.2;
    
    if (GameState.getInstance().securityEscalated) {
      currentRange *= 1.3;
    }
    
    if (dist <= currentRange) {
      // Check angle
      const targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
      // Normalize angles for comparison
      let diff = Math.abs(Phaser.Math.Angle.ShortestBetween(this.angle, targetAngle));
      
      if (diff <= this.fov / 2) {
        // In FOV, check line of sight
        if (this.hasLineOfSight(this.player.gridX, this.player.gridY)) {
          this.isDetecting = true;
        }
      }
    }
  }
  
  private hasLineOfSight(tx: number, ty: number): boolean {
    // Simple Bresenham or raycast on grid
    const x0 = Math.floor(this.gridX);
    const y0 = Math.floor(this.gridY);
    const x1 = Math.floor(tx);
    const y1 = Math.floor(ty);
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    
    let cx = x0;
    let cy = y0;
    
    while(true) {
      if (cx === x1 && cy === y1) break;
      
      if (cx >= 0 && cx < this.mapManager.mapWidth && cy >= 0 && cy < this.mapManager.mapHeight) {
        const tile = this.mapManager.getGrid()[cy][cx].tile;
        if (tile === TILE.WALL_NORMAL || tile === TILE.WALL_SECURITY || tile === TILE.WALL_REINFORCED || tile === TILE.EMPTY) {
          return false;
        }
        const door = this.mapManager.doors.find(d => d.gridX === cx && d.gridY === cy);
        if (door && door.state !== DOOR_STATE.OPEN) { 
          return false;
        }
      }
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
    return true;
  }

  private drawCone(): void {
    this.coneGraphics.clear();
    
    const state = GameState.getInstance().detectionState;
    let color: number = PALETTE.CYAN;
    if (state === 'SUSPICIOUS') color = PALETTE.ORANGE;
    if (state === 'SECURITY ALERT') color = 0xffa500;
    if (state === 'CRITICAL' || state === 'SECURITY CONTACT') color = PALETTE.RED;
    
    const isAlarm = GameState.getInstance().isAlarmActive;
    if (this.isDetecting || isAlarm) color = PALETTE.RED;
    
    const alpha = this.isDetecting ? 0.4 : 0.15;
    
    this.coneGraphics.fillStyle(color, alpha);
    this.coneGraphics.beginPath();
    
    // Origin is at CCTV container (0, 0)
    this.coneGraphics.moveTo(0, 0);
    
    // Draw polygon for FOV cone, mapping grid positions to Iso positions relative to CCTV
    const segments = 10;
    const startAngle = Phaser.Math.DegToRad(this.angle - this.fov / 2);
    const endAngle = Phaser.Math.DegToRad(this.angle + this.fov / 2);
    
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / segments);
      
      let currentRange = this.range;
      if (this.player.isCrouching) currentRange *= 0.7;
      else if (this.player.isSprinting) currentRange *= 1.2;
      
      const px = this.gridX + 0.5 + Math.cos(a) * currentRange;
      const py = this.gridY + 0.5 + Math.sin(a) * currentRange;
      
      const isoPos = this.toIso(px, py);
      
      // Convert to relative coords (container is at this.gridX, this.gridY)
      const baseIso = this.toIso(this.gridX + 0.5, this.gridY + 0.5);
      
      // The cone needs to reach the ground, so it goes down +40 y-units
      this.coneGraphics.lineTo(isoPos.x - baseIso.x, isoPos.y - baseIso.y + 40);
    }
    
    this.coneGraphics.lineTo(0, 0);
    this.coneGraphics.fillPath();
    
    // Outline
    this.coneGraphics.lineStyle(1, color, alpha * 2);
    this.coneGraphics.strokePath();
  }
}
