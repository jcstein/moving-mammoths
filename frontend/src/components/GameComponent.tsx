import { useEffect, useState, useRef } from "react";
import Phaser from "phaser";

interface GameComponentProps {
  onScoreUpdate: (score: number) => void;
}

export function GameComponent({ onScoreUpdate }: GameComponentProps) {
  const [localScore, setLocalScore] = useState(0);
  const gameRef = useRef<Phaser.Game | null>(null);
  const isAnimatingRef = useRef(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    scoreRef.current = localScore;
  }, [localScore]);

  useEffect(() => {
    class GameScene extends Phaser.Scene {
      private mammoth?: Phaser.GameObjects.Sprite;
      private text?: Phaser.GameObjects.Text;

      constructor() {
        super({ key: "GameScene" });
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

        for (let i = 0; i <= 15; i++) {
          const frameNum = i.toString().padStart(3, "0");
          this.load.image(
            `whacked_${i}`,
            `/key_frames/__mammoth_whacked_${frameNum}.png`,
          );
        }
      }

      create() {
        // Create a vibrant gradient background matching the alien planet style
        const graphics = this.add.graphics();

        // Sky gradient (turquoise to lighter turquoise)
        graphics.fillGradientStyle(0x40e0d0, 0x40e0d0, 0x7fffd4, 0x7fffd4, 1);
        graphics.fillRect(0, 0, 600, 420);

        // Add sun with glow effect
        this.add.circle(500, 80, 40, 0xffffff, 0.3);
        this.add.circle(500, 80, 25, 0xffffff, 1);

        // Add distant mountains silhouette (darker turquoise)
        graphics.fillStyle(0x20b2aa);
        graphics.beginPath();
        graphics.moveTo(0, 260); // Raised mountain height
        graphics.lineTo(100, 200);
        graphics.lineTo(200, 230);
        graphics.lineTo(300, 190);
        graphics.lineTo(400, 220);
        graphics.lineTo(500, 180);
        graphics.lineTo(600, 210);
        graphics.lineTo(600, 420);
        graphics.lineTo(0, 420);
        graphics.closePath();
        graphics.fill();

        // Add decorative alien plants
        const addPlant = (x: number, y: number, scale: number) => {
          const plant = new Phaser.Geom.Circle(x, y, 15 * scale);
          graphics.fillStyle(0xff69b4); // Pink color for plants
          graphics.fillCircleShape(plant);

          // Add stem
          graphics.lineStyle(4, 0x2e8b57);
          graphics.beginPath();
          graphics.moveTo(x, y + 15 * scale);
          graphics.lineTo(x, y + 30 * scale);
          graphics.stroke();
        };

        // Add various plants at higher positions
        addPlant(50, 250, 1);
        addPlant(150, 230, 1.2);
        addPlant(400, 240, 1);
        addPlant(500, 220, 1.3);

        // Create mammoth animations
        const idleFrames = Array.from({ length: 20 }, (_, i) => ({
          key: `idle_${i}`,
        }));

        const flickFrames = Array.from({ length: 10 }, (_, i) => ({
          key: `flick_${i}`,
        }));

        const whackedFrames = Array.from({ length: 16 }, (_, i) => ({
          key: `whacked_${i}`,
        }));

        // Create the mammoth sprite - positioned higher up
        this.mammoth = this.add.sprite(300, 200, "idle_0");
        this.mammoth.setScale(0.5);

        // Create the animations
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
          key: "whacked",
          frames: whackedFrames,
          frameRate: 24,
          repeat: 0,
        });

        // Start playing idle animation
        this.mammoth.play("idle");

        this.text = this.add.text(20, 20, "Click the mammoth!", {
          fontSize: "18px",
          color: "#fff",
          stroke: "#000",
          strokeThickness: 2,
        });

        this.mammoth.setInteractive();

        const handleClick = async () => {
          if (isAnimatingRef.current) return;
          isAnimatingRef.current = true;

          const newScore = scoreRef.current + 10;
          setLocalScore(newScore);
          onScoreUpdate(newScore);

          // Play head flick animation
          this.mammoth?.play("flick");

          await new Promise((resolve) => {
            this.mammoth?.once("animationcomplete", resolve);
          });

          if (newScore >= 30) {
            this.text?.setText(`Score: ${newScore} - keep going!`);

            // Play celebration animation
            this.mammoth?.play("whacked");
            await new Promise((resolve) => {
              this.mammoth?.once("animationcomplete", resolve);
            });
          } else {
            this.text?.setText(`Score: ${newScore} - Keep going!`);
          }

          // Return to idle
          this.mammoth?.play("idle");
          isAnimatingRef.current = false;
        };

        this.mammoth.on("pointerdown", handleClick);
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: "game-container",
      width: 600,
      height: 420,
      scene: GameScene,
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
        Current Score: {localScore} / 30 required
      </div>
      <p className="game-instructions">
        Click the mammoth to add 10 points! You need 30 points to submit a
        score.
      </p>
    </div>
  );
}
