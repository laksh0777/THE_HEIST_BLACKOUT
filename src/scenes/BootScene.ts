import Phaser from 'phaser';
import { SCENES } from '../core/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  // No assets to preload in Milestone 1 — all graphics are procedural.
  preload(): void {}

  create(): void {
    // Immediately hand off to the loading scene.
    this.scene.start(SCENES.LOADING);
  }
}
