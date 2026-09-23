// ============================================================
// PALETTE — single source of truth for all colours
// ============================================================
export const PALETTE = {
  GRAPHITE:   0x111111,
  GRAPHITE_L: 0x1a1a1a,
  BG:         0x010810,   // deep navy-black
  BG_MID:     0x030f1e,
  STEEL:      0x1c2430,
  STEEL_D:    0x0a1628,
  NAVY:       0x010810,
  CYAN:       0x00e5ff,
  CYAN_DIM:   0x0099bb,
  BLUE:       0x1565c0,
  PURPLE:     0xaa00ff,
  ORANGE:     0xff6b00,
  RED:        0xff1744,
  GREEN:      0x00e676,
  GOLD:       0xffd600,
  AMBER:      0xffb300,
  WHITE:      0xffffff,
  GREY:       0x3a4a5a,
  GREY_DIM:   0x1a2535,
} as const;

export const THEME = {
  background: PALETTE.GRAPHITE,
  floor: PALETTE.STEEL_D,
  floorSecondary: PALETTE.BG_MID,
  wall: PALETTE.STEEL,
  wallEdge: PALETTE.CYAN_DIM,
  steel: PALETTE.STEEL,
  cyan: PALETTE.CYAN,
  blue: PALETTE.BLUE,
  purple: PALETTE.PURPLE,
  warning: PALETTE.ORANGE,
  danger: PALETTE.RED,
  vault: PALETTE.AMBER,
  text: PALETTE.WHITE,
  mutedText: PALETTE.CYAN_DIM,
  uiPanel: PALETTE.GRAPHITE_L,
  uiBorder: PALETTE.CYAN,
} as const;

// ============================================================
// SCENE KEYS — never hard-code strings elsewhere
// ============================================================
export const SCENES = {
  BOOT:           'BootScene',
  LOADING:        'LoadingScene',
  MAIN_MENU:      'MainMenuScene',
  MISSION_SELECT: 'MissionSelectScene',
  NIGHTMARE:      'NightmareModeScene',
  HOW_TO_PLAY:    'HowToPlayScene',
  SETTINGS:       'SettingsScene',
  INFILTRATION:   'InfiltrationScene',
} as const;

// ============================================================
// GAME DIMENSIONS
// ============================================================
export const GAME_WIDTH  = 1280;
export const GAME_HEIGHT = 720;
