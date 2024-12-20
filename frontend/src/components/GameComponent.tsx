import { useEffect, useState, useRef } from "react";
import Phaser from "phaser";
import unlockSound from '/unlock.wav';

interface GameComponentProps {
  onScoreUpdate: (score: number) => void;
}

export function GameComponent({ onScoreUpdate }: GameComponentProps) {
  const [localScore, setLocalScore] = useState(0);
  const gameRef = useRef<Phaser.Game | null>(null);
  const scoreRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    scoreRef.current = localScore;
  }, [localScore]);

  useEffect(() => {
    audioRef.current = new Audio(unlockSound);

    class GameScene extends Phaser.Scene {
      private mammoth?: Phaser.GameObjects.Sprite;
      private pipes: Phaser.GameObjects.Rectangle[];
      private score: number;
      private scoreText?: Phaser.GameObjects.Text;
      private gameOver: boolean;
      private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
      private velocity: number;
      private gameWidth: number;
      private gameHeight: number;
      
      constructor() {
        super({ key: "GameScene" });
        this.pipes = [];
        this.score = 0;
        this.gameOver = false;
        this.velocity = 0;
        this.gameWidth = 600;
        this.gameHeight = 420;
      }
      
      preload() {
        // Load mammoth animations
        for (let i = 0; i <= 19; i++) {
          const frameNum = i.toString().padStart(3, "0");
          this.load.image(
            `idle_${i}`,
            `/key_frames/__mammoth_ilde_${frameNum}.png`,
          );
        }

        for (let i = 0; i <= 9; i++) {
          const frameNum = i.toString().padStart(3, "0");
          this.load.image(
            `flick_${i}`,
            `/key_frames/__mammoth_head_flick_${frameNum}.png`,
          );
        }

        for (let i = 0; i <= 4; i++) {
          const frameNum = i.toString().padStart(3, "0");
          this.load.image(
            `die_${i}`,
            `/key_frames/__mammoth_die_${frameNum}.png`,
          );
        }

        // Load tentacle plant parts
        const colors = ['blue', 'green', 'orange', 'pink', 'red', 'yellow'];
        colors.forEach(color => {
          this.load.image(
            `tentacle_top_${color}`,
            `/plants/tentacle_plant/tentacle_plant_part_1_${color}.png`
          );
          this.load.image(
            `tentacle_middle_${color}`,
            `/plants/tentacle_plant/tentacle_plant_part_2_${color}.png`
          );
          this.load.image(
            `tentacle_bottom_${color}`,
            `/plants/tentacle_plant/tentacle_plant_part_3_${color}.png`
          );
        });
      }

      create() {
        // Create a simple blue background
        this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0x87CEEB)
          .setOrigin(0, 0);

        // Create mammoth and flip it horizontally
        this.mammoth = this.add.sprite(100, this.gameHeight / 2, "idle_0");
        this.mammoth.setScale(0.1);  // Reduced size for better gameplay
        this.mammoth.setDepth(1);
        this.mammoth.setFlipX(true);

        // Create animations
        const idleFrames = Array.from({ length: 20 }, (_, i) => ({
          key: `idle_${i}`,
        }));

        const flickFrames = Array.from({ length: 10 }, (_, i) => ({
          key: `flick_${i}`,
        }));

        const dieFrames = Array.from({ length: 5 }, (_, i) => ({
          key: `die_${i}`,
        }));

        this.anims.create({
          key: "idle",
          frames: idleFrames,
          frameRate: 24,
          repeat: -1,
        });

        this.anims.create({
          key: "flick",
          frames: flickFrames,
          frameRate: 24,
          repeat: 0,
        });

        this.anims.create({
          key: "die",
          frames: dieFrames,
          frameRate: 12,
          repeat: 0,
        });

        this.mammoth.play("idle");

        // Initialize cursor keys
        this.cursors = this.input?.keyboard?.createCursorKeys();

        // Add score text with higher depth
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
          fontSize: '32px',
          color: '#000'
        }).setDepth(1000); // Ensures score appears above other elements

        // Create initial pipes
        this.createPipes();

        // Start the game
        this.gameOver = false;
        this.velocity = 0;
      }

      createPipes() {
        const gap = 250;
        const pipeWidth = 50;
        const minHeight = 50;
        const maxHeight = this.gameHeight - gap - minHeight;
        const topHeight = Phaser.Math.Between(minHeight, maxHeight);
        
        // Adjust x position based on the last pipe's position
        let x = this.gameWidth + pipeWidth;
        if (this.pipes.length > 0) {
          const lastPipe = this.pipes[this.pipes.length - 1];
          // Add some spacing between pipe pairs
          x = Math.max(x, lastPipe.x + 300);
        }

        // Create top pipe
        const topPipe = this.add.rectangle(x, topHeight / 2, pipeWidth, topHeight, 0x00FF00);
        
        // Create bottom pipe
        const bottomPipe = this.add.rectangle(
          x,
          topHeight + gap + (this.gameHeight - (topHeight + gap)) / 2,
          pipeWidth,
          this.gameHeight - (topHeight + gap),
          0x00FF00
        );

        this.pipes.push(topPipe, bottomPipe);
      }

      update() {
        if (this.gameOver && this.cursors?.space?.isDown && this.cursors.space.getDuration() < 100) {
          this.restart();
          return;
        }

        if (!this.mammoth || !this.cursors) return;

        // Apply gravity
        this.velocity += 0.5;
        this.mammoth.y += this.velocity;

        // Flap when spacebar is pressed
        if (this.cursors?.space?.isDown && this.cursors.space.getDuration() < 100) {
          this.velocity = -10;
          this.mammoth?.play('flick', true);
          this.mammoth?.once('animationcomplete', () => {
            this.mammoth?.play('idle', true);
          });
        }

        // Move pipes
        for (let i = 0; i < this.pipes.length; i++) {
          const pipe = this.pipes[i];
          pipe.x -= 3;

          // Check for collision
          if (this.mammoth && this.checkCollision(this.mammoth, pipe)) {
            this.gameOver = true;
            this.mammoth.play('die');
            return;
          }

          // Add score when passing pipes (check when mammoth passes the right edge of pipes)
          if (this.mammoth && pipe.x + pipe.width < this.mammoth.x && !pipe.getData('scored')) {
            // Only increment score for one pipe in the pair (top pipe)
            if (i % 2 === 0) {
              this.score += 1;
              if (this.scoreText) {
                this.scoreText.setText('Score: ' + this.score);
              }
              setLocalScore(this.score);
              onScoreUpdate(this.score);
              // Mark both pipes in the pair as scored
              pipe.setData('scored', true);
              if (this.pipes[i + 1]) {
                this.pipes[i + 1].setData('scored', true);
              }
            }
          }

          // Remove pipes that are off screen
          if (pipe.x < -pipe.width) {
            pipe.destroy();
            this.pipes.splice(i, 1);
            i--;
          }
        }

        // Create new pipes
        if (this.pipes.length < this.getMaxPipes()) {
          this.createPipes();
        }

        // Check if mammoth is out of bounds
        if (this.mammoth.y < 0 || this.mammoth.y > this.gameHeight) {
          this.gameOver = true;
          this.mammoth.play('die');
        }
      }

      getMaxPipes() {
        // Start with 4 pipes (2 pairs) and add more based on score
        // Every 5 points adds another pair of pipes, up to a maximum of 12 pipes (6 pairs)
        const basePipes = 4;
        const additionalPairs = Math.floor(this.score / 5);
        const maxPipes = Math.min(basePipes + (additionalPairs * 2), 12);
        return maxPipes;
      }

      checkCollision(mammoth: Phaser.GameObjects.Sprite, pipe: Phaser.GameObjects.Rectangle) {
        const mammothBounds = mammoth.getBounds();
        const pipeBounds = pipe.getBounds();
        
        // Create a smaller hitbox for the mammoth (30% of original size)
        const hitboxScale = 0.3;
        const mammothHitbox = new Phaser.Geom.Rectangle(
          mammothBounds.x + mammothBounds.width * (1 - hitboxScale) / 2,
          mammothBounds.y + mammothBounds.height * (1 - hitboxScale) / 2,
          mammothBounds.width * hitboxScale,
          mammothBounds.height * hitboxScale
        );

        return Phaser.Geom.Intersects.RectangleToRectangle(mammothHitbox, pipeBounds);
      }

      restart() {
        // Reset game state
        this.gameOver = false;
        this.score = 0;
        if (this.scoreText) {
          this.scoreText.setText('Score: 0');
        }
        
        // Reset mammoth position and velocity
        if (this.mammoth) {
          this.mammoth.y = this.gameHeight / 2;
          this.mammoth.play('idle');
        }
        this.velocity = 0;
        
        // Clear existing pipes
        this.pipes.forEach(pipe => pipe.destroy());
        this.pipes = [];
        
        // Create new initial pipes
        this.createPipes();
        
        // Reset score in React component
        setLocalScore(0);
        onScoreUpdate(0);
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: "game-container",
      width: 600,
      height: 420,
      scene: GameScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      }
    };

    try {
      gameRef.current = new Phaser.Game(config);

      return () => {
        gameRef.current?.destroy(true);
      };
    } catch (error) {
      console.error("Error initializing Phaser:", error);
    }
  }, []);

  return (
    <div className="game-wrapper">
      <div
        id="game-container"
        style={{ border: "2px solid #333", marginBottom: "20px" }}
      ></div>
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        Score: {localScore}
      </div>
      <p className="game-instructions">
        Press SPACE to flap! Avoid the pipes and try to get the highest score possible.
        {localScore > 0 && <br />}
        {localScore > 0 && <span>Game Over! Press SPACE to restart.</span>}
      </p>
    </div>
  );
}