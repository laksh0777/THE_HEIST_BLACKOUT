export enum VAULT_STATE {
  LOCKED = 'LOCKED',
  BREACHING = 'BREACHING',
  OPEN = 'OPEN',
  LOOTING = 'LOOTING',
  COLLECTED = 'COLLECTED'
}

export class GameState {
  private static instance: GameState;

  public currentMissionId: string | null = null;
  public securityLevel: number = 1;
  public detection: number = 0;
  public strikes: number = 0;
  public timeRemaining: number = 180; // 3 minutes in seconds
  public objective: string = 'INFILTRATE FACILITY';
  public isPaused: boolean = false;
  public isAlarmActive: boolean = false;
  public lootCollected: boolean = false;
  public lootValue: number = 0;
  public detectionState: string = 'NORMAL';
  public debugMode: boolean = false;
  public vaultState: VAULT_STATE = VAULT_STATE.LOCKED;
  public vaultBreachProgress: number = 0; // 0–100
  public securityEscalated: boolean = false;
  public missionFailed: boolean = false;

  private constructor() {}

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  public resetMission(missionId: string, securityLevel: number): void {
    this.currentMissionId = missionId;
    this.securityLevel = securityLevel;
    this.detection = 0;
    this.strikes = 0;
    this.timeRemaining = 180;
    this.objective = 'INFILTRATE FACILITY';
    this.isPaused = false;
    this.isAlarmActive = false;
    this.lootCollected = false;
    this.lootValue = 0;
    this.detectionState = 'NORMAL';
    this.debugMode = false;
    this.vaultState = VAULT_STATE.LOCKED;
    this.vaultBreachProgress = 0;
    this.securityEscalated = false;
    this.missionFailed = false;
  }

  public triggerSecurityContact(): void {
    this.strikes += 1;
    this.isAlarmActive = true;
    this.objective = 'MISSION FAILED - SECURITY CONTACT';
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }
}
