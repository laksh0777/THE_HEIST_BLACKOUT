import Phaser from 'phaser';
import { PALETTE, THEME } from '../core/Constants';
import { TILE, ROOM, GridCell } from './MapConstants';
import { Door, DOOR_STATE } from '../entities/Door';
import { PropFactory } from './PropFactory';
import { GameState } from '../core/GameState';

export class MapManager {
  private scene: Phaser.Scene;
  private mapGraphics: Phaser.GameObjects.Graphics;
  private wallGraphics: Phaser.GameObjects.Graphics;
  
  public tileWidth = 64;
  public tileHeight = 32;
  private wallHeight = 40;

  // Map Data
  public mapWidth = 40;
  public mapHeight = 40;
  private grid: GridCell[][] = [];
  
  public doors: Door[] = [];
  public propFactory!: PropFactory;
  public playerSpawn: { x: number, y: number } = { x: 0, y: 0 };
  
  public debugCollision: boolean = false;
  private debugGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mapGraphics = this.scene.add.graphics();
    this.wallGraphics = this.scene.add.graphics();
    this.wallGraphics.setDepth(10); // walls above floor
    
    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.setDepth(20);
    
    this.propFactory = new PropFactory(this.scene, this.mapWidth);
    
    this.scene.input.keyboard!.on('keydown-O', () => {
      this.debugCollision = !this.debugCollision;
      const state = GameState.getInstance();
      state.debugMode = this.debugCollision;
      
      if (this.debugCollision) {
        this.renderDebugCollision();
      } else {
        this.debugGraphics.clear();
      }
    });
    
    this.generateBlackoutHQ();
  }

  private generateBlackoutHQ(): void {
    // Set spawn point inside ENTRY LOBBY
    this.playerSpawn = { x: 8, y: 33 };

    // Initialize empty grid
    for (let y = 0; y < this.mapHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        this.grid[y][x] = { tile: TILE.EMPTY, room: ROOM.NONE };
      }
    }

    // Helper to draw a room
    const addRoom = (rx: number, ry: number, rw: number, rh: number, room: ROOM, floorType: TILE = TILE.FLOOR_NORMAL, wallType: TILE = TILE.WALL_NORMAL) => {
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          if (x === rx || x === rx + rw - 1 || y === ry || y === ry + rh - 1) {
            // Walls, but don't overwrite if it's already floor (simple carving)
            if (this.grid[y][x].tile === TILE.EMPTY || this.grid[y][x].tile === TILE.WALL_NORMAL || this.grid[y][x].tile === TILE.WALL_SECURITY || this.grid[y][x].tile === TILE.WALL_REINFORCED) {
              // Only apply wall if it isn't overwriting an existing floor
              if (this.grid[y][x].tile === TILE.EMPTY || wallType > this.grid[y][x].tile) {
                 this.grid[y][x] = { tile: wallType, room: room };
              }
            }
          } else {
            this.grid[y][x] = { tile: floorType, room: room };
          }
        }
      }
    };

    // Helper to carve doors
    const addDoor = (dx: number, dy: number, room: ROOM, state: DOOR_STATE = DOOR_STATE.CLOSED, floorType: TILE = TILE.FLOOR_NORMAL) => {
      if (dx >= 0 && dx < this.mapWidth && dy >= 0 && dy < this.mapHeight) {
        this.grid[dy][dx] = { tile: floorType, room: room };
        // Determine orientation based on adjacent walls
        let isVertical = false;
        if (dx > 0 && dx < this.mapWidth - 1) {
           const left = this.grid[dy][dx-1].tile;
           const right = this.grid[dy][dx+1].tile;
           if (left === TILE.WALL_NORMAL || left === TILE.WALL_SECURITY || left === TILE.WALL_REINFORCED ||
               right === TILE.WALL_NORMAL || right === TILE.WALL_SECURITY || right === TILE.WALL_REINFORCED) {
              isVertical = true;
           }
        }
        
        const door = new Door(this.scene, dx, dy, state, isVertical, this.mapWidth);
        this.doors.push(door);
      }
    };

    // --- MAP LAYOUT ---
    
    // OUTER LAYER
    addRoom(4, 30, 8, 6, ROOM.ENTRY_LOBBY, TILE.FLOOR_NORMAL);
    addRoom(4, 22, 11, 9, ROOM.RECEPTION, TILE.FLOOR_NORMAL);
    addRoom(22, 28, 9, 10, ROOM.MAINTENANCE, TILE.FLOOR_MAINTENANCE);
    
    // MIDDLE LAYER
    addRoom(2, 6, 13, 17, ROOM.OFFICE_AREA, TILE.FLOOR_OFFICE);
    addRoom(14, 14, 11, 17, ROOM.CENTRAL_HALL, TILE.FLOOR_NORMAL);
    addRoom(24, 16, 12, 13, ROOM.STORAGE, TILE.FLOOR_STORAGE);

    // SECURITY LAYER
    addRoom(14, 6, 11, 9, ROOM.SERVER_ROOM, TILE.FLOOR_SECURITY, TILE.WALL_SECURITY);
    addRoom(24, 6, 10, 11, ROOM.SECURITY_ROOM, TILE.FLOOR_SECURITY, TILE.WALL_SECURITY);
    addRoom(10, 2, 24, 5, ROOM.RESTRICTED_CORRIDOR, TILE.FLOOR_SECURITY, TILE.WALL_SECURITY);
    
    // INNER LAYER
    addRoom(16, 0, 10, 3, ROOM.VAULT, TILE.FLOOR_VAULT, TILE.WALL_REINFORCED);
    
    // EXITS
    addRoom(2, 34, 3, 4, ROOM.MAIN_EXIT, TILE.FLOOR_NORMAL);
    addRoom(30, 28, 6, 4, ROOM.SERVICE_EXIT, TILE.FLOOR_MAINTENANCE);

    // --- DOORS / ROUTES ---

    // Entry to Main Exit
    addDoor(4, 35, ROOM.ENTRY_LOBBY);
    
    // Entry Lobby to Reception
    addDoor(7, 30, ROOM.RECEPTION);
    addDoor(8, 30, ROOM.RECEPTION);

    // Reception to Central Hall
    addDoor(14, 25, ROOM.CENTRAL_HALL);
    addDoor(14, 26, ROOM.CENTRAL_HALL);

    // Central Hall to Office
    addDoor(14, 18, ROOM.OFFICE_AREA);
    addDoor(14, 19, ROOM.OFFICE_AREA);
    
    // Central Hall to Storage
    addDoor(24, 20, ROOM.STORAGE);
    addDoor(24, 21, ROOM.STORAGE);
    
    // Storage to Maintenance
    addDoor(26, 28, ROOM.MAINTENANCE);

    // Maintenance to Service Exit
    addDoor(30, 29, ROOM.SERVICE_EXIT);
    addDoor(30, 30, ROOM.SERVICE_EXIT);

    // Storage to Security Room
    addDoor(28, 16, ROOM.SECURITY_ROOM, DOOR_STATE.LOCKED, TILE.FLOOR_SECURITY);
    
    // Central Hall to Server Room
    addDoor(18, 14, ROOM.SERVER_ROOM, DOOR_STATE.CLOSED, TILE.FLOOR_SECURITY);
    addDoor(19, 14, ROOM.SERVER_ROOM, DOOR_STATE.CLOSED, TILE.FLOOR_SECURITY);

    // Server Room to Security Room
    addDoor(24, 10, ROOM.SECURITY_ROOM, DOOR_STATE.CLOSED, TILE.FLOOR_SECURITY);
    addDoor(24, 11, ROOM.SECURITY_ROOM, DOOR_STATE.CLOSED, TILE.FLOOR_SECURITY);

    // Server Room to Restricted Corridor
    addDoor(18, 6, ROOM.RESTRICTED_CORRIDOR, DOOR_STATE.CLOSED, TILE.FLOOR_SECURITY);
    addDoor(20, 6, ROOM.RESTRICTED_CORRIDOR, DOOR_STATE.CLOSED, TILE.FLOOR_SECURITY);
    
    // Security Room to Restricted Corridor
    addDoor(28, 6, ROOM.RESTRICTED_CORRIDOR, DOOR_STATE.CLOSED, TILE.FLOOR_SECURITY);

    // Restricted Corridor to Vault
    addDoor(20, 2, ROOM.VAULT, DOOR_STATE.LOCKED, TILE.FLOOR_VAULT);
    addDoor(21, 2, ROOM.VAULT, DOOR_STATE.LOCKED, TILE.FLOOR_VAULT);
    
    // Office to Restricted Corridor
    addDoor(10, 6, ROOM.RESTRICTED_CORRIDOR, DOOR_STATE.LOCKED, TILE.FLOOR_SECURITY);

    this.populateProps();
    this.renderMap();
    if (this.debugCollision) this.renderDebugCollision();
    this.renderRoomLabels();
    this.renderVaultLandmark();
  }
  
  private renderVaultLandmark(): void {
    const originX = (this.mapWidth * this.tileWidth) / 2;
    const originY = 100;
    
    const toIso = (tx: number, ty: number) => {
      const isoX = originX + (tx - ty) * (this.tileWidth / 2);
      const isoY = originY + (tx + ty) * (this.tileHeight / 2);
      return { x: isoX, y: isoY };
    };
    
    const g = this.scene.add.graphics();
    g.setDepth(22);
    
    // Vault entrance glowing frame (drawn as isometric arch above door tiles 20,2 and 21,2)
    const left = toIso(20, 2);
    const right = toIso(22, 2);
    const midX = (left.x + right.x) / 2;
    const midY = (left.y + right.y) / 2;
    const h = 50;
    
    // Glowing amber border around vault entrance
    g.lineStyle(3, 0xffd700, 0.9);
    g.strokeRect(midX - 36, midY - h - 10, 72, h + 10);
    
    // Corner accents
    g.lineStyle(2, 0xff6b00, 1);
    g.lineBetween(midX - 36, midY - h - 10, midX - 26, midY - h - 10);
    g.lineBetween(midX + 36, midY - h - 10, midX + 26, midY - h - 10);
    g.lineBetween(midX - 36, midY, midX - 26, midY);
    g.lineBetween(midX + 36, midY, midX + 26, midY);
    
    // Security panel indicators (left of vault)
    const panel = toIso(19.5, 2.5);
    g.fillStyle(0x111111, 1);
    g.fillRect(panel.x - 6, panel.y - 28, 12, 20);
    g.lineStyle(1, 0xffd700, 1);
    g.strokeRect(panel.x - 6, panel.y - 28, 12, 20);
    
    // Locked indicator — red dot
    g.fillStyle(0xff1744, 1);
    g.fillCircle(panel.x, panel.y - 20, 3);
    g.fillStyle(0xff6b00, 0.5);
    g.fillCircle(panel.x, panel.y - 12, 2);
    
    // "VAULT" label
    this.scene.add.text(midX, midY - h - 20, 'VAULT', {
      fontFamily: '"Orbitron", monospace',
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(23).setAlpha(0.85);
    
    // Small "LOCKED" sub-label
    this.scene.add.text(midX, midY - h - 4, '[ LOCKED ]', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '9px',
      color: '#ff1744'
    }).setOrigin(0.5).setDepth(23).setAlpha(0.9);
  }


  private populateProps(): void {
    // Populate Entry Lobby
    this.propFactory.createBench(5, 33, false);
    this.propFactory.createBench(11, 33, false);
    this.propFactory.createWallDisplay(4, 32, true);

    // Populate Reception
    this.propFactory.createReceptionDesk(6, 26);
    this.propFactory.createPillar(11, 24);
    this.propFactory.createPillar(11, 27);
    this.propFactory.createSecurityScanner(7, 28, false);
    this.propFactory.createSecurityScanner(9, 28, false);
    this.propFactory.createPlant(5, 29);
    this.propFactory.createPlant(13, 29);
    this.propFactory.createBench(6, 23, true);

    // Populate Office Area
    this.propFactory.createDesk(3, 11);
    this.propFactory.createFilingCabinet(4, 10);
    this.propFactory.createDesk(6, 11);
    this.propFactory.createDesk(9, 11);
    this.propFactory.createDesk(3, 15);
    this.propFactory.createDesk(6, 15);
    this.propFactory.createDesk(9, 15);
    this.propFactory.createDesk(3, 19);
    this.propFactory.createFilingCabinet(4, 20);
    this.propFactory.createDesk(6, 19);
    this.propFactory.createDesk(9, 19);
    this.propFactory.createPlant(2, 10);
    this.propFactory.createPlant(12, 10);
    this.propFactory.createPlant(2, 21);
    this.propFactory.createPlant(12, 21);

    // Populate Server Room
    this.propFactory.createServerRack(15, 7);
    this.propFactory.createServerRack(17, 7);
    this.propFactory.createServerRack(19, 7);
    this.propFactory.createServerRack(21, 7);
    this.propFactory.createServerRack(15, 10);
    this.propFactory.createServerRack(17, 10);
    this.propFactory.createServerRack(19, 10);
    this.propFactory.createServerRack(21, 10);
    this.propFactory.createCoolingUnit(14, 6);
    this.propFactory.createCoolingUnit(22, 6);

    // Populate Security Room
    this.propFactory.createSecurityConsole(28, 9);
    this.propFactory.createSecurityConsole(28, 12);
    this.propFactory.createDesk(31, 9);
    this.propFactory.createDesk(31, 12);
    this.propFactory.createWallDisplay(33, 10, true);

    // Populate Storage
    this.propFactory.createStorageCrate(25, 17);
    this.propFactory.createStorageCrate(27, 17);
    this.propFactory.createStorageCrate(29, 17);
    this.propFactory.createStorageCrate(25, 20);
    this.propFactory.createStorageCrate(27, 20);
    this.propFactory.createStorageCrate(29, 20);
    this.propFactory.createStorageCrate(25, 23);
    this.propFactory.createStorageCrate(27, 23);
    this.propFactory.createStorageCrate(32, 23);

    // Populate Central Hall
    this.propFactory.createCentralLandmark(18, 20);
    this.propFactory.createPillar(15, 15);
    this.propFactory.createPillar(22, 15);
    this.propFactory.createPillar(15, 28);
    this.propFactory.createPillar(22, 28);
    this.propFactory.createBench(17, 25, false);
    this.propFactory.createBench(21, 25, false);
    this.propFactory.createPlant(14, 14);
    this.propFactory.createPlant(23, 14);
    this.propFactory.createPlant(14, 29);
    this.propFactory.createPlant(23, 29);

    // Populate Maintenance
    this.propFactory.createMaintenancePipe(23, 29, 4, false);
    this.propFactory.createMaintenancePipe(23, 31, 6, false);
    this.propFactory.createStorageCrate(28, 30);
    this.propFactory.createStorageCrate(28, 32);
    this.propFactory.createCoolingUnit(23, 33);

    // Populate Vault
    this.propFactory.createVaultStructure(19, 3);
  }

  private renderMap(): void {
    this.mapGraphics.clear();
    this.wallGraphics.clear();

    const originX = (this.mapWidth * this.tileWidth) / 2;
    const originY = 100; // offset down

    const toIso = (tx: number, ty: number) => {
      const isoX = originX + (tx - ty) * (this.tileWidth / 2);
      const isoY = originY + (tx + ty) * (this.tileHeight / 2);
      return { x: isoX, y: isoY };
    };

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const cell = this.grid[y][x];
        const tile = cell.tile;
        if (tile === TILE.EMPTY) continue;

        const pt0 = toIso(x, y);
        const pt1 = toIso(x + 1, y);
        const pt2 = toIso(x + 1, y + 1);
        const pt3 = toIso(x, y + 1);

        // Render Floor
        if (tile === TILE.FLOOR_NORMAL || tile === TILE.FLOOR_VAULT || tile === TILE.FLOOR_SECURITY || 
            tile === TILE.FLOOR_OFFICE || tile === TILE.FLOOR_MAINTENANCE || tile === TILE.FLOOR_STORAGE) {
          
          let color: number = THEME.floorSecondary;
          if (tile === TILE.FLOOR_VAULT) color = THEME.vault;
          if (tile === TILE.FLOOR_SECURITY) color = THEME.floor;
          if (tile === TILE.FLOOR_OFFICE) color = THEME.floorSecondary;
          if (tile === TILE.FLOOR_MAINTENANCE) color = THEME.background;
          if (tile === TILE.FLOOR_STORAGE) color = THEME.uiPanel;

          this.mapGraphics.fillStyle(color, 1);
          this.mapGraphics.fillPoints([pt0, pt1, pt2, pt3], true);
          this.mapGraphics.lineStyle(1, THEME.mutedText, 0.15); // Subtle metal seam
          this.mapGraphics.strokePoints([pt0, pt1, pt2, pt3], true);
        } 
        
        // Render Wall
        else if (tile === TILE.WALL_NORMAL || tile === TILE.WALL_SECURITY || tile === TILE.WALL_REINFORCED) {
          const h = this.wallHeight;
          
          let topColor: number = THEME.steel;
          let leftColor: number = THEME.floor;
          let rightColor: number = THEME.background;
          let lineColor: number = THEME.cyan;
          
          if (tile === TILE.WALL_SECURITY) {
            topColor = THEME.uiPanel;
            leftColor = THEME.floorSecondary;
            rightColor = THEME.background;
            lineColor = THEME.danger;
          } else if (tile === TILE.WALL_REINFORCED) {
            topColor = THEME.background;
            leftColor = THEME.uiPanel;
            rightColor = THEME.background;
            lineColor = THEME.vault;
          }

          // Top face
          this.wallGraphics.fillStyle(topColor, 1);
          this.wallGraphics.fillPoints([
            {x: pt0.x, y: pt0.y - h}, 
            {x: pt1.x, y: pt1.y - h}, 
            {x: pt2.x, y: pt2.y - h}, 
            {x: pt3.x, y: pt3.y - h}
          ], true);
          this.wallGraphics.lineStyle(1, lineColor, 0.5);
          this.wallGraphics.strokePoints([
            {x: pt0.x, y: pt0.y - h}, 
            {x: pt1.x, y: pt1.y - h}, 
            {x: pt2.x, y: pt2.y - h}, 
            {x: pt3.x, y: pt3.y - h}
          ], true);

          // Left face (if exposed)
          if (x === 0 || (this.grid[y][x-1].tile !== TILE.WALL_NORMAL && this.grid[y][x-1].tile !== TILE.WALL_SECURITY && this.grid[y][x-1].tile !== TILE.WALL_REINFORCED)) {
            this.wallGraphics.fillStyle(leftColor, 1);
            this.wallGraphics.fillPoints([
              {x: pt3.x, y: pt3.y}, 
              {x: pt0.x, y: pt0.y}, 
              {x: pt0.x, y: pt0.y - h}, 
              {x: pt3.x, y: pt3.y - h}
            ], true);
            this.wallGraphics.lineStyle(1, PALETTE.CYAN_DIM, 0.4);
            this.wallGraphics.strokePoints([
              {x: pt3.x, y: pt3.y}, 
              {x: pt0.x, y: pt0.y}, 
              {x: pt0.x, y: pt0.y - h}, 
              {x: pt3.x, y: pt3.y - h}
            ], true);
          }

          // Right face (if exposed)
          if (y === this.mapHeight - 1 || (this.grid[y+1][x].tile !== TILE.WALL_NORMAL && this.grid[y+1][x].tile !== TILE.WALL_SECURITY && this.grid[y+1][x].tile !== TILE.WALL_REINFORCED)) {
            this.wallGraphics.fillStyle(rightColor, 1);
            this.wallGraphics.fillPoints([
              {x: pt2.x, y: pt2.y}, 
              {x: pt3.x, y: pt3.y}, 
              {x: pt3.x, y: pt3.y - h}, 
              {x: pt2.x, y: pt2.y - h}
            ], true);
            this.wallGraphics.lineStyle(1, PALETTE.CYAN_DIM, 0.4);
            this.wallGraphics.strokePoints([
              {x: pt2.x, y: pt2.y}, 
              {x: pt3.x, y: pt3.y}, 
              {x: pt3.x, y: pt3.y - h}, 
              {x: pt2.x, y: pt2.y - h}
            ], true);
          }
        }
      }
    }
  }

  public getGrid(): GridCell[][] {
    return this.grid;
  }

  public getMapBounds(): { minX: number, minY: number, maxX: number, maxY: number } {
    const originX = (this.mapWidth * this.tileWidth) / 2;
    const originY = 100;
    
    // Extrema of the isometric diamond (entire map)
    const minX = originX - (this.mapHeight * (this.tileWidth / 2));
    const maxX = originX + (this.mapWidth * (this.tileWidth / 2));
    const minY = originY;
    const maxY = originY + ((this.mapWidth + this.mapHeight) * (this.tileHeight / 2));
    
    return { minX, minY, maxX, maxY };
  }
  
  private renderRoomLabels(): void {
    const originX = (this.mapWidth * this.tileWidth) / 2;
    const originY = 100;

    const toIso = (tx: number, ty: number) => {
      const isoX = originX + (tx - ty) * (this.tileWidth / 2);
      const isoY = originY + (tx + ty) * (this.tileHeight / 2);
      return { x: isoX, y: isoY };
    };

    const addLabel = (tx: number, ty: number, text: string) => {
      const pos = toIso(tx, ty);
      this.scene.add.text(pos.x, pos.y, text, { 
        fontFamily: '"Orbitron", monospace', 
        fontSize: '20px', 
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(5).setAlpha(0.15); // Below walls but visible on floor
    };

    addLabel(8, 33, 'ENTRY LOBBY');
    addLabel(9, 26, 'RECEPTION');
    addLabel(19, 22, 'CENTRAL HALL');
    addLabel(8, 16, 'OFFICE AREA');
    addLabel(30, 22, 'STORAGE');
    addLabel(26, 33, 'MAINTENANCE');
    addLabel(19, 10, 'SERVER ROOM');
    addLabel(29, 12, 'SECURITY ROOM');
    addLabel(21, 4, 'RESTRICTED CORRIDOR');
    addLabel(21, -1, 'VAULT');
  }

  private renderDebugCollision(): void {
    this.debugGraphics.clear();
    const originX = (this.mapWidth * this.tileWidth) / 2;
    const originY = 100;

    const toIso = (tx: number, ty: number) => {
      const isoX = originX + (tx - ty) * (this.tileWidth / 2);
      const isoY = originY + (tx + ty) * (this.tileHeight / 2);
      return { x: isoX, y: isoY };
    };

    // Draw the exact authoritative bounding box: x in (17, 25), y in (1, 2)
    const pt0 = toIso(17, 1);
    const pt1 = toIso(25, 1);
    const pt2 = toIso(25, 2);
    const pt3 = toIso(17, 2);
    
    this.debugGraphics.fillStyle(0xff0000, 0.3);
    this.debugGraphics.fillPoints([pt0, pt1, pt2, pt3], true);
    this.debugGraphics.lineStyle(2, 0xff0000, 0.8);
    this.debugGraphics.strokePoints([pt0, pt1, pt2, pt3], true);

    // Add exclusion zone label
    const center = toIso(21, 1.5); // Vault center
    this.scene.add.text(center.x, center.y, 'GUARD EXCLUSION ZONE', {
      fontFamily: '"Orbitron", monospace',
      fontSize: '18px',
      color: '#ff0000',
      fontStyle: 'bold',
      backgroundColor: '#000000'
    }).setOrigin(0.5).setDepth(25);
  }
}
