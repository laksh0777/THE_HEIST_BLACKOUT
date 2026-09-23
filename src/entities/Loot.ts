import Phaser from 'phaser';

export class Loot {
  private scene: Phaser.Scene;
  public gridX: number;
  public gridY: number;
  
  private graphics: Phaser.GameObjects.Graphics;
  private container: Phaser.GameObjects.Container;
  private label: Phaser.GameObjects.Text;
  
  // Isometric settings (matched with MapManager)
  private tileWidth = 64;
  private tileHeight = 32;
  private originX: number;
  private originY = 100;
  
  private tween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number, mapWidth: number = 40) {
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;
    this.originX = (mapWidth * this.tileWidth) / 2;
    
    this.container = this.scene.add.container();
    this.container.setDepth(25); // Above floor and vault features
    
    this.graphics = this.scene.add.graphics();
    this.container.add(this.graphics);
    
    this.label = this.scene.add.text(0, -30, '₹100 CASH', {
      fontFamily: '"Orbitron", monospace',
      fontSize: '10px',
      color: '#00e5ff',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.container.add(this.label);
    
    this.render();
    
    // Add floating animation
    const basePos = this.toIso(this.gridX, this.gridY);
    this.container.setPosition(basePos.x, basePos.y);
    
    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: basePos.y - 10,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private toIso(tx: number, ty: number) {
    const isoX = this.originX + (tx - ty) * (this.tileWidth / 2);
    const isoY = this.originY + (tx + ty) * (this.tileHeight / 2);
    return { x: isoX, y: isoY };
  }

  private render(): void {
    this.graphics.clear();
    
    // Draw a small stack of cash
    const stackHeight = 8;
    const w = 12;
    const d = 8;
    
    // Shadow
    this.graphics.fillStyle(0x000000, 0.4);
    this.graphics.fillEllipse(0, 0, w * 2.5, d * 1.5);
    
    for (let i = 0; i < stackHeight; i++) {
        const y = -i * 1.5;
        // Sides
        this.graphics.fillStyle(0x005566, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(0, y + d);
        this.graphics.lineTo(-w, y);
        this.graphics.lineTo(-w, y + 2);
        this.graphics.lineTo(0, y + d + 2);
        this.graphics.fillPath();

        this.graphics.fillStyle(0x004455, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(0, y + d);
        this.graphics.lineTo(w, y);
        this.graphics.lineTo(w, y + 2);
        this.graphics.lineTo(0, y + d + 2);
        this.graphics.fillPath();
    }
    
    // Top bill
    const topY = -stackHeight * 1.5;
    this.graphics.fillStyle(0x00e5ff, 1); // Cyan cash
    this.graphics.beginPath();
    this.graphics.moveTo(0, topY - d);
    this.graphics.lineTo(w, topY);
    this.graphics.lineTo(0, topY + d);
    this.graphics.lineTo(-w, topY);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    // Cyberpunk accent
    this.graphics.lineStyle(1, 0xffffff, 0.8);
    this.graphics.strokePath();
    
    this.graphics.fillStyle(0xffd700, 1); // Amber strap
    this.graphics.beginPath();
    this.graphics.moveTo(-2, topY - d + 2);
    this.graphics.lineTo(2, topY - d + 4);
    this.graphics.lineTo(0, topY + d);
    this.graphics.lineTo(-4, topY + d - 2);
    this.graphics.closePath();
    this.graphics.fillPath();
  }
  
  public destroy(): void {
    if (this.tween) {
      this.tween.stop();
    }
    this.container.destroy();
  }
}
