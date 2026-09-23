import Phaser from 'phaser';
import { THEME } from '../core/Constants';
import { MapManager } from '../maps/MapManager';
import { Player } from './Player';
import { Guard } from './Guard';
import { CCTV } from './CCTV';
import { GameState } from '../core/GameState';

export class Minimap {
  private scene: Phaser.Scene;
  private mapManager: MapManager;
  private player: Player;
  private guards: Guard[];
  private cctvs: CCTV[];
  
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  
  private size = 180;
  private padding = 10;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(scene: Phaser.Scene, mapManager: MapManager, player: Player, guards: Guard[], cctvs: CCTV[], hudContainer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.player = player;
    this.guards = guards;
    this.cctvs = cctvs;
    
    this.container = this.scene.add.container(
      this.scene.scale.width - this.size - this.padding, 
      this.scene.scale.height - this.size - this.padding
    );
    hudContainer.add(this.container);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.background, 0.95);
    bg.fillRect(0, 0, this.size, this.size);
    bg.lineStyle(1, THEME.uiBorder, 0.8);
    bg.strokeRect(0, 0, this.size, this.size);
    this.container.add(bg);
    
    this.container.add(this.scene.add.text(10, 10, 'TACTICAL MAP', { fontFamily: '"Orbitron", monospace', fontSize: '10px', color: '#00e5ff' }));
    
    this.graphics = this.scene.add.graphics();
    this.container.add(this.graphics);
    
    const grid = this.mapManager.getGrid();
    this.scale = this.size / Math.max(grid.length, grid[0].length) * 0.8;
    this.offsetX = 20;
    this.offsetY = 30;
    
    this.drawStaticMap();
  }

  private drawStaticMap(): void {
    const grid = this.mapManager.getGrid();
    
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell.tile === 0) continue;
        
        if (cell.tile === 1 || cell.tile === 4 || cell.tile === 6) { // Walls
          this.graphics.fillStyle(THEME.wall, 0.8);
        } else if (cell.tile === 3) {
          this.graphics.fillStyle(THEME.vault, 0.6); // Vault
        } else {
          this.graphics.fillStyle(THEME.floorSecondary, 0.5); // Floor
        }
        this.graphics.fillRect(this.offsetX + c * this.scale, this.offsetY + r * this.scale, this.scale, this.scale);
      }
    }
  }

  public update(): void {
    // We only need to redraw dynamic entities
    this.graphics.clear();
    this.drawStaticMap(); // For simplicity, redraw everything (could optimize with render texture)
    
    // Draw CCTVs
    this.graphics.fillStyle(THEME.cyan, 0.8);
    for (const c of this.cctvs) {
      this.graphics.fillCircle(this.offsetX + c.gridX * this.scale + this.scale/2, this.offsetY + c.gridY * this.scale + this.scale/2, 2);
    }
    
    // Draw Guards
    this.graphics.fillStyle(THEME.danger, 1);
    for (const g of this.guards) {
      this.graphics.fillCircle(this.offsetX + g.gridX * this.scale + this.scale/2, this.offsetY + g.gridY * this.scale + this.scale/2, 2.5);
    }
    
    // Draw Player
    this.graphics.fillStyle(THEME.cyan, 1);
    this.graphics.fillCircle(this.offsetX + this.player.gridX * this.scale + this.scale/2, this.offsetY + this.player.gridY * this.scale + this.scale/2, 3);
    
    // Draw Exit Markers
    const isEscalated = GameState.getInstance().securityEscalated;
    
    // Main Exit Marker (approx 3.5, 36)
    const mainX = this.offsetX + 3.5 * this.scale + this.scale/2;
    const mainY = this.offsetY + 36 * this.scale + this.scale/2;
    this.graphics.fillStyle(isEscalated ? 0xff3300 : 0x555555, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(mainX, mainY - 5);
    this.graphics.lineTo(mainX + 5, mainY);
    this.graphics.lineTo(mainX, mainY + 5);
    this.graphics.lineTo(mainX - 5, mainY);
    this.graphics.fillPath();
    
    // Maintenance Exit Marker (approx 33, 30)
    const servX = this.offsetX + 33 * this.scale + this.scale/2;
    const servY = this.offsetY + 30 * this.scale + this.scale/2;
    this.graphics.fillStyle(isEscalated ? 0xffa500 : 0x555555, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(servX, servY - 5);
    this.graphics.lineTo(servX + 5, servY);
    this.graphics.lineTo(servX, servY + 5);
    this.graphics.lineTo(servX - 5, servY);
    this.graphics.fillPath();
  }

  public resize(): void {
    this.container.setPosition(
      this.scene.scale.width - this.size - this.padding,
      this.scene.scale.height - this.size - this.padding
    );
  }
}
