import Phaser from 'phaser';
import { SCENES, THEME } from '../core/Constants';
import { MapManager } from '../maps/MapManager';
import { GameState, VAULT_STATE } from '../core/GameState';
import { Player } from '../entities/Player';
import { CameraController } from '../systems/CameraController';
import { CCTV } from '../entities/CCTV';
import { Guard } from '../entities/Guard';
import { Minimap } from '../entities/Minimap';
import { Loot } from '../entities/Loot';
import { DOOR_STATE } from '../entities/Door';
import { ROOM } from '../maps/MapConstants';
import { MenuButton } from '../ui/MenuButton';
import { audioManager } from '../systems/AudioManager';

export class InfiltrationScene extends Phaser.Scene {
  private mapManager!: MapManager;
  private state!: GameState;
  private player!: Player;
  private cameraController!: CameraController;
  
  private cctvs: CCTV[] = [];
  private guards: Guard[] = [];
  private physicalLoot?: Loot;
  
  private minimap!: Minimap;
  private hudContainer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  
  // HUD Elements
  private detBarFill!: Phaser.GameObjects.Graphics;
  private playerEnergy: number = 100;
  
  // Timer & UI Sync
  private timerText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private tcBg!: Phaser.GameObjects.Graphics;
  private pauseText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private escKey!: Phaser.Input.Keyboard.Key;
  private secondTimer: number = 0;
  private isGameOver: boolean = false;
  private debugText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private detectionStatusText!: Phaser.GameObjects.Text;
  private playerStatusText!: Phaser.GameObjects.Text;
  private securityEscalationText!: Phaser.GameObjects.Text;
  
  // Containment HUD
  private containmentBg!: Phaser.GameObjects.Graphics;
  private containmentLabelText!: Phaser.GameObjects.Text;
  private containmentSubText!: Phaser.GameObjects.Text;
  private containmentTimerText!: Phaser.GameObjects.Text;
  private wasInContainment: boolean = false;
  
  // Tactical Messages
  private tacticalMessageText!: Phaser.GameObjects.Text;
  private tacticalMessageEvent?: Phaser.Time.TimerEvent;
  // Vault Breach Variables
  private codeTimerEvent?: Phaser.Time.TimerEvent;
  
  // World Exit Markers
  private mainExitMarker!: Phaser.GameObjects.Text;
  private serviceExitMarker!: Phaser.GameObjects.Text;
  private edgeIndicatorText!: Phaser.GameObjects.Text;
  
  // Phase 4 Effects
  private effectsContainer!: Phaser.GameObjects.Container;
  private detectionOverlay!: Phaser.GameObjects.Graphics;
  private cctvOverlay!: Phaser.GameObjects.Graphics;
  private vaultOverlay!: Phaser.GameObjects.Graphics;
  
  constructor() {
    super({ key: SCENES.INFILTRATION });
  }

  create(data: { missionId: string }): void {
    console.log('[HEIST 05] GAMEPLAY SCENE CREATED');
    this.state = GameState.getInstance();
    this.state.resetMission(data.missionId || '01', 1);

    audioManager.stopAll();

    // Reset scene state variables since Phaser reuses the Scene instance
    this.isGameOver = false;
    this.playerEnergy = 100;
    this.secondTimer = 0;
    this.wasInContainment = false;

    // Main Camera for the map
    this.cameras.main.setBackgroundColor(THEME.background);

    // Initialize map
    this.mapManager = new MapManager(this);
    console.log('[HEIST 06] BLACKOUT HQ LOADED');
    
    // Spawn player in Entry Lobby
    this.player = new Player(this, this.mapManager, this.mapManager.playerSpawn.x, this.mapManager.playerSpawn.y);
    console.log('[HEIST 07] PLAYER CREATED');
    
    // Setup camera
    this.cameraController = new CameraController(this, this.player);
    const bounds = this.mapManager.getMapBounds();
    this.cameraController.setBounds(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    this.cameraController.centerOnPlayer();

    // Spawn Security
    this.cctvs = [];
    this.guards = [];
    
    // CCTVs (6 total)
    this.cctvs.push(this.createCCTV('CCTV-01 (RECEPTION)', 10, 26, 90, 180));
    this.cctvs.push(this.createCCTV('CCTV-02 (CENTRAL)', 16, 21, 135, 225));
    this.cctvs.push(this.createCCTV('CCTV-03 (OFFICE)', 8, 12, 45, 135));
    this.cctvs.push(this.createCCTV('CCTV-04 (SERVER)', 18, 9, 135, 225));
    this.cctvs.push(this.createCCTV('CCTV-05 (SECURITY)', 25, 8, 180, 270));
    this.cctvs.push(this.createCCTV('CCTV-06 (RESTRICTED)', 15, 3, 45, 135));
    
    // Guards (5 total)
    this.guards.push(this.createGuard('GUARD-01 (EXIT)', 3, 34, [{x: 3, y: 34}, {x: 3, y: 37}]));
    this.guards.push(this.createGuard('GUARD-02 (CENTRAL)', 16, 16, [{x: 16, y: 16}, {x: 16, y: 28}, {x: 21, y: 28}, {x: 21, y: 16}]));

    // VAULT_GUARD_DETECTION_RANGE_MULTIPLIER = 0.55
    // Guards near the vault area have reduced detection/chase range so they
    // don't aggressively follow the player deep into the vault interior.
    const VAULT_GUARD_DETECTION_RANGE_MULTIPLIER = 0.55;

    const guard03 = this.createGuard('GUARD-03 (SERVER)', 16, 8, [{x: 16, y: 8}, {x: 22, y: 8}]);
    guard03.setDetectionRangeMultiplier(VAULT_GUARD_DETECTION_RANGE_MULTIPLIER);
    this.guards.push(guard03);

    const guard04 = this.createGuard('GUARD-04 (SECURITY)', 26, 10, [{x: 26, y: 10}, {x: 32, y: 10}]);
    guard04.setDetectionRangeMultiplier(VAULT_GUARD_DETECTION_RANGE_MULTIPLIER);
    this.guards.push(guard04);

    // guard05 (RESTRICTED) removed to allow clear Golden Vault access

    // Spawn Loot inside Vault
    this.physicalLoot = new Loot(this, 20.5, 1.5, this.mapManager.mapWidth);
    // Phase 4 Effects Container
    this.effectsContainer = this.add.container(0, 0);
    this.effectsContainer.setScrollFactor(0);
    this.effectsContainer.setDepth(50);
    
    this.detectionOverlay = this.add.graphics();
    this.detectionOverlay.lineStyle(20, 0xff0000, 1);
    this.detectionOverlay.strokeRect(0, 0, this.scale.width, this.scale.height);
    this.detectionOverlay.setAlpha(0);
    this.effectsContainer.add(this.detectionOverlay);
    
    this.cctvOverlay = this.add.graphics();
    this.cctvOverlay.fillStyle(0x00ffff, 0.2);
    this.cctvOverlay.fillRect(0, 0, this.scale.width, 4);
    this.cctvOverlay.setAlpha(0);
    this.effectsContainer.add(this.cctvOverlay);
    
    this.vaultOverlay = this.add.graphics();
    this.vaultOverlay.fillStyle(0xffaa00, 1);
    this.vaultOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    this.vaultOverlay.setBlendMode(Phaser.BlendModes.ADD);
    this.vaultOverlay.setAlpha(0);
    this.effectsContainer.add(this.vaultOverlay);

    // Create a container for HUD to easily apply setScrollFactor
    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    // Setup UI Camera
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.ignore(this.hudContainer);

    // Draw HUD
    this.drawHUD();
    
    // Initialize Minimap
    this.minimap = new Minimap(this, this.mapManager, this.player, this.guards, this.cctvs, this.hudContainer);
    
    // Pause / Game Over overlays
    this.pauseText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'PAUSED', { fontFamily: '"Orbitron", monospace', fontSize: '48px', color: '#00e5ff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
      
      this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'MISSION FAILED\nTIME EXPIRED', { fontFamily: '"Orbitron", monospace', fontSize: '48px', color: '#ff1744', align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.debugText = this.add.text(this.scale.width / 2, 80, '', { fontFamily: '"Share Tech Mono", monospace', fontSize: '14px', color: '#ff1744', align: 'center', backgroundColor: '#000000aa' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
      
    this.tacticalMessageText = this.add.text(this.scale.width / 2, 120, '', { fontFamily: '"Share Tech Mono", monospace', fontSize: '20px', color: '#ff1744', align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
      
    // Create World Exit Markers
    const tileWidth = 64;
    const tileHeight = 32;
    const originX = (this.mapManager.mapWidth * tileWidth) / 2;
    const toIso = (tx: number, ty: number) => {
      const isoX = originX + (tx - ty) * (tileWidth / 2);
      const isoY = 100 + (tx + ty) * (tileHeight / 2);
      return { x: isoX, y: isoY };
    };
    const mainIso = toIso(3.5, 36);
    this.mainExitMarker = this.add.text(mainIso.x, mainIso.y - 40, 'MAIN EXIT\nSTATUS: LOCKED', { fontFamily: '"Orbitron", monospace', fontSize: '10px', color: '#555555', align: 'center', backgroundColor: '#000000aa', padding: {x:4, y:2} }).setOrigin(0.5).setDepth(200).setVisible(true);
    
    const serviceIso = toIso(33, 30);
    this.serviceExitMarker = this.add.text(serviceIso.x, serviceIso.y - 40, 'MAINTENANCE EXIT\nSTATUS: LOCKED', { fontFamily: '"Orbitron", monospace', fontSize: '10px', color: '#555555', align: 'center', backgroundColor: '#000000aa', padding: {x:4, y:2} }).setOrigin(0.5).setDepth(200).setVisible(true);

    this.edgeIndicatorText = this.add.text(0, 0, '', { fontFamily: '"Orbitron", monospace', fontSize: '16px', color: '#ff3300', backgroundColor: '#000000aa', padding: {x:4, y:2} }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.cameras.main.ignore([this.pauseText, this.gameOverText, this.debugText, this.tacticalMessageText, this.effectsContainer]);
    this.uiCamera.ignore([this.mainExitMarker, this.serviceExitMarker]);
    this.cameras.main.ignore([this.edgeIndicatorText]);
    
    // Handle resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.uiCamera.setSize(gameSize.width, gameSize.height);
      this.pauseText.setPosition(gameSize.width / 2, gameSize.height / 2);
      this.gameOverText.setPosition(gameSize.width / 2, gameSize.height / 2);
      this.rebuildHUD();
    });
      
    // Inputs
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    
    console.log('[HEIST 08] GAMEPLAY ACTIVE');
  }

  private createCCTV(id: string, x: number, y: number, startAngle: number, endAngle: number): CCTV {
    const cctv = new CCTV(this, this.mapManager, this.player, x, y, startAngle, endAngle);
    (cctv as any).id = id;
    return cctv;
  }

  private createGuard(id: string, x: number, y: number, path: {x: number, y: number}[]): Guard {
    const guard = new Guard(this, this.mapManager, this.player, x, y, path);
    (guard as any).id = id;
    (guard as any).prevState = guard.currentState;
    return guard;
  }
  
  public showTacticalMessage(msg: string, color: string = '#ff1744'): void {
    if (!this.tacticalMessageText) return;
    this.tacticalMessageText.setText(msg);
    this.tacticalMessageText.setColor(color);
    this.tacticalMessageText.setVisible(true);
    this.tacticalMessageText.setAlpha(1);
    
    if (this.tacticalMessageEvent) {
       this.tacticalMessageEvent.remove();
    }
    
    this.tacticalMessageEvent = this.time.delayedCall(2000, () => {
       this.tweens.add({
         targets: this.tacticalMessageText,
         alpha: 0,
         duration: 500,
         onComplete: () => {
           this.tacticalMessageText.setVisible(false);
         }
       });
    });
  }

  public onEscapeStart(): void {
    console.log('[ESCAPE DEBUG] escapeStarted: true');
    this.showTacticalMessage('⚡ ESCAPING...', '#ffd700');
    
    // Phase 4: Escape cinematic transition
    this.cameras.main.fadeOut(2000, 0, 0, 0);
    
    // 2-second extraction timer
    this.time.delayedCall(2000, () => {
      this.completeEscape();
    });
  }

  private completeEscape(): void {
    console.log('[ESCAPE DEBUG] escapeCompleted: true');
    this.isGameOver = true;
    audioManager.playVictory();
    
    // Phase 4/5: Escape success effects & transition
    this.uiCamera.flash(500, 255, 255, 255);
    
    // Hide standard game over text if it was visible
    this.gameOverText.setVisible(false);
    
    // Create new success UI container
    const W = this.scale.width;
    const H = this.scale.height;
    
    const successPanel = this.add.container(W / 2, H / 2);
    successPanel.setAlpha(0);
    this.tweens.add({ targets: successPanel, alpha: 1, duration: 1000 });
    successPanel.setScrollFactor(0).setDepth(200);
    
    // Background overlay (dark graphite/navy)
    const bg = this.add.graphics();
    bg.fillStyle(0x0a1526, 0.95);
    bg.fillRect(-W/2, -H/2, W, H);
    
    // Subtle tactical grid
    bg.lineStyle(1, 0x00e5ff, 0.05);
    for(let i = -W/2; i < W/2; i += 40) bg.lineBetween(i, -H/2, i, H/2);
    for(let i = -H/2; i < H/2; i += 40) bg.lineBetween(-W/2, i, W/2, i);
    successPanel.add(bg);
    
    // Tactical scanline glitch overlay
    const scanline = this.add.graphics();
    scanline.fillStyle(0x00e5ff, 0.05);
    scanline.fillRect(-W/2, -H/2, W, 4);
    successPanel.add(scanline);
    this.tweens.add({
        targets: scanline,
        y: H,
        duration: 3000,
        repeat: -1
    });

    // Main Title
    const title = this.add.text(0, -160, 'HEIST COMPLETE', { 
        fontFamily: '"Orbitron", monospace', 
        fontSize: '42px', 
        color: '#ffffff', 
        fontStyle: 'bold',
        shadow: { offsetX: 0, offsetY: 0, color: '#00e5ff', blur: 10, fill: true }
    }).setOrigin(0.5);
    successPanel.add(title);
    
    // Subtitle
    const subtitle = this.add.text(0, -110, 'BLACKOUT HQ // LEVEL 01', { 
        fontFamily: '"Share Tech Mono", monospace', 
        fontSize: '16px', 
        color: '#00e5ff', 
        letterSpacing: 4 
    }).setOrigin(0.5);
    successPanel.add(subtitle);
    
    // Results Panel Background
    const resultsBg = this.add.graphics();
    resultsBg.fillStyle(0x000000, 0.65);
    resultsBg.fillRect(-180, -70, 360, 200);
    resultsBg.lineStyle(1, 0x00e5ff, 0.4);
    resultsBg.strokeRect(-180, -70, 360, 200);
    successPanel.add(resultsBg);

    // Format Stats
    const m = Math.floor(this.state.timeRemaining / 60);
    const s = Math.floor(this.state.timeRemaining % 60);
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const detStr = Math.floor(this.state.detection) + '%';
    const alertsStr = this.state.strikes.toString();
    
    // Text Styles
    const labelStyle = { fontFamily: '"Share Tech Mono", monospace', fontSize: '14px', color: '#5c8b99' };
    const valueStyle = { fontFamily: '"Orbitron", monospace', fontSize: '16px', color: '#ffffff' };
    
    // Loot
    successPanel.add(this.add.text(-150, -40, 'LOOT SECURED', labelStyle).setOrigin(0, 0.5));
    successPanel.add(this.add.text(150, -40, '₹100 CASH', { ...valueStyle, color: '#ffd700', shadow: { offsetX: 0, offsetY: 0, color: '#ffaa00', blur: 5, fill: true } }).setOrigin(1, 0.5));
    
    // Time
    successPanel.add(this.add.text(-150, 0, 'TIME REMAINING', labelStyle).setOrigin(0, 0.5));
    successPanel.add(this.add.text(150, 0, timeStr, valueStyle).setOrigin(1, 0.5));
    
    // Detection
    successPanel.add(this.add.text(-150, 40, 'FINAL DETECTION', labelStyle).setOrigin(0, 0.5));
    successPanel.add(this.add.text(150, 40, detStr, valueStyle).setOrigin(1, 0.5));
    
    // Alerts
    successPanel.add(this.add.text(-150, 80, 'SECURITY ALERTS', labelStyle).setOrigin(0, 0.5));
    successPanel.add(this.add.text(150, 80, alertsStr, valueStyle).setOrigin(1, 0.5));
    
    // Operation Complete text
    const opComplete = this.add.text(0, 160, 'OPERATION COMPLETE', { 
        fontFamily: '"Share Tech Mono", monospace', 
        fontSize: '18px', 
        color: '#00ff00', 
        letterSpacing: 2 
    }).setOrigin(0.5);
    successPanel.add(opComplete);

    // PLAY AGAIN button
    const playAgainBtn = new MenuButton({
      scene: this,
      x: 0,
      y: 220,
      label: 'PLAY AGAIN',
      width: 280,
      height: 40,
      variant: 'primary',
      onClick: () => {
        this.state.missionFailed = false;
        this.scene.start(SCENES.MISSION_SELECT);
      }
    });
    successPanel.add(playAgainBtn);
    
    // RETURN TO OPERATIONS button
    const operationsBtn = new MenuButton({
      scene: this,
      x: 0,
      y: 280,
      label: 'RETURN TO OPERATIONS',
      width: 280,
      height: 40,
      variant: 'secondary',
      onClick: () => {
        this.state.missionFailed = false;
        this.scene.start(SCENES.MISSION_SELECT);
      }
    });
    successPanel.add(operationsBtn);
    
    this.uiCamera.ignore(successPanel);
  }

  private triggerMissionFailed(reason: string): void {
    console.log('[HEIST] MISSION FAILED: ' + reason);
    audioManager.playSecurityAlarm('failed');
    
    // Phase 4: Mission failed effects
    this.cameras.main.flash(300, 255, 0, 0);
    this.cameras.main.shake(300, 0.01);
    
    // Hide standard game over text if it was somehow visible
    this.gameOverText.setVisible(false);
    
    // Create new failure UI container
    const W = this.scale.width;
    const H = this.scale.height;
    
    const failurePanel = this.add.container(W / 2, H / 2);
    failurePanel.setName('failurePanel');
    failurePanel.setAlpha(0);
    this.tweens.add({ targets: failurePanel, alpha: 1, duration: 1000 });
    failurePanel.setScrollFactor(0).setDepth(200);
    
    // Background overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.fillRect(-W/2, -H/2, W, H);
    failurePanel.add(bg);
    
    // Clean tactical/cyberpunk completion screen
    const title = this.add.text(0, -90, 'MISSION FAILED', { fontFamily: '"Orbitron", monospace', fontSize: '32px', color: '#ff1744', fontStyle: 'bold' }).setOrigin(0.5);
    failurePanel.add(title);
    
    const subtitle = this.add.text(0, -40, 'BLACKOUT HQ', { fontFamily: '"Share Tech Mono", monospace', fontSize: '18px', color: '#00e5ff', letterSpacing: 4 }).setOrigin(0.5);
    failurePanel.add(subtitle);
    
    const reasonText = this.add.text(0, 10, reason, { fontFamily: '"Share Tech Mono", monospace', fontSize: '24px', color: '#ff1744' }).setOrigin(0.5);
    failurePanel.add(reasonText);
    
    const statusText = this.add.text(0, 60, 'LOOT LOST\nMISSION ABORTED', { fontFamily: '"Share Tech Mono", monospace', fontSize: '16px', color: '#ff1744', align: 'center' }).setOrigin(0.5);
    failurePanel.add(statusText);
    
    // PLAY AGAIN button
    const playAgainBtn = new MenuButton({
      scene: this,
      x: 0,
      y: 130,
      label: 'PLAY AGAIN',
      width: 280,
      height: 40,
      variant: 'primary',
      onClick: () => {
        this.state.missionFailed = false;
        this.scene.start(SCENES.MISSION_SELECT);
      }
    });
    failurePanel.add(playAgainBtn);
    
    // RETURN TO OPERATIONS button
    const operationsBtn = new MenuButton({
      scene: this,
      x: 0,
      y: 190,
      label: 'RETURN TO OPERATIONS',
      width: 280,
      height: 40,
      variant: 'secondary',
      onClick: () => {
        this.state.missionFailed = false;
        this.scene.start(SCENES.MISSION_SELECT);
      }
    });
    failurePanel.add(operationsBtn);
    
    this.cameras.main.ignore(failurePanel);
  }

  public onVaultBreachStart(): void {
    console.log('[VAULT] ACCESS STARTED');

    // Phase 4: Vault Breach effects
    this.cameras.main.flash(200, 255, 200, 100);
    this.cameras.main.shake(200, 0.005);

    this.showTacticalMessage('⚡ VAULT BREACH INITIATED', '#ffd700');
    this.state.objective = 'BREACH THE VAULT';
    
    console.log('[VAULT] BREACHING');
    console.log('[VAULT] BREACH TIMER STARTED');
    
    if (this.codeTimerEvent) this.codeTimerEvent.remove();
    this.codeTimerEvent = this.time.delayedCall(2000, () => {
      if (this.state.vaultState === VAULT_STATE.BREACHING) {
          console.log('[VAULT] BREACH TIMER COMPLETE');
          this.completeVaultBreach();
      }
    });
  }
  
  private completeVaultBreach(): void {
    console.log('[VAULT] VAULT OPEN');
    
    this.state.vaultState = VAULT_STATE.OPEN;
    this.state.objective = 'COLLECT THE CASH';
    this.showTacticalMessage('✔ VAULT SECURED', '#00ff00');
    
    // Physically open the vault doors so player can enter
    this.mapManager.doors.forEach(door => {
      const room = this.mapManager.getGrid()[door.gridY][door.gridX].room;
      if (room === ROOM.VAULT) {
        door.state = DOOR_STATE.CLOSED; // It was LOCKED, we must set to CLOSED so open() animation works
        door.open();
      }
    });
  }
  
  public onVaultBreachCancelled(): void {
    if (this.codeTimerEvent) this.codeTimerEvent.remove();
    this.showTacticalMessage('✖ BREACH ABORTED', '#ff1744');
    this.state.objective = 'INFILTRATE FACILITY';
  }

  public onLootCollected(): void {
    if (this.physicalLoot) {
      this.physicalLoot.destroy();
      this.physicalLoot = undefined;
    }
    this.state.securityEscalated = true;
    this.state.objective = 'ESCAPE THE FACILITY';
    
    // Phase 4: Loot collected / Security escalation effects
    this.cameras.main.flash(300, 255, 215, 0); // Gold flash for loot
    this.time.delayedCall(300, () => {
        this.cameras.main.shake(500, 0.01);
        this.cameras.main.flash(300, 255, 0, 0); // Red flash for escalation
        this.showTacticalMessage('VAULT COMPROMISED', '#ff1744');
        this.time.delayedCall(1500, () => {
            this.showTacticalMessage('SECURITY ESCALATION', '#ff1744');
        });
    });
  }

  update(_time: number, delta: number): void {
    // Ignore all non-HUD elements from uiCamera
    this.children.list.forEach(c => {
      if (c !== this.hudContainer && c !== this.effectsContainer && c !== this.pauseText && c !== this.gameOverText && c !== this.debugText && c.name !== 'failurePanel' && c !== this.tacticalMessageText) {
        this.uiCamera.ignore(c);
      }
    });

    if (this.isGameOver) return;
    
    // Handle Pause Toggle
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.state.isPaused) {
        this.state.resume();
        this.pauseText.setVisible(false);
      } else {
        this.state.pause();
        this.pauseText.setVisible(true);
      }
    }
    
    if (this.state.isPaused) return;

    // Timer Logic
    this.secondTimer += delta;
    if (this.secondTimer >= 1000) {
      this.secondTimer -= 1000;
      if (this.state.timeRemaining > 0) {
        this.state.timeRemaining -= 1;
      }
      this.syncHUD();
    }
    
    if (this.state.timeRemaining <= 0 || this.state.detection >= 100) {
      if (!this.state.missionFailed && !this.isGameOver) {
        this.state.missionFailed = true;
        this.isGameOver = true;
        const reason = this.state.detection >= 100 ? 'SECURITY CONTACT' : 'TIMER EXPIRED';
        this.triggerMissionFailed(reason);
      }
      return;
    }
    
    // NOTE: Manual extraction handled via onEscapeStart() from Player.ts

    // Energy logic (for Sprinting)
    if (this.player.isSprinting && this.playerEnergy > 0) {
      this.playerEnergy -= delta * 0.05; // Deplete
      if (this.playerEnergy < 0) this.playerEnergy = 0;
    } else if (!this.player.isSprinting && this.playerEnergy < 100) {
      this.playerEnergy += delta * 0.02; // Regenerate
      if (this.playerEnergy > 100) this.playerEnergy = 100;
    }

    // Force player to stop sprinting if no energy
    if (this.playerEnergy <= 0) {
      this.player.isSprinting = false;
    }

    this.player.update(delta);
    
    // Dynamic Exit Guidance
    if (this.state.securityEscalated) {
        if (!this.mainExitMarker.getData('active')) {
            this.mainExitMarker.setData('active', true);
            this.mainExitMarker.setText('▼ MAIN EXIT');
            this.mainExitMarker.setColor('#ff3300');
            this.mainExitMarker.setFontSize('14px');
            
            this.serviceExitMarker.setData('active', true);
            this.serviceExitMarker.setText('▼ MAINTENANCE EXIT');
            this.serviceExitMarker.setColor('#ffa500');
            this.serviceExitMarker.setFontSize('14px');
        }
        
        // Bounce animation manually
        const time = this.time.now / 300;
        const mainIso = this.mainExitMarker.getData('baseY') || this.mainExitMarker.y;
        if (!this.mainExitMarker.getData('baseY')) this.mainExitMarker.setData('baseY', this.mainExitMarker.y);
        this.mainExitMarker.y = mainIso + Math.sin(time) * 5;
        
        const serviceIsoY = this.serviceExitMarker.getData('baseY') || this.serviceExitMarker.y;
        if (!this.serviceExitMarker.getData('baseY')) this.serviceExitMarker.setData('baseY', this.serviceExitMarker.y);
        this.serviceExitMarker.y = serviceIsoY + Math.sin(time) * 5;

        // Determine nearest exit
        const distMain = Phaser.Math.Distance.Between(this.player.gridX, this.player.gridY, 3.5, 36);
        const distService = Phaser.Math.Distance.Between(this.player.gridX, this.player.gridY, 33, 30);
        
        const isMainNearest = distMain < distService;
        const nearestExitName = isMainNearest ? 'MAIN EXIT' : 'MAINTENANCE EXIT';
        this.state.objective = `ESCAPE THE FACILITY\nTARGET: ${nearestExitName}`;
        
        // Edge directional pointer logic
        const targetMarker = isMainNearest ? this.mainExitMarker : this.serviceExitMarker;
        const cam = this.cameras.main;
        const targetPoint = { x: targetMarker.x, y: targetMarker.y };
        
        // If outside view
        if (!cam.worldView.contains(targetPoint.x, targetPoint.y)) {
            // Convert to screen space
            let screenX = (targetPoint.x - cam.worldView.x) * cam.zoom;
            let screenY = (targetPoint.y - cam.worldView.y) * cam.zoom;
            
            const padding = 40;
            const width = cam.width;
            const height = cam.height;
            
            let arrow = '';
            
            if (screenX < padding) { screenX = padding; arrow = '← '; }
            else if (screenX > width - padding) { screenX = width - padding; arrow = ' →'; }
            
            if (screenY < padding) { screenY = padding; arrow = '↑ ' + (arrow.trim() ? arrow.trim() : ''); }
            else if (screenY > height - padding) { screenY = height - padding; arrow = '↓ ' + (arrow.trim() ? arrow.trim() : ''); }
            
            // If arrow contains just direction, add name
            let text = arrow.includes('←') || arrow.includes('↑') ? arrow + nearestExitName : nearestExitName + arrow;
            if (!arrow) { text = nearestExitName; } // Fallback
            
            this.edgeIndicatorText.setText(text);
            this.edgeIndicatorText.setColor(isMainNearest ? '#ff3300' : '#ffa500');
            this.edgeIndicatorText.setPosition(screenX, screenY);
            this.edgeIndicatorText.setVisible(true);
        } else {
            this.edgeIndicatorText.setVisible(false);
        }
    }
    
    let isDetecting = false;
    let cctvAlert = false;
    let detectionSources: string[] = [];
    
    for (const c of this.cctvs) {
      c.update(delta);
      if (c.isDetecting) {
        if (!(c as any).wasDetecting) {
          audioManager.playSecurityAlarm('suspicious');
          this.showTacticalMessage('⚠ CCTV CONTACT', '#ff1744');
        }
        (c as any).wasDetecting = true;
        isDetecting = true;
        cctvAlert = true;
        detectionSources.push((c as any).id || 'CCTV');
        
        // CCTV -> Guard Communication (Broadcast last known pos)
        const playerGridX = this.player.gridX;
        const playerGridY = this.player.gridY;
        for (const g of this.guards) {
          // Send to guards within 15 tiles
          if (Phaser.Math.Distance.Between(g.gridX, g.gridY, c.gridX, c.gridY) < 15) {
            if ((g as any).receiveSecurityReport) {
              (g as any).receiveSecurityReport(playerGridX, playerGridY);
            }
          }
        }
      } else {
        (c as any).wasDetecting = false;
      }
    }
    
    for (const g of this.guards) {
      const prevState = (g as any).prevState;
      g.update(delta);
      const currState = g.currentState;
      
      if (currState !== prevState) {
        if (currState === 2) { // INVESTIGATE
          audioManager.playGuardState('investigate');
          this.showTacticalMessage('⚠ SECURITY INVESTIGATING', '#ffa500');
        } else if (currState === 4) { // CHASE
          audioManager.playGuardState('alert');
          this.showTacticalMessage('⚠ SECURITY PURSUIT', '#ff1744');
        }
      }
      (g as any).prevState = currState;
      
      if (g.isDetecting) {
        isDetecting = true;
        detectionSources.push((g as any).id || 'GUARD');
      }
    }

    if (this.state.debugMode) {
      this.debugText.setVisible(true);
      if (detectionSources.length > 0) {
        this.debugText.setText('DETECTED BY:\n' + detectionSources.join('\n'));
      } else {
        this.debugText.setText('');
      }
    } else {
      this.debugText.setVisible(false);
    }
    
    // Stealth & Detection Logic
    let detectionRate = 25; // base fill rate (4s to fail)
    if (this.player.isCrouching) detectionRate = 12; // (8.3s to fail)
    else if (this.player.isSprinting) detectionRate = 50; // (2s to fail)

    if (this.state.lootCollected) {
      detectionRate += 10; // Noise penalty for carrying loot
    }
    if (this.state.securityEscalated) {
      detectionRate *= 1.3;
    }

    const prevDetection = this.state.detection;

    // [VAULT LOOT FIX] While the player is physically inside the vault,
    // guards cannot enter and cannot maintain clear LOS through solid vault walls.
    // The open doorway raycast causes a false positive — guard LOS passes
    // through the door opening and incorrectly fills detection to 100 in ~3s,
    // ending the game mid-loot. Suppress detection accumulation from guard/CCTV
    // sight while player is safely inside the vault. The global timer still runs.
    const playerInVault = this.player.currentRoom === ROOM.VAULT;
    const effectivelyDetecting = isDetecting && !playerInVault;

    if (playerInVault && isDetecting) {
      console.log('[VAULT LOOT DEBUG] isDetecting=true suppressed — player inside vault. Sources:', detectionSources.join(', '));
    }

    if (effectivelyDetecting) {
      this.state.detection += (delta / 1000) * detectionRate;
    } else {
      let decayRate = this.state.isAlarmActive ? 5 : 15;
      this.state.detection -= (delta / 1000) * decayRate;
    }

    if (this.state.detection < 0) this.state.detection = 0;
    
    if (this.state.detection >= 100) {
      this.state.detection = 100;
      if (prevDetection < 100) {
        this.state.triggerSecurityContact();
      }
    }

    // Update Detection State string for HUD
    const prevStateStr = this.state.detectionState;
    if (this.state.detection < 30) {
      this.state.detectionState = 'NORMAL';
    } else if (this.state.detection < 60) {
      this.state.detectionState = 'SUSPICIOUS';
    } else if (this.state.detection < 85) {
      this.state.detectionState = 'SECURITY ALERT';
    } else if (this.state.detection < 100) {
      this.state.detectionState = 'CRITICAL';
    } else {
      this.state.detectionState = 'SECURITY CONTACT';
    }

    if (prevStateStr !== this.state.detectionState) {
      if (this.state.detectionState === 'SUSPICIOUS') {
        audioManager.playSecurityAlarm('suspicious');
      } else if (this.state.detectionState === 'SECURITY ALERT') {
        audioManager.playSecurityAlarm('alert');
      } else if (this.state.detectionState === 'CRITICAL') {
        audioManager.playSecurityAlarm('critical');
      }
    }

    if (this.state.vaultState === VAULT_STATE.BREACHING) {
        // Just empty to ensure minimap updates. The timer and detection still run.
    }

    // Phase 4: Constant visual feedback updates
    
    // CCTV Effect
    if (cctvAlert) {
        this.cctvOverlay.setAlpha(0.1 + Math.random() * 0.1);
        this.cctvOverlay.y = (this.time.now / 10) % this.scale.height;
    } else {
        this.cctvOverlay.setAlpha(0);
    }
    
    // Vault Effect
    if (this.player.currentRoom === ROOM.VAULT) {
        this.vaultOverlay.setAlpha(0.05 + Math.abs(Math.sin(this.time.now / 500)) * 0.05);
    } else {
        this.vaultOverlay.setAlpha(0);
    }
    
    // Detection Effect
    const det = this.state.detection;
    let targetAlpha = 0;
    let pulse = 0;
    let color = 0xff0000;
    
    if (det >= 30 && det < 60) {
        targetAlpha = 0.1;
        color = 0xffaa00;
    } else if (det >= 60 && det < 85) {
        pulse = Math.abs(Math.sin(this.time.now / 200));
        targetAlpha = 0.2 + pulse * 0.15;
        color = 0xff3300;
    } else if (det >= 85 && det < 100) {
        pulse = Math.abs(Math.sin(this.time.now / 100));
        targetAlpha = 0.4 + pulse * 0.3;
        color = 0xff0000;
    } else if (det >= 100) {
        targetAlpha = 0.8;
        color = 0xff0000;
    }
    
    if (this.detectionOverlay.getData('color') !== color) {
        this.detectionOverlay.clear();
        this.detectionOverlay.lineStyle(20, color, 1);
        this.detectionOverlay.strokeRect(0, 0, this.scale.width, this.scale.height);
        this.detectionOverlay.setData('color', color);
    }
    this.detectionOverlay.setAlpha(targetAlpha);

    this.minimap.update();
  }

  private rebuildHUD(): void {
    this.hudContainer.removeAll(true);
    this.drawHUD();
    this.minimap.resize();
    this.syncHUD();
  }

  private drawHUD(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Top Left: Mission Phase
    const tlBg = this.add.graphics();
    tlBg.fillStyle(0x0a1526, 0.85); // dark navy/steel
    tlBg.fillRect(10, 10, 240, 70);
    tlBg.lineStyle(1, 0x00e5ff, 0.4);
    tlBg.strokeRect(10, 10, 240, 70);
    this.hudContainer.add(tlBg);

    this.hudContainer.add(this.add.text(20, 20, 'BLACKOUT HQ', { fontFamily: '"Orbitron", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }));
    this.hudContainer.add(this.add.text(20, 42, 'LEVEL 01', { fontFamily: '"Share Tech Mono", monospace', fontSize: '12px', color: '#00e5ff' }));
    
    this.phaseText = this.add.text(90, 42, 'INFILTRATION', { fontFamily: '"Share Tech Mono", monospace', fontSize: '12px', color: '#ff6b00' });
    this.hudContainer.add(this.phaseText);

    // Top Center: Timer
    this.tcBg = this.add.graphics();
    this.tcBg.fillStyle(0x0a1526, 0.85);
    this.tcBg.fillRect(W / 2 - 75, 10, 150, 45);
    this.tcBg.lineStyle(1, 0x00e5ff, 0.4);
    this.tcBg.strokeRect(W / 2 - 75, 10, 150, 45);
    this.hudContainer.add(this.tcBg);

    this.timerText = this.add.text(W / 2, 32, '03:00', { fontFamily: '"Orbitron", monospace', fontSize: '26px', color: '#00e5ff', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
    this.hudContainer.add(this.timerText);

    // Containment HUD
    this.containmentBg = this.add.graphics();
    this.containmentBg.fillStyle(0x1a0033, 0.9);
    this.containmentBg.fillRect(W / 2 - 90, 60, 180, 50);
    this.containmentBg.lineStyle(1, 0x8800ff, 0.8);
    this.containmentBg.strokeRect(W / 2 - 90, 60, 180, 50);
    this.containmentBg.setVisible(false);
    this.hudContainer.add(this.containmentBg);

    this.containmentLabelText = this.add.text(W / 2, 70, 'SECURITY CONTAINMENT', { fontFamily: '"Orbitron", monospace', fontSize: '11px', color: '#8800ff' }).setOrigin(0.5).setVisible(false);
    this.hudContainer.add(this.containmentLabelText);

    this.containmentSubText = this.add.text(W / 2, 83, 'SECURITY HOLDS POSITION', { fontFamily: '"Share Tech Mono", monospace', fontSize: '9px', color: '#ff6b00' }).setOrigin(0.5).setVisible(false);
    this.hudContainer.add(this.containmentSubText);

    this.containmentTimerText = this.add.text(W / 2, 98, '15', { fontFamily: '"Orbitron", monospace', fontSize: '18px', color: '#8800ff' }).setOrigin(0.5).setVisible(false);
    this.hudContainer.add(this.containmentTimerText);

    // Top Right: Detection
    const trBg = this.add.graphics();
    trBg.fillStyle(0x0a1526, 0.85);
    trBg.fillRect(W - 250, 10, 240, 70);
    trBg.lineStyle(1, 0x00e5ff, 0.4);
    trBg.strokeRect(W - 250, 10, 240, 70);
    this.hudContainer.add(trBg);

    this.hudContainer.add(this.add.text(W - 235, 20, 'DETECTION', { fontFamily: '"Orbitron", monospace', fontSize: '14px', color: '#00e5ff' }));
    
    this.detectionStatusText = this.add.text(W - 235, 42, 'NORMAL', { fontFamily: '"Share Tech Mono", monospace', fontSize: '12px', color: '#00ff00' });
    this.hudContainer.add(this.detectionStatusText);

    const detBarBg = this.add.graphics();
    detBarBg.fillStyle(0x000000, 1);
    detBarBg.fillRect(W - 160, 43, 130, 10);
    this.hudContainer.add(detBarBg);

    this.detBarFill = this.add.graphics();
    this.hudContainer.add(this.detBarFill);

    this.securityEscalationText = this.add.text(W - 235, 85, 'SECURITY: ALERT', { fontFamily: '"Orbitron", monospace', fontSize: '12px', color: '#ff1744', fontStyle: 'bold' }).setVisible(false);
    this.hudContainer.add(this.securityEscalationText);

    // Bottom Center: Objective
    const bcBg = this.add.graphics();
    bcBg.fillStyle(0x0a1526, 0.85);
    bcBg.fillRect(W / 2 - 150, H - 70, 300, 50);
    bcBg.lineStyle(1, 0x00e5ff, 0.4);
    bcBg.strokeRect(W / 2 - 150, H - 70, 300, 50);
    this.hudContainer.add(bcBg);

    this.hudContainer.add(this.add.text(W / 2, H - 60, 'OBJECTIVE', { fontFamily: '"Orbitron", monospace', fontSize: '10px', color: '#00e5ff', align: 'center' }).setOrigin(0.5));
    
    this.objectiveText = this.add.text(W / 2, H - 40, this.state.objective, { fontFamily: '"Share Tech Mono", monospace', fontSize: '14px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.hudContainer.add(this.objectiveText);

    // Bottom Left: Player Status
    const blBg = this.add.graphics();
    blBg.fillStyle(0x0a1526, 0.85);
    blBg.fillRect(10, H - 70, 160, 50);
    blBg.lineStyle(1, 0x00e5ff, 0.4);
    blBg.strokeRect(10, H - 70, 160, 50);
    this.hudContainer.add(blBg);

    this.hudContainer.add(this.add.text(20, H - 60, 'STATUS', { fontFamily: '"Orbitron", monospace', fontSize: '10px', color: '#00e5ff' }));
    
    this.playerStatusText = this.add.text(20, H - 40, 'NORMAL', { fontFamily: '"Share Tech Mono", monospace', fontSize: '14px', color: '#ffffff' });
    this.hudContainer.add(this.playerStatusText);

    this.syncHUD();
  }

  private syncHUD(): void {
    const W = this.scale.width;
    
    // Update phaseText based on objective or state
    if (this.state.lootCollected) {
        this.phaseText.setText('ESCAPE');
    } else if (this.state.vaultState === VAULT_STATE.OPEN) {
        this.phaseText.setText('LOOT');
    } else if (this.state.vaultState === VAULT_STATE.BREACHING) {
        this.phaseText.setText('VAULT BREACH');
    } else {
        this.phaseText.setText('INFILTRATION');
    }

    // Format Timer
    const m = Math.floor(this.state.timeRemaining / 60);
    const s = Math.floor(this.state.timeRemaining % 60);
    this.timerText.setText(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    
    this.tcBg.clear();
    this.tcBg.fillStyle(0x0a1526, 0.85);
    this.tcBg.fillRect(W / 2 - 75, 10, 150, 45);
    if (this.state.timeRemaining <= 30) {
        this.timerText.setColor('#ff1744');
        this.timerText.setAlpha((this.time.now % 500 < 250) ? 0.5 : 1);
        this.tcBg.lineStyle(1, 0xff1744, 0.8);
    } else if (this.state.timeRemaining <= 60) {
        this.timerText.setColor('#ffaa00');
        this.timerText.setAlpha(1);
        this.tcBg.lineStyle(1, 0xffaa00, 0.6);
    } else {
        this.timerText.setColor('#00e5ff');
        this.timerText.setAlpha(1);
        this.tcBg.lineStyle(1, 0x00e5ff, 0.4);
    }
    this.tcBg.strokeRect(W / 2 - 75, 10, 150, 45);

    // Containment Sync
    let maxContainmentTime = 0;
    for (const g of this.guards) {
       if (g.currentState === 6) { // GUARD_STATE.VAULT_CONTAINMENT
           if (g.containmentTimeRemaining > maxContainmentTime) {
               maxContainmentTime = g.containmentTimeRemaining;
           }
       }
    }
    
    if (maxContainmentTime > 0) {
       this.wasInContainment = true;
       this.containmentBg.setVisible(true);
       this.containmentLabelText.setVisible(true);
       this.containmentSubText.setVisible(true);
       this.containmentTimerText.setVisible(true);
       
       const contSecs = Math.ceil(maxContainmentTime / 1000);
       this.containmentTimerText.setText(contSecs.toString().padStart(2, '0'));
    } else {
       if (this.wasInContainment) {
           this.wasInContainment = false;
           this.showTacticalMessage('CONTAINMENT ENDED\nSECURITY ACTIVE', '#ff1744');
       }
       this.containmentBg.setVisible(false);
       this.containmentLabelText.setVisible(false);
       this.containmentSubText.setVisible(false);
       this.containmentTimerText.setVisible(false);
    }

    // Objective
    let lines = this.state.objective.split('\n');
    let mainObj = lines[0];
    if (mainObj.includes('TARGET:')) {
      // It's part of the escape objective formatting
      this.objectiveText.setText(this.state.objective);
    } else {
      this.objectiveText.setText(mainObj);
    }
    
    if (this.state.isAlarmActive) {
      this.objectiveText.setColor('#ff1744');
    } else {
      this.objectiveText.setColor('#ffffff');
    }

    // Detection Fill
    this.detBarFill.clear();
    const detColor = this.state.detection < 30 ? 0x00ff00 : (this.state.detection < 60 ? 0xffaa00 : (this.state.detection < 85 ? 0xff3300 : 0xff1744));
    this.detBarFill.fillStyle(detColor, 1);
    this.detBarFill.fillRect(W - 160, 43, 130 * (this.state.detection / 100), 10);

    this.detectionStatusText.setText(this.state.detectionState);
    this.detectionStatusText.setColor(this.state.detection < 30 ? '#00ff00' : (this.state.detection < 60 ? '#ffaa00' : (this.state.detection < 85 ? '#ff3300' : '#ff1744')));

    // Player Status
    if (this.player.isCrouching) {
        this.playerStatusText.setText('CROUCH');
        this.playerStatusText.setColor('#00e5ff');
    } else if (this.player.isSprinting) {
        this.playerStatusText.setText('SPRINT');
        this.playerStatusText.setColor('#ffaa00');
    } else {
        this.playerStatusText.setText('NORMAL');
        this.playerStatusText.setColor('#ffffff');
    }

    // Security Escalation
    if (this.state.securityEscalated) {
      this.securityEscalationText.setVisible(true);
      // Optional pulse
      this.securityEscalationText.setAlpha((this.time.now % 1000 < 500) ? 0.7 : 1);
    } else {
      this.securityEscalationText.setVisible(false);
    }
  }
}
