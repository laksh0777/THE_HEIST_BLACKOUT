import Phaser from 'phaser';
import { Player } from '../entities/Player';

export class CameraController {
  private scene: Phaser.Scene;
  private player: Player;
  
  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    const cam = this.scene.cameras.main;
    
    // The camera will follow the player's container
    cam.startFollow(this.player.container, true, 0.15, 0.15);
    
    // Add a slight deadzone so the camera doesn't jitter on small movements
    cam.setDeadzone(30, 30);
    cam.setZoom(1.0);
  }

  public setBounds(x: number, y: number, width: number, height: number): void {
    this.scene.cameras.main.setBounds(x, y, width, height);
  }

  public centerOnPlayer(): void {
    this.scene.cameras.main.centerOn(this.player.container.x, this.player.container.y);
  }
}
