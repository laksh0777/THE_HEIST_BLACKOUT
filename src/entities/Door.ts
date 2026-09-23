import Phaser from 'phaser';
import { THEME } from '../core/Constants';

export enum DOOR_STATE {
  CLOSED = 0,
  OPEN = 1,
  LOCKED = 2,
  KEYCARD = 3
}

export class Door {
  private scene: Phaser.Scene;
  public gridX: number;
  public gridY: number;
  public state: DOOR_STATE;
  public doorHeight: number = 30;
  
  private graphics: Phaser.GameObjects.Graphics;
  
  // Isometric settings (matched with MapManager)
  private tileWidth = 64;
  private tileHeight = 32;
  private originX: number;
  private originY = 100;
  private isVertical: boolean;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number, state: DOOR_STATE, isVertical: boolean, mapWidth: number = 40) {
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;
    this.state = state;
    this.isVertical = isVertical;
    this.originX = (mapWidth * this.tileWidth) / 2;
    
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(15); // Above floor, near walls
    
    this.render();
  }

  public open(): void {
    if (this.state === DOOR_STATE.CLOSED) {
      this.state = DOOR_STATE.OPEN;
      this.scene.tweens.add({
        targets: this,
        doorHeight: 0,
        duration: 200,
        onUpdate: () => this.render()
      });
    }
  }

  public close(): void {
    if (this.state === DOOR_STATE.OPEN) {
      this.state = DOOR_STATE.CLOSED;
      this.scene.tweens.add({
        targets: this,
        doorHeight: 30,
        duration: 200,
        onUpdate: () => this.render()
      });
    }
  }

  public unlock(): void {
    if (this.state === DOOR_STATE.LOCKED) {
      this.state = DOOR_STATE.CLOSED;
      this.doorHeight = 30;
      this.render();
    }
  }

  private toIso(tx: number, ty: number) {
    const isoX = this.originX + (tx - ty) * (this.tileWidth / 2);
    const isoY = this.originY + (tx + ty) * (this.tileHeight / 2);
    return { x: isoX, y: isoY };
  }

  private render(): void {
    this.graphics.clear();
    
    // Base tile points
    const pt0 = this.toIso(this.gridX, this.gridY);
    const pt1 = this.toIso(this.gridX + 1, this.gridY);
    const pt2 = this.toIso(this.gridX + 1, this.gridY + 1);
    const pt3 = this.toIso(this.gridX, this.gridY + 1);

    if (this.state === DOOR_STATE.OPEN && this.doorHeight <= 0) {
      // Draw a subtle floor indicator for open door
      this.graphics.fillStyle(THEME.cyan, 0.2);
      this.graphics.fillPoints([pt0, pt1, pt2, pt3], true);
      return;
    }

    const h = this.doorHeight; // Door height
    
    let doorColor: number = THEME.steel;
    let outlineColor: number = THEME.cyan;
    
    if (this.state === DOOR_STATE.LOCKED) {
      doorColor = THEME.uiPanel;
      outlineColor = THEME.danger;
    } else if (this.state === DOOR_STATE.KEYCARD) {
      doorColor = THEME.background;
      outlineColor = THEME.warning;
    }

    // Depending on orientation, draw the door as a thin wall
    if (this.isVertical) {
      // Door along Y axis (left face visible)
      this.graphics.fillStyle(doorColor, 0.9);
      this.graphics.fillPoints([
        {x: pt3.x, y: pt3.y}, 
        {x: pt0.x, y: pt0.y}, 
        {x: pt0.x, y: pt0.y - h}, 
        {x: pt3.x, y: pt3.y - h}
      ], true);
      this.graphics.lineStyle(2, outlineColor, 0.8);
      this.graphics.strokePoints([
        {x: pt3.x, y: pt3.y}, 
        {x: pt0.x, y: pt0.y}, 
        {x: pt0.x, y: pt0.y - h}, 
        {x: pt3.x, y: pt3.y - h}
      ], true);
    } else {
      // Door along X axis (right face visible)
      this.graphics.fillStyle(doorColor, 0.9);
      this.graphics.fillPoints([
        {x: pt2.x, y: pt2.y}, 
        {x: pt3.x, y: pt3.y}, 
        {x: pt3.x, y: pt3.y - h}, 
        {x: pt2.x, y: pt2.y - h}
      ], true);
      this.graphics.lineStyle(2, outlineColor, 0.8);
      this.graphics.strokePoints([
        {x: pt2.x, y: pt2.y}, 
        {x: pt3.x, y: pt3.y}, 
        {x: pt3.x, y: pt3.y - h}, 
        {x: pt2.x, y: pt2.y - h}
      ], true);
    }
    
    // Draw lock indicator
    if (this.state === DOOR_STATE.LOCKED) {
      const cx = this.isVertical ? (pt3.x + pt0.x) / 2 : (pt2.x + pt3.x) / 2;
      const cy = (this.isVertical ? (pt3.y + pt0.y) / 2 : (pt2.y + pt3.y) / 2) - h / 2;
      this.graphics.fillStyle(THEME.danger, 1);
      this.graphics.fillCircle(cx, cy, 4);
    } else if (this.state === DOOR_STATE.KEYCARD) {
      const cx = this.isVertical ? (pt3.x + pt0.x) / 2 : (pt2.x + pt3.x) / 2;
      const cy = (this.isVertical ? (pt3.y + pt0.y) / 2 : (pt2.y + pt3.y) / 2) - h / 2;
      this.graphics.fillStyle(THEME.warning, 1);
      this.graphics.fillRect(cx - 3, cy - 4, 6, 8); // Reader box
    } else {
      const cx = this.isVertical ? (pt3.x + pt0.x) / 2 : (pt2.x + pt3.x) / 2;
      const cy = (this.isVertical ? (pt3.y + pt0.y) / 2 : (pt2.y + pt3.y) / 2) - h / 2;
      this.graphics.fillStyle(THEME.cyan, 1);
      this.graphics.fillCircle(cx, cy, 3);
    }
  }
}
