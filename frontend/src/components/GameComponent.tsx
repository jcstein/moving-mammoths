import { useEffect, useState, useRef } from "react";
import Phaser from "phaser";
import unlockSound from '/unlock.wav';
import footstepsSound from '/footsteps.wav';
import backgroundNoise from '/rustle-2.wav';
import thudSound from '/thud.wav';

interface GameComponentProps {
  onScoreUpdate: (score: number) => void;
}

export function GameComponent({ onScoreUpdate }: GameComponentProps) {
  const [localScore, setLocalScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const gameRef = useRef<Phaser.Game | null>(null);
  const scoreRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const footstepsRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const thudRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    scoreRef.current = localScore;
  }, [localScore]);

  useEffect(() => {
    audioRef.current = new Audio(unlockSound);
    footstepsRef.current = new Audio(footstepsSound);
    backgroundMusicRef.current = new Audio(backgroundNoise);
    thudRef.current = new Audio(thudSound);

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.volume = 0.3;
      backgroundMusicRef.current.play().catch(error => {
        console.error("Error playing background music:", error);
      });
    }

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
      private farMountains?: Phaser.GameObjects.TileSprite;
      private midMountains?: Phaser.GameObjects.TileSprite;
      private foreMountains?: Phaser.GameObjects.TileSprite;
      
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

        // Add whacked animation frames
        for (let i = 0; i <= 9; i++) {
          const frameNum = i.toString().padStart(3, "0");
          this.load.image(
            `whacked_${i}`,
            `/key_frames/__mammoth_whacked_${frameNum}.png`,
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

        this.load.image('sky', '/background/sky_colour.png');
        this.load.image('mountains-far', '/background/farground_mountains.png');
        this.load.image('mountains-mid', '/background/midground_mountains.png');
        this.load.image('mountains-fore', '/background/foreground.png');
      }

      create() {
        // Base sky layer
        this.add.image(0, 0, 'sky')
          .setOrigin(0, 0)
          .setDisplaySize(this.gameWidth, this.gameHeight)
          .setDepth(-3);

        // Create tiling sprites for mountains
        this.farMountains = this.add.tileSprite(
          0,
          this.gameHeight - 100,
          this.gameWidth,
          300,
          'mountains-far'
        )
          .setOrigin(0, 1)
          .setDepth(-2);

        this.midMountains = this.add.tileSprite(
          0,
          this.gameHeight - 50,
          this.gameWidth,
          250,
          'mountains-mid'
        )
          .setOrigin(0, 1)
          .setDepth(-1);

        this.foreMountains = this.add.tileSprite(
          0,
          this.gameHeight,
          this.gameWidth,
          150,
          'mountains-fore'
        )
          .setOrigin(0, 1)
          .setDepth(-0.5);

        // Create a duplicate of each layer for seamless scrolling
        this.add.image(this.gameWidth, 0, 'mountains-far')
          .setOrigin(0, 1)
          .setY(this.gameHeight - 100)
          .setDisplaySize(this.gameWidth, 300)
          .setDepth(-2);

        this.add.image(this.gameWidth, 0, 'mountains-mid')
          .setOrigin(0, 1)
          .setY(this.gameHeight - 50)
          .setDisplaySize(this.gameWidth, 250)
          .setDepth(-1);

        this.add.image(this.gameWidth, 0, 'mountains-fore')
          .setOrigin(0, 1)
          .setY(this.gameHeight)
          .setDisplaySize(this.gameWidth, 150)
          .setDepth(-0.5);

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

        const whackedFrames = Array.from({ length: 10 }, (_, i) => ({
          key: `whacked_${i}`,
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

        this.anims.create({
          key: "whacked",
          frames: whackedFrames,
          frameRate: 24,
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
        const gap = this.getGapSize();
        const pipeWidth = 50;
        const minHeight = 50;
        const maxHeight = this.gameHeight - gap - minHeight;
        const topHeight = Phaser.Math.Between(minHeight, maxHeight);
        
        let x = this.gameWidth + pipeWidth;
        if (this.pipes.length > 0) {
          const lastPipe = this.pipes[this.pipes.length - 1];
          // Reduce spacing between pipes as score increases
          const pipeSpacing = Math.max(250, 300 - Math.floor(this.score / 50) * 10);
          x = Math.max(x, lastPipe.x + pipeSpacing);
        }

        const topPipe = this.add.rectangle(x, topHeight / 2, pipeWidth, topHeight, 0x00FF00)
          .setDepth(0);
        
        const bottomPipe = this.add.rectangle(
          x,
          topHeight + gap + (this.gameHeight - (topHeight + gap)) / 2,
          pipeWidth,
          this.gameHeight - (topHeight + gap),
          0x00FF00
        ).setDepth(0);

        this.pipes.push(topPipe, bottomPipe);
      }

      update() {
        if (!this.gameOver) {
          // Move backgrounds using tilePosition
          if (this.farMountains) {
            this.farMountains.tilePositionX += 0.5;
          }
          
          if (this.midMountains) {
            this.midMountains.tilePositionX += 1;
          }
          
          if (this.foreMountains) {
            this.foreMountains.tilePositionX += 1.5;
          }
        }

        if (this.gameOver && this.cursors?.space?.isDown && this.cursors.space.getDuration() < 100) {
          this.restart();
          return;
        }
      
        if (!this.mammoth || !this.cursors) return;
      
        // Only apply gravity if game is not over
        if (!this.gameOver) {
          this.velocity += 0.5;
          this.mammoth.y += this.velocity;
        
          // Check boundaries with adjusted height for visual death point
          const visualHeight = this.mammoth.height * this.mammoth.scale * 0.3; // Reduced to 30% for lower death point
          if (this.mammoth.y < 0 || this.mammoth.y + visualHeight >= this.gameHeight) {
            this.gameOver = true;
            // Play whacked animation first
            if (this.mammoth) {
              this.mammoth.play('whacked');
              this.mammoth.once('animationcomplete', () => {
                if (this.mammoth) {
                  this.mammoth.play('die');
                }
              });
            }
            setIsGameOver(true);
            if (thudRef.current) {
              thudRef.current.play();
            }
            // Keep mammoth very close to bottom when dying
            if (this.mammoth.y + visualHeight > this.gameHeight) {
              this.mammoth.y = this.gameHeight - (visualHeight * 1.1); // Small offset to keep visible
            }
            this.velocity = 0;
            return;
          }
        
          // Move mammoth up when spacebar is pressed
          if (this.cursors?.space?.isDown && this.cursors.space.getDuration() < 100) {
            this.velocity = -10;
            // Reset and play the footsteps sound
            if (footstepsRef.current) {
              footstepsRef.current.currentTime = 0;
              footstepsRef.current.play();
            }
            this.mammoth?.play('flick', true);
            this.mammoth?.once('animationcomplete', () => {
              if (!this.gameOver) {
                this.mammoth?.play('idle', true);
              }
            });
          }
        
          // Handle pipes only if game is not over
          for (let i = 0; i < this.pipes.length; i++) {
            const pipe = this.pipes[i];
            pipe.x -= this.getGameSpeed();
        
            // Check for collision
            if (this.checkCollision(this.mammoth, pipe)) {
              this.gameOver = true;
              // Play whacked animation first
              if (this.mammoth) {
                this.mammoth.play('whacked');
                this.mammoth.once('animationcomplete', () => {
                  if (this.mammoth) {
                    this.mammoth.play('die');
                  }
                });
              }
              setIsGameOver(true);
              if (thudRef.current) {
                thudRef.current.play();
              }
              // Stop horizontal movement
              pipe.x = pipe.x;  // Freeze pipe position
              // Optional: Add a small delay before allowing restart
              this.time.delayedCall(1000, () => {
                this.velocity = 0;  // Stop vertical movement after animation
              });
              return;  // Only return if there's a collision
            }
        
            // Only increment score if game is not over and mammoth is within bounds
            if (!this.gameOver && this.mammoth && pipe.x + pipe.width < this.mammoth.x && !pipe.getData('scored')) {
              // Only increment score for one pipe in the pair (top pipe)
              if (i % 2 === 0) {
                const previousScore = this.score;
                this.score += 10;
                if (this.scoreText) {
                  this.scoreText.setText('Score: ' + this.score);
                }
                if (previousScore < 50 && this.score >= 50) {
                  audioRef.current?.play();
                }
                setLocalScore(this.score);
                onScoreUpdate(this.score);
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
        setIsGameOver(false);
      }

      private getGameSpeed(): number {
        // Increase speed by 0.5 every 50 points, starting at 3
        return 3 + Math.floor(this.score / 50) * 0.5;
      }

      private getGapSize(): number {
        // Decrease gap size by 10 every 50 points, with a minimum of 150
        const baseGap = 250;
        const reduction = Math.floor(this.score / 50) * 10;
        return Math.max(150, baseGap - reduction);
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
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
      if (thudRef.current) {
        thudRef.current.pause();
        thudRef.current.currentTime = 0;
      }
    };
  }, []);

  return (
    <div className="game-wrapper">
      <div
        id="game-container"
        style={{ 
          border: "2px solid #333", 
          marginBottom: "20px",
          width: "600px",
          margin: "0 auto"
        }}
      ></div>
      <p className="game-instructions">
        { !isGameOver && "Press SPACE to move up! Avoid the pipes and try to get the highest score possible."}
        {isGameOver && <br />}
        {isGameOver && <span>Game Over! Press SPACE to restart.</span>}
      </p>
    </div>
  );
}