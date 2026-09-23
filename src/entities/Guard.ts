import Phaser from 'phaser';
import { PALETTE } from '../core/Constants';
import { MapManager } from '../maps/MapManager';
import { Player } from './Player';
import { TILE, ROOM } from '../maps/MapConstants';
import { GameState } from '../core/GameState';
import { DOOR_STATE } from './Door';

export enum GUARD_STATE {
  PATROL = 0,
  SUSPICIOUS = 1,
  INVESTIGATE = 2,
  SEARCH = 3,
  CHASE = 4,
  RETURN = 5,
  VAULT_CONTAINMENT = 6
}

export class Guard {
  private scene: Phaser.Scene;
  private mapManager: MapManager;
  private player: Player;
  private gameState: GameState;
  
  public gridX: number;
  public gridY: number;
  
  private container: Phaser.GameObjects.Container;
  private coneGraphics: Phaser.GameObjects.Graphics;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private stateText: Phaser.GameObjects.Text;
  
  private angle: number = 0;
  private fov: number = 70;
  private baseRange: number = 7;
  // VAULT_GUARD_DETECTION_RANGE_MULTIPLIER: set to < 1.0 for vault-area guards
  private detectionRangeMultiplier: number = 1.0;
  
  private patrolPath: {x: number, y: number}[];
  private currentWaypoint: number = 0;
  private patrolSpeed: number = 2.0;
  private chaseSpeed: number = 4.0;
  private waitTime: number = 0;
  
  private state: GUARD_STATE = GUARD_STATE.PATROL;
  private lastKnownPlayerPos: {x: number, y: number} | null = null;
  public containmentTimeRemaining: number = 0;
  private lastValidPositionOutsideVault: {x: number, y: number};
  
  private tileWidth = 64;
  private tileHeight = 32;
  private originX: number;
  private originY = 100;
  
  public isDetecting: boolean = false;
  
  public get currentState(): GUARD_STATE {
    return this.state;
  }

  /** Set to 0.55 for vault-area guards (SERVER/SECURITY/RESTRICTED) */
  public setDetectionRangeMultiplier(multiplier: number): void {
    this.detectionRangeMultiplier = multiplier;
  }

  constructor(scene: Phaser.Scene, mapManager: MapManager, player: Player, startX: number, startY: number, path: {x: number, y: number}[]) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.player = player;
    this.gameState = GameState.getInstance();
    this.gridX = startX + 0.5;
    this.gridY = startY + 0.5;
    this.patrolPath = path;
    this.lastValidPositionOutsideVault = { x: this.gridX, y: this.gridY };
    
    this.originX = (this.mapManager.mapWidth * this.tileWidth) / 2;
    
    this.container = this.scene.add.container(0, 0);
    this.coneGraphics = this.scene.add.graphics();
    this.bodyGraphics = this.scene.add.graphics();
    
    this.container.add(this.coneGraphics);
    this.container.add(this.bodyGraphics);
    
    this.stateText = this.scene.add.text(0, -40, '', {
      fontFamily: '"Orbitron", monospace',
      fontSize: '12px',
      color: '#ff0000',
      backgroundColor: '#000000'
    }).setOrigin(0.5).setVisible(false);
    this.container.add(this.stateText);
    
    this.drawBody();
    this.updatePosition();
    
    if (this.patrolPath.length > 1) {
      this.facePoint(this.patrolPath[this.currentWaypoint].x + 0.5, this.patrolPath[this.currentWaypoint].y + 0.5);
    }
  }
  
  private toIso(tx: number, ty: number) {
    const isoX = this.originX + (tx - ty) * (this.tileWidth / 2);
    const isoY = this.originY + (tx + ty) * (this.tileHeight / 2);
    return { x: isoX, y: isoY };
  }

  private drawBody(): void {
    this.bodyGraphics.clear();
    this.bodyGraphics.fillStyle(0x000000, 0.5);
    this.bodyGraphics.fillEllipse(0, 0, 26, 14); // Soft shadow
    
    // Dark tactical body
    this.bodyGraphics.fillStyle(0x1a1a1a, 1);
    this.bodyGraphics.fillPoints([{x: -9, y: 0}, {x: 9, y: 0}, {x: 7, y: -26}, {x: -7, y: -26}], true);
    
    // Determine state color
    let stateColor: number = PALETTE.CYAN_DIM;
    if (this.state === GUARD_STATE.RETURN) stateColor = PALETTE.CYAN;
    if (this.state === GUARD_STATE.INVESTIGATE || this.state === GUARD_STATE.SEARCH || this.state === GUARD_STATE.SUSPICIOUS) stateColor = PALETTE.ORANGE;
    if (this.gameState.detectionState === 'SUSPICIOUS') stateColor = PALETTE.ORANGE;
    if (this.gameState.detectionState === 'SECURITY ALERT') stateColor = 0xffa500; // Deep Orange
    if (this.gameState.detectionState === 'CRITICAL') stateColor = PALETTE.RED;
    if (this.state === GUARD_STATE.CHASE) stateColor = PALETTE.RED;
    if (this.isDetecting) stateColor = PALETTE.RED;
    
    this.bodyGraphics.lineStyle(1, stateColor, 0.8);
    this.bodyGraphics.strokePoints([{x: -9, y: 0}, {x: 9, y: 0}, {x: 7, y: -26}, {x: -7, y: -26}], true);
    
    // Head (dark helmet)
    this.bodyGraphics.fillStyle(0x0a1018, 1);
    this.bodyGraphics.fillCircle(0, -32, 9);
    
    // Indicator light
    this.bodyGraphics.fillStyle(stateColor, 1);
    this.bodyGraphics.fillCircle(4, -34, 3);
  }

  private updatePosition(): void {
    const pos = this.toIso(this.gridX, this.gridY);
    this.container.x = pos.x;
    this.container.y = pos.y;
    this.container.setDepth(30 + pos.y * 0.01);
  }

  private facePoint(tx: number, ty: number): void {
    const dx = tx - this.gridX;
    const dy = ty - this.gridY;
    this.angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
  }

  public receiveSecurityReport(px: number, py: number): void {
    if (this.state === GUARD_STATE.CHASE) return;
    let target = { x: px, y: py };
    if (this.getVaultExclusionRect().contains(px, py)) {
        target = { x: 20.5, y: 2.5 };
    }
    this.lastKnownPlayerPos = target;
    this.state = GUARD_STATE.INVESTIGATE;
  }

  public update(dt: number): void {
    const vaultContainmentMode = (this.player.currentRoom === ROOM.VAULT);
    const distToVaultEntrance = Phaser.Math.Distance.Between(this.gridX, this.gridY, 20.5, 2.5);
    const isVaultAreaGuard = distToVaultEntrance < 12.0;

    // =====================================================================
    // 5. GUARDS ALREADY INSIDE -> MOVE OUTSIDE IMMEDIATELY (GLOBAL RULE)
    // =====================================================================
    if (this.isGuardInsideVault(this.gridX, this.gridY)) {
        this.gridX = 20.5;
        this.gridY = 3.0;
        this.updatePosition();
    }

    // =====================================================================
    // 1. ABSOLUTE LOOTING RULE (HIGHEST PRIORITY - ALL GUARDS)
    // =====================================================================
    const securityLootLock = vaultContainmentMode && this.player.isLooting;
    
    if (securityLootLock) {
        // ALL GUARDS DO NOT MOVE TOWARD PLAYER.
        this.drawBody();
        this.drawCone();
        this.checkDetection(); // Keep visual pressure/FOV active
        return; // ABSOLUTE FINAL MOVEMENT GATE: No AI/pathfinding executes.
    }

    // =====================================================================
    // STRICT VAULT CONTAINMENT OVERRIDE (USER REQUESTED)
    // =====================================================================
    if (vaultContainmentMode && isVaultAreaGuard) {
        this.state = GUARD_STATE.VAULT_CONTAINMENT;
        this.containmentTimeRemaining -= dt;
        if (this.containmentTimeRemaining <= 0) {
            this.containmentTimeRemaining = 0; 
        }

        // GUARD VISUAL PRESSURE REMAINS
        this.facePoint(this.player.gridX, this.player.gridY);
        this.stateText.setText('VAULT CONTAINMENT');
        this.stateText.setVisible(true);

        this.drawBody();
        this.drawCone();
        
        // Ensure FOV / raycasting still happens for visual pressure
        this.checkDetection();
        
        // DO NOT APPLY CHASE / INVESTIGATE / SEARCH MOVEMENT. HOLD EXTERIOR POSITION.
        return; 
    }

    // IF PLAYER EXITS VAULT -> RESTORE NORMAL AI
    if (this.state === GUARD_STATE.VAULT_CONTAINMENT && (!vaultContainmentMode || !isVaultAreaGuard)) {
        this.state = GUARD_STATE.SEARCH;
        this.waitTime = this.gameState.securityEscalated ? 2400 : 3000;
    }
    // =====================================================================

    if (this.state === GUARD_STATE.VAULT_CONTAINMENT) {
       this.stateText.setText('VAULT CONTAINMENT');
       this.stateText.setVisible(true);
    } else {
       this.stateText.setVisible(false);
    }
    
    // Safety Assertion — belt-and-suspenders check after all movement
    if (this.isGuardInsideVault(this.gridX, this.gridY)) {
        console.error("CRITICAL BUG: GUARD ENTERED GOLDEN VAULT — forcing out", this.gridX.toFixed(2), this.gridY.toFixed(2));
        this.gridX = this.lastValidPositionOutsideVault.x;
        this.gridY = this.lastValidPositionOutsideVault.y;
    } else {
        this.lastValidPositionOutsideVault = { x: this.gridX, y: this.gridY };
    }

    this.checkDetection();

    let currentChaseSpeed = this.chaseSpeed;
    let currentPatrolSpeed = this.patrolSpeed;
    
    if (this.gameState.securityEscalated) {
        currentChaseSpeed *= 1.2;
        currentPatrolSpeed *= 1.3;
    }

    if (this.isDetecting) {
        this.state = GUARD_STATE.CHASE;
        let target = { x: this.player.gridX, y: this.player.gridY };
        this.lastKnownPlayerPos = target;
    }

    if (this.state === GUARD_STATE.CHASE) {
       if (this.isDetecting && this.lastKnownPlayerPos) {
          this.moveTowards(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, currentChaseSpeed, dt);
       } else {
          // Lost line of sight
          this.state = GUARD_STATE.SEARCH;
          this.waitTime = this.gameState.securityEscalated ? 2400 : 3000;
       }
    } else if (this.state === GUARD_STATE.INVESTIGATE && this.lastKnownPlayerPos) {
       this.moveTowards(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, currentChaseSpeed * 0.8, dt);
       const dx = this.lastKnownPlayerPos.x - this.gridX;
       const dy = this.lastKnownPlayerPos.y - this.gridY;
       if (Math.sqrt(dx*dx + dy*dy) < 0.5) {
          this.state = GUARD_STATE.SEARCH;
          this.waitTime = this.gameState.securityEscalated ? 2400 : 3000;
       }
    } else if (this.state === GUARD_STATE.SEARCH) {
       if (this.waitTime > 0) {
          this.waitTime -= dt;
          this.angle += Math.sin(this.waitTime / 200) * 2;
       } else {
          this.state = GUARD_STATE.RETURN;
       }
    } else if (this.state === GUARD_STATE.RETURN) {
       const target = this.patrolPath[this.currentWaypoint];
       this.moveTowards(target.x + 0.5, target.y + 0.5, currentPatrolSpeed, dt);
       const dx = (target.x + 0.5) - this.gridX;
       const dy = (target.y + 0.5) - this.gridY;
       if (Math.sqrt(dx*dx + dy*dy) < 0.2) {
          this.state = GUARD_STATE.PATROL;
       }
    } else {
       // PATROL
       if (this.waitTime > 0) {
          this.waitTime -= dt;
       } else {
          this.moveAlongPath(dt, currentPatrolSpeed);
       }
    }
    
    this.drawBody(); 
    this.drawCone();
  }
  
  private isGuardInsideVault(x: number, y: number): boolean {
    // Full vault geometry from MapManager: addRoom(16, 0, 10, 3)
    // Walls at x=16, x=25, y=0, y=2. Floor at x=17-24, y=1.
    // Door tiles at y=2 (x=20,21) belong to ROOM.VAULT and must also block guards.
    // We use y < 3.0 to include the door row (y=2) plus a safe buffer.
    // Guards must stay at y >= 3.0 (restricted corridor side).
    return (x >= 16.0 && x <= 26.0 && y >= 0.0 && y < 3.0);
  }
  
  // GoldenVaultGuardExclusion: matches isGuardInsideVault — full vault block including doorway row
  private getVaultExclusionRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(16.0, 0.0, 10.0, 3.0);
  }

  // Intersects a line segment with a rectangle and returns the closest valid exterior point if crossing
  private getSegmentIntersectionWithVault(x1: number, y1: number, x2: number, y2: number): { intersects: boolean, exteriorX: number, exteriorY: number } {
    const rect = this.getVaultExclusionRect();
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    
    // If start is already inside, push them out to just outside vault (restricted corridor)
    if (rect.contains(x1, y1)) {
       return { intersects: true, exteriorX: 20.5, exteriorY: 3.0 };
    }
    
    // Fast fail if end is outside and bounding boxes don't overlap
    if (!rect.contains(x2, y2) && !Phaser.Geom.Intersects.LineToRectangle(line, rect)) {
        return { intersects: false, exteriorX: x2, exteriorY: y2 };
    }

    // It crosses the boundary. Find where it enters.
    const points = Phaser.Geom.Intersects.GetLineToRectangle(line, rect);
    if (points && points.length > 0) {
        // Find the closest intersection point to the start
        let closestPt = points[0];
        let minDist = Phaser.Math.Distance.Between(x1, y1, closestPt.x, closestPt.y);
        for (let i = 1; i < points.length; i++) {
            const d = Phaser.Math.Distance.Between(x1, y1, points[i].x, points[i].y);
            if (d < minDist) {
                minDist = d;
                closestPt = points[i];
            }
        }
        
        // Push slightly back along the normal to stay strictly exterior
        const nx = x1 - closestPt.x;
        const ny = y1 - closestPt.y;
        const len = Math.sqrt(nx*nx + ny*ny);
        if (len > 0) {
            return { 
                intersects: true, 
                exteriorX: closestPt.x + (nx/len)*0.01, 
                exteriorY: closestPt.y + (ny/len)*0.01 
            };
        } else {
            return { intersects: true, exteriorX: closestPt.x, exteriorY: closestPt.y };
        }
    }
    
    // Fallback if end is inside but no intersection detected
    if (rect.contains(x2, y2)) {
        return { intersects: true, exteriorX: x1, exteriorY: y1 };
    }

    return { intersects: false, exteriorX: x2, exteriorY: y2 };
  }
  
  private isPassable(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.mapManager.mapWidth || iy < 0 || iy >= this.mapManager.mapHeight) return false;
    
    const cell = this.mapManager.getGrid()[iy][ix];
    if (cell.tile === TILE.WALL_NORMAL || cell.tile === TILE.WALL_SECURITY || cell.tile === TILE.WALL_REINFORCED || cell.tile === TILE.EMPTY) {
      return false;
    }
    
    // ROOT CAUSE FIX: ROOM.VAULT check MUST come before the door check.
    // Previously, an open vault door bypassed this check because door-open
    // returns true before we could block on ROOM.VAULT.
    // Guards must NEVER enter vault tiles, door or no door.
    if (cell.room === ROOM.VAULT) {
      return false;
    }
    
    const door = this.mapManager.doors.find(d => d.gridX === ix && d.gridY === iy);
    if (door && door.state !== DOOR_STATE.OPEN) {
      if (door.state === DOOR_STATE.CLOSED) {
        door.open();
        return true;
      }
      return false;
    }
    
    return true;
  }

  private moveTowards(tx: number, ty: number, speed: number, dt: number): void {
    let dx = tx - this.gridX;
    let dy = ty - this.gridY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 0.1) return;
    
    dx /= dist;
    dy /= dist;
    
    const step = (speed * dt) / 1000;
    let nextX = this.gridX + dx * step;
    let nextY = this.gridY + dy * step;
    
    // === CRITICAL BUG FIX: HARD VAULT EXCLUSION BOUNDARY (SEGMENT CHECK) ===
    const collisionCheck = this.getSegmentIntersectionWithVault(this.gridX, this.gridY, nextX, nextY);
    if (collisionCheck.intersects) {
        // STOP THE MOVEMENT at the exterior boundary!
        this.gridX = collisionCheck.exteriorX;
        this.gridY = collisionCheck.exteriorY;
        
        if (this.state === GUARD_STATE.CHASE) {
            this.state = GUARD_STATE.VAULT_CONTAINMENT;
            this.containmentTimeRemaining = 15000;
            this.facePoint(this.player.gridX, this.player.gridY);
        } else if (this.state !== GUARD_STATE.VAULT_CONTAINMENT) {
            this.state = GUARD_STATE.SEARCH;
            this.waitTime = 3000;
        }
        this.updatePosition();
        return;
    }
    // =======================================================================

    const r = 0.25;
    if (this.isPassable(nextX + r*Math.sign(dx), this.gridY)) {
      this.gridX = nextX;
    }
    if (this.isPassable(this.gridX, nextY + r*Math.sign(dy))) {
      this.gridY = nextY;
    }
    
    this.facePoint(tx, ty);
    
    if (dx < 0 || dy > 0) {
      this.bodyGraphics.scaleX = -1;
    } else if (dx > 0 || dy < 0) {
      this.bodyGraphics.scaleX = 1;
    }
    
    this.updatePosition();
  }

  private moveAlongPath(dt: number, speed: number): void {
    if (this.patrolPath.length <= 1) return;
    
    const target = this.patrolPath[this.currentWaypoint];
    const tx = target.x + 0.5;
    const ty = target.y + 0.5;
    
    const dx = tx - this.gridX;
    const dy = ty - this.gridY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // === CRITICAL BUG FIX: HARD VAULT EXCLUSION BOUNDARY ===
    if (this.isGuardInsideVault(tx, ty)) {
        // Target is inside the vault. Invalid patrol point. Skip it.
        this.currentWaypoint = (this.currentWaypoint + 1) % this.patrolPath.length;
        return;
    }
    // =======================================================

    if (dist <= 0.1) {
      this.gridX = tx;
      this.gridY = ty;
      this.currentWaypoint = (this.currentWaypoint + 1) % this.patrolPath.length;
      this.waitTime = 1000;
      const nextTarget = this.patrolPath[this.currentWaypoint];
      this.facePoint(nextTarget.x + 0.5, nextTarget.y + 0.5);
    } else {
      this.moveTowards(tx, ty, speed, dt);
    }
  }

  private checkDetection(): void {
    const dx = this.player.gridX - this.gridX;
    const dy = this.player.gridY - this.gridY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    this.isDetecting = false;
    
    // If player is crouching, detection range is reduced. Sprinting increases it.
    // Vault-area guards use detectionRangeMultiplier (< 1.0) for reduced range.
    let currentRange = this.baseRange * this.detectionRangeMultiplier;
    if (this.player.isCrouching) currentRange *= 0.6;
    else if (this.player.isSprinting) currentRange *= 1.3;
    
    if (dist <= currentRange) {
      const targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
      let diff = Math.abs(Phaser.Math.Angle.ShortestBetween(this.angle, targetAngle));
      
      if (diff <= this.fov / 2) {
        if (this.hasLineOfSight(this.player.gridX, this.player.gridY)) {
          this.isDetecting = true;
        }
      }
    }
  }

  private hasLineOfSight(tx: number, ty: number): boolean {
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
    
    let color: number = PALETTE.CYAN_DIM;
    if (this.state === GUARD_STATE.RETURN) color = PALETTE.CYAN;
    if (this.state === GUARD_STATE.INVESTIGATE || this.state === GUARD_STATE.SEARCH || this.state === GUARD_STATE.SUSPICIOUS) color = PALETTE.ORANGE;
    if (this.state === GUARD_STATE.VAULT_CONTAINMENT) color = 0x8800ff; // Purple/Violet for containment
    if (this.gameState.detectionState === 'SUSPICIOUS') color = PALETTE.ORANGE;
    if (this.gameState.detectionState === 'SECURITY ALERT') color = 0xffa500;
    if (this.gameState.detectionState === 'CRITICAL') color = PALETTE.RED;
    if (this.state === GUARD_STATE.CHASE) color = PALETTE.RED;
    if (this.isDetecting) color = PALETTE.RED;
    
    const alpha = this.isDetecting || this.state === GUARD_STATE.CHASE ? 0.3 : 0.1;
    
    this.coneGraphics.fillStyle(color, alpha);
    this.coneGraphics.beginPath();
    this.coneGraphics.moveTo(0, 0);
    
    let currentRange = this.baseRange * this.detectionRangeMultiplier;
    if (this.player.isCrouching) currentRange *= 0.6;
    else if (this.player.isSprinting) currentRange *= 1.3;
    
    const segments = 10;
    const startAngle = Phaser.Math.DegToRad(this.angle - this.fov / 2);
    const endAngle = Phaser.Math.DegToRad(this.angle + this.fov / 2);
    
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / segments);
      const px = this.gridX + Math.cos(a) * currentRange;
      const py = this.gridY + Math.sin(a) * currentRange;
      
      const isoPos = this.toIso(px, py);
      const baseIso = this.toIso(this.gridX, this.gridY);
      
      this.coneGraphics.lineTo(isoPos.x - baseIso.x, isoPos.y - baseIso.y);
    }
    
    this.coneGraphics.lineTo(0, 0);
    this.coneGraphics.fillPath();
    this.coneGraphics.lineStyle(1, color, alpha * 2);
    this.coneGraphics.strokePath();
  }
}
