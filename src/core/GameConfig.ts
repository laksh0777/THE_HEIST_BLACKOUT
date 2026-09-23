import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './Constants';

import { BootScene }          from '../scenes/BootScene';
import { LoadingScene }       from '../scenes/LoadingScene';
import { MainMenuScene }      from '../scenes/MainMenuScene';
import { MissionSelectScene } from '../scenes/MissionSelectScene';
import { NightmareModeScene } from '../scenes/NightmareModeScene';
import { HowToPlayScene }     from '../scenes/HowToPlayScene';
import { SettingsScene }      from '../scenes/SettingsScene';
import { InfiltrationScene }  from '../scenes/InfiltrationScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width:  GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#010810',
  parent: 'game-container',
  scene: [
    BootScene,
    LoadingScene,
    MainMenuScene,
    MissionSelectScene,
    NightmareModeScene,
    HowToPlayScene,
    SettingsScene,
    InfiltrationScene,
  ],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      GAME_WIDTH,
    height:     GAME_HEIGHT,
    min: { width: 640, height: 360 },
    max: { width: 2560, height: 1440 },
  },
  render: {
    antialias:   false,
    pixelArt:    false,
    roundPixels: true,
  },
  fps: { target: 60, forceSetTimeOut: false },
};
