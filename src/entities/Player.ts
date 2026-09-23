import Phaser from 'phaser';
import { PALETTE } from '../core/Constants';
import { MapManager } from '../maps/MapManager';
import { TILE, ROOM } from '../maps/MapConstants';
import { DOOR_STATE } from './Door';
import { GameState } from '../core/GameState';
import { VAULT_STATE } from '../core/GameState';
import { audioManager } from '../systems/AudioManager';

export class Player {
  private scene: Phaser.Scene;
  private mapManager: MapManager;
  
  public gridX: number;
  public gridY: number;
  
  private graphics: Phaser.GameObjects.Graphics;
  public container: Phaser.GameObjects.Container;
  
  private baseMoveSpeed = 4.0;
  private sprintMultiplier = 1.6;
  private crouchMultiplier = 0.5;
  private duffelBag!: Phaser.GameObjects.Graphics;
  
  public isCrouching = false;
  public isSprinting = false;
  public isEscaping = false;
  public hasKeycard = true;
  public currentRoom: ROOM = ROOM.NONE;
  
  // Vault breach state (vaultState is authoritative in GameState)
  private readonly VAULT_DOOR_X = 21.0;
  private readonly VAULT_DOOR_Y = 2.5;
  private readonly VAULT_CASH_X = 20.5;
  private readonly VAULT_CASH_Y = 1.5;
  private readonly INTERACT_RANGE = 2.0;
  
  private keys: { [key: string]: Phaser.Input.Keyboard.Key };
  
  private interactionPrompt!: Phaser.GameObjects.Text;
  private nearestDoor: any = null;
  
  // Loot progress bar (1.5s collect animation)
  public isLooting: boolean = false;
  private lootTimer: number = 0;
  private readonly LOOT_DURATION: number = 1500; // ms
  private lootProgressBar!: Phaser.GameObjects.Graphics;
  private lootProgressText!: Phaser.GameObjects.Text;

  // Isometric translation constants (must match MapManager)
  private tileWidth = 64;
  private tileHeight = 32;
  private originX: number;
  private originY = 100;
  private collisionRadius = 0.25;

  constructor(scene: Phaser.Scene, mapManager: MapManager, startX: number, startY: number) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.gridX = startX + 0.5;
    this.gridY = startY + 0.5;
    
    this.originX = (this.mapManager.mapWidth * this.tileWidth) / 2;
    
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(30);
    
    this.graphics = this.scene.add.graphics();
    this.drawPlayer();
    this.container.add(this.graphics);
    
    this.keys = {
      W: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      E: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      SHIFT: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      CTRL: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
      C: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C)
    };

    console.log('[PLAYER] CREATED');
    console.log('[PLAYER] SPAWN = ENTRY_LOBBY');
    console.log(`[PLAYER] POSITION = ${this.gridX},${this.gridY}`);
    console.log('[PLAYER] INPUT ACTIVE');
    console.log('[PLAYER] COLLISION ENABLED');

    this.updatePosition();
    
    this.interactionPrompt = this.scene.add.text(0, -60, '[E] INTERACT', { 
      fontFamily: '"Share Tech Mono", monospace', 
      fontSize: '12px', 
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);
    this.container.add(this.interactionPrompt);

    this.scene.tweens.add({
      targets: this.graphics,
      scaleY: 0.95,
      y: 1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private drawPlayer(): void {
    this.graphics.clear();
    
    // Soft shadow underneath
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillEllipse(0, 0, 26, 14);
    
    // Dark tactical body
    this.graphics.fillStyle(0x1a1a1a, 1);
    this.graphics.fillPoints([{x: -8, y: 0}, {x: 8, y: 0}, {x: 6, y: -25}, {x: -6, y: -25}], true);
    
    // Cyan edge lighting
    this.graphics.lineStyle(1, PALETTE.CYAN, 0.6);
    this.graphics.strokePoints([{x: -8, y: 0}, {x: 8, y: 0}, {x: 6, y: -25}, {x: -6, y: -25}], true);
    
    // Diagonal tactical line
    this.graphics.lineStyle(2, PALETTE.CYAN_DIM, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(-4, -10);
    this.graphics.lineTo(4, -15);
    this.graphics.strokePath();

    // Head (dark helmet)
    this.graphics.fillStyle(0x0a1018, 1);
    this.graphics.fillCircle(0, -30, 8);
    
    // Cyan visor glow
    this.graphics.fillStyle(PALETTE.CYAN, 1);
    this.graphics.fillRect(-3, -32, 8, 3);
    
    // Duffel bag (hidden until loot collected)
    this.duffelBag = this.scene.add.graphics();
    this.duffelBag.fillStyle(0x3d2b00, 1);
    this.duffelBag.fillRoundedRect(-10, -8, 20, 14, 4);
    this.duffelBag.lineStyle(1.5, 0xffd700, 1);
    this.duffelBag.strokeRoundedRect(-10, -8, 20, 14, 4);
    // Strap
    this.duffelBag.lineStyle(1, 0xffa500, 0.8);
    this.duffelBag.lineBetween(-8, -8, 8, -8);
    this.duffelBag.setVisible(false);
    this.container.add(this.duffelBag);
    
    // Loot progress bar UI
    this.lootProgressBar = this.scene.add.graphics();
    this.lootProgressBar.setVisible(false);
    this.container.add(this.lootProgressBar);
    
    this.lootProgressText = this.scene.add.text(0, -72, 'LOOTING CASH...', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '12px',
      color: '#ffd700',
      backgroundColor: '#000000cc',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setVisible(false);
    this.container.add(this.lootProgressText);
  }

  private toIso(tx: number, ty: number) {
    const isoX = this.originX + (tx - ty) * (this.tileWidth / 2);
    const isoY = this.originY + (tx + ty) * (this.tileHeight / 2);
    return { x: isoX, y: isoY };
  }

  private updatePosition(): void {
    const pos = this.toIso(this.gridX, this.gridY);
    this.container.x = pos.x;
    this.container.y = pos.y;
    this.container.setDepth(30 + pos.y * 0.01);
  }

  private isTilePassable(ix: number, iy: number): boolean {
    if (ix < 0 || ix >= this.mapManager.mapWidth || iy < 0 || iy >= this.mapManager.mapHeight) return false;
    
    const tile = this.mapManager.getGrid()[iy][ix].tile;
    if (tile === TILE.WALL_NORMAL || tile === TILE.WALL_SECURITY || tile === TILE.WALL_REINFORCED || tile === TILE.EMPTY) {
      return false;
    }
    
    const door = this.mapManager.doors.find(d => d.gridX === ix && d.gridY === iy);
    if (door && door.state !== DOOR_STATE.OPEN) { 
      return false;
    }
    
    return true;
  }

  private canMoveTo(newX: number, newY: number): boolean {
    const r = this.collisionRadius;
    const minX = Math.floor(newX - r + 0.01);
    const maxX = Math.floor(newX + r - 0.01);
    const minY = Math.floor(newY - r + 0.01);
    const maxY = Math.floor(newY + r - 0.01);
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!this.isTilePassable(x, y)) return false;
      }
    }
    return true;
  }

  public update(dt: number): void {
    if (this.isEscaping) return;
    
    let dx = 0;
    let dy = 0;
    
    if (this.keys.W.isDown || this.keys.UP.isDown) dy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) dy += 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx += 1;

    this.isCrouching = this.keys.CTRL.isDown || this.keys.C.isDown;
    this.isSprinting = this.keys.SHIFT.isDown && !this.isCrouching;

    if (this.isCrouching) {
      this.graphics.y = 8;
    } else {
      this.graphics.y = 0;
    }

    if (dx !== 0 || dy !== 0) {
      if (this.isCrouching) {
        audioManager.playFootstep('crouch');
      } else if (this.isSprinting) {
        audioManager.playFootstep('sprint');
      } else {
        audioManager.playFootstep('walk');
      }
      
      const length = Math.sqrt(dx*dx + dy*dy);
      dx /= length;
      dy /= length;

      let speed = this.baseMoveSpeed;
      if (this.isSprinting) speed *= this.sprintMultiplier;
      if (this.isCrouching) speed *= this.crouchMultiplier;

      const step = (speed * dt) / 1000;
      
      let nextX = this.gridX + dx * step;
      let nextY = this.gridY + dy * step;

      // Sliding collision
      if (this.canMoveTo(nextX, this.gridY)) {
        this.gridX = nextX;
      }
      if (this.canMoveTo(this.gridX, nextY)) {
        this.gridY = nextY;
      }

      if (dx < 0 || dy > 0) {
        this.graphics.scaleX = -1;
      } else if (dx > 0 || dy < 0) {
        this.graphics.scaleX = 1;
      }

      // Subtle wobble for walking
      const time = this.scene.time.now;
      this.graphics.rotation = Math.sin(time * 0.015) * 0.05;
    } else {
      this.graphics.rotation = 0;
    }

    this.updatePosition();
    this.checkInteractions();
    
    // Check Room changes for Security Zones
    const cell = this.mapManager.getGrid()[Math.floor(this.gridY)]?.[Math.floor(this.gridX)];
    if (cell && cell.room !== this.currentRoom) {
      this.currentRoom = cell.room;
      if (this.currentRoom === ROOM.SECURITY_ROOM || this.currentRoom === ROOM.SERVER_ROOM) {
         if ((this.scene as any).showTacticalMessage) {
            (this.scene as any).showTacticalMessage('⚠ RESTRICTED AREA', '#ffa500');
         }
      } else if (this.currentRoom === ROOM.RESTRICTED_CORRIDOR || this.currentRoom === ROOM.VAULT) {
         if ((this.scene as any).showTacticalMessage) {
            (this.scene as any).showTacticalMessage('⚠ SECURITY ZONE', '#ff1744');
         }
      }
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      const state = GameState.getInstance();
      
      const doorDx = this.VAULT_DOOR_X - this.gridX;
      const doorDy = this.VAULT_DOOR_Y - this.gridY;
      const doorDist = Math.sqrt(doorDx*doorDx + doorDy*doorDy);
      const isNearVaultDoor = doorDist < this.INTERACT_RANGE;

      const cashDx = this.VAULT_CASH_X - this.gridX;
      const cashDy = this.VAULT_CASH_Y - this.gridY;
      const cashDist = Math.sqrt(cashDx*cashDx + cashDy*cashDy);
      const isNearCash = cashDist < this.INTERACT_RANGE;

      console.log('[VAULT INTERACTION]', {
        playerPos: { x: this.gridX.toFixed(2), y: this.gridY.toFixed(2) },
        vaultDoorPos: { x: this.VAULT_DOOR_X, y: this.VAULT_DOOR_Y },
        doorDist: doorDist.toFixed(2),
        isNearVaultDoor,
        cashPos: { x: this.VAULT_CASH_X, y: this.VAULT_CASH_Y },
        cashDist: cashDist.toFixed(2),
        isNearCash,
        vaultState: state.vaultState,
        ePressed: true
      });
      
      if (isNearVaultDoor && state.vaultState === VAULT_STATE.LOCKED) {
        // Start breach
        audioManager.playInteraction('vault');
        state.vaultState = VAULT_STATE.BREACHING;
        state.vaultBreachProgress = 0;
        state.objective = 'BREACH THE VAULT';
        if ((this.scene as any).onVaultBreachStart) {
          (this.scene as any).onVaultBreachStart();
        }
      } else if (isNearCash && state.vaultState === VAULT_STATE.OPEN && !state.lootCollected && !this.isLooting) {
        // Start loot timer (1.5s collect sequence)
        this.isLooting = true;
        state.vaultState = VAULT_STATE.LOOTING;
        this.lootTimer = 0;
        this.lootProgressText.setVisible(true);
        this.lootProgressBar.setVisible(true);
      } else if (this.currentRoom === ROOM.MAIN_EXIT || this.currentRoom === ROOM.SERVICE_EXIT) {
        if (state.lootCollected && !this.isEscaping) {
          audioManager.playInteraction('escape');
          this.isEscaping = true;
          if ((this.scene as any).onEscapeStart) {
            (this.scene as any).onEscapeStart();
          }
        }
      } else if (this.nearestDoor) {
        if (this.nearestDoor.state === DOOR_STATE.CLOSED) {
          audioManager.playInteraction('door');
          this.nearestDoor.open();
        } else if (this.nearestDoor.state === DOOR_STATE.OPEN) {
          audioManager.playInteraction('door');
          this.nearestDoor.close();
        } else if (this.nearestDoor.state === DOOR_STATE.LOCKED) {
          audioManager.playInteraction('denied');
        }
      }
    }
    
    // Handle loot progress timer
    if (this.isLooting) {
      this.lootTimer += dt;
      const progress = Math.min(this.lootTimer / this.LOOT_DURATION, 1);
      
      // Draw progress bar
      this.lootProgressBar.clear();
      this.lootProgressBar.fillStyle(0x111111, 0.9);
      this.lootProgressBar.fillRect(-30, -60, 60, 10);
      this.lootProgressBar.fillStyle(0xffd700, 1);
      this.lootProgressBar.fillRect(-30, -60, 60 * progress, 10);
      this.lootProgressBar.lineStyle(1, 0xffd700, 0.6);
      this.lootProgressBar.strokeRect(-30, -60, 60, 10);
      
      if (this.lootTimer >= this.LOOT_DURATION) {
        // Complete the loot
        this.isLooting = false;
        this.lootProgressBar.setVisible(false);
        this.lootProgressText.setVisible(false);
        
        const state = GameState.getInstance();
        audioManager.playInteraction('collect');
        state.lootCollected = true;
        state.vaultState = VAULT_STATE.COLLECTED;
        console.log('[VAULT] CASH COLLECTED');
        state.lootValue = 100;
        state.objective = 'ESCAPE THE FACILITY';
        this.duffelBag.setVisible(true);
        if ((this.scene as any).onLootCollected) {
          (this.scene as any).onLootCollected();
        }
      }
      return; // Don't allow movement while looting
    }
    
    // Cancel breach if player moves away from door
    const state = GameState.getInstance();
    if (state.vaultState === VAULT_STATE.BREACHING) {
      const doorDx = this.VAULT_DOOR_X - this.gridX;
      const doorDy = this.VAULT_DOOR_Y - this.gridY;
      const doorDist = Math.sqrt(doorDx*doorDx + doorDy*doorDy);
      if (doorDist > this.INTERACT_RANGE + 0.5) {
        // Player walked away — cancel breach
        state.vaultState = VAULT_STATE.LOCKED;
        state.vaultBreachProgress = 0;
        if ((this.scene as any).onVaultBreachCancelled) {
          (this.scene as any).onVaultBreachCancelled();
        }
      }
    }
  }

  private checkInteractions(): void {
    let closestDist = 1.5;
    this.nearestDoor = null;
    
    for (const door of this.mapManager.doors) {
      const doorX = door.gridX + 0.5;
      const doorY = door.gridY + 0.5;
      const dx = doorX - this.gridX;
      const dy = doorY - this.gridY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < closestDist) {
        closestDist = dist;
        this.nearestDoor = door;
      }
    }
    
    const doorDx = this.VAULT_DOOR_X - this.gridX;
    const doorDy = this.VAULT_DOOR_Y - this.gridY;
    const doorDist = Math.sqrt(doorDx*doorDx + doorDy*doorDy);
    const isNearVaultDoor = doorDist < this.INTERACT_RANGE;

    const cashDx = this.VAULT_CASH_X - this.gridX;
    const cashDy = this.VAULT_CASH_Y - this.gridY;
    const cashDist = Math.sqrt(cashDx*cashDx + cashDy*cashDy);
    const isNearCash = cashDist < this.INTERACT_RANGE;
    
    const state = GameState.getInstance();
    
    // Update objective progressively
    if (isNearVaultDoor && state.vaultState === VAULT_STATE.LOCKED) {
      state.objective = 'BREACH THE VAULT';
    }
    
    if (isNearCash && (state.vaultState === VAULT_STATE.OPEN || state.vaultState === VAULT_STATE.LOOTING)) {
      this.interactionPrompt.setVisible(true);
      if (state.vaultState === VAULT_STATE.OPEN) {
        if (this.interactionPrompt.text !== '[E] COLLECT CASH') {
           console.log('[VAULT] CASH INTERACTION ENABLED');
        }
        this.interactionPrompt.setText('[E] COLLECT CASH');
        this.interactionPrompt.setColor('#00e5ff');
      } else if (state.vaultState === VAULT_STATE.LOOTING) {
        this.interactionPrompt.setText('LOOTING CASH...');
        this.interactionPrompt.setColor('#ffd700');
      }
    } else if (isNearVaultDoor && (state.vaultState === VAULT_STATE.LOCKED || state.vaultState === VAULT_STATE.BREACHING || state.vaultState === VAULT_STATE.OPEN)) {
      this.interactionPrompt.setVisible(true);
      if (state.vaultState === VAULT_STATE.LOCKED) {
        this.interactionPrompt.setText('[E] ACCESS VAULT');
        this.interactionPrompt.setColor('#ffd700');
      } else if (state.vaultState === VAULT_STATE.BREACHING) {
        this.interactionPrompt.setText('⚡ BREACHING...');
        this.interactionPrompt.setColor('#ff6b00');
      } else if (state.vaultState === VAULT_STATE.OPEN) {
        this.interactionPrompt.setText('VAULT OPEN');
        this.interactionPrompt.setColor('#00ff00');
      }
    } else if (this.currentRoom === ROOM.MAIN_EXIT || this.currentRoom === ROOM.SERVICE_EXIT) {
      this.interactionPrompt.setVisible(true);
      if (!state.lootCollected) {
        this.interactionPrompt.setText('EXTRACTION LOCKED\nLOOT REQUIRED');
        this.interactionPrompt.setColor('#ff1744');
      } else if (this.isEscaping) {
        this.interactionPrompt.setText('ESCAPING...');
        this.interactionPrompt.setColor('#ffd700');
      } else {
        const exitName = this.currentRoom === ROOM.MAIN_EXIT ? 'MAIN EXIT' : 'MAINTENANCE EXIT';
        this.interactionPrompt.setText(`${exitName}\n[E] ESCAPE`);
        this.interactionPrompt.setColor('#00ff00');
      }
    } else if (this.nearestDoor && this.nearestDoor.room !== ROOM.VAULT) {
      this.interactionPrompt.setVisible(true);
      if (this.nearestDoor.state === DOOR_STATE.LOCKED) {
        this.interactionPrompt.setText('[E] ACCESS DENIED');
        this.interactionPrompt.setColor('#ff1744');
      } else if (this.nearestDoor.state === DOOR_STATE.OPEN) {
        this.interactionPrompt.setText('[E] CLOSE');
        this.interactionPrompt.setColor('#00e5ff');
      } else {
        this.interactionPrompt.setText('[E] OPEN');
        this.interactionPrompt.setColor('#00e5ff');
      }
    } else {
      this.interactionPrompt.setVisible(false);
    }
  }
}
