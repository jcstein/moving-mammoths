# Building a Movement Network Game: Moving Mammoths Tutorial

This tutorial will guide you through building a Flappy Bird-style game using Movement Network, React, and Phaser. The game features a mammoth that players control to avoid obstacles while collecting points.

## Prerequisites

- Node.js installed
- Basic knowledge of TypeScript and React
- Movement Network wallet (like Petra)

## Part 1: Project Setup

1. Create a new project using Vite:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

2. Install the necessary dependencies:

```bash
npm install @razorlabs/wallet-kit phaser @aptos-labs/ts-sdk @mysten/sui
npm install -D typescript @types/react @types/react-dom
```

3. Set up the project structure:

```
frontend/
├── public/
│   ├── background/
│   ├── key_frames/
│   ├── midground/
│   ├── plants/
│   └── sounds/
├── src/
│   ├── components/
│   ├── styles/
│   └── main.tsx
```

## Part 2: Setting Up the Movement Smart Contract

1. Create a new Move module for the game. Reference the contract code here:

```move
module hello_world_6::hello_world_6 {
    use std::string;
    use std::signer;
    use std::vector;

    // Score entry struct
    struct ScoreEntry has store, copy, drop {
        player: address,
        score: u64,
        message: string::String,
    }

    // Scoreboard struct to store all scores
    struct Scoreboard has key {
        scores: vector<ScoreEntry>,
        max_entries: u64,
    }

    // Individual player's score holder
    struct MessageHolder has key {
        message: string::String,
        score: u64,
    }

    const MAX_SCOREBOARD_ENTRIES: u64 = 10;
    const E_SCORE_TOO_LOW: u64 = 1;
    const MIN_SCORE: u64 = 30;

    fun init_module(account: &signer) {
        move_to(account, Scoreboard {
            scores: vector::empty<ScoreEntry>(),
            max_entries: MAX_SCOREBOARD_ENTRIES,
        });
    }

    public entry fun set_message_and_score(
        account: &signer,
        message: string::String,
        score: u64
    ) acquires MessageHolder, Scoreboard {
        assert!(score >= MIN_SCORE, E_SCORE_TOO_LOW);

        let account_addr = signer::address_of(account);
        let score_entry = ScoreEntry {
            player: account_addr,
            score,
            message: copy message,
        };

        // Update or create player's score
        if (!exists<MessageHolder>(account_addr)) {
            move_to(account, MessageHolder {
                message: copy message,
                score
            });
        } else {
            let holder = borrow_global_mut<MessageHolder>(account_addr);
            holder.message = copy message;
            holder.score = score;
        };

        // Update scoreboard
        let scoreboard = borrow_global_mut<Scoreboard>(@0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198);
        update_scoreboard(&mut scoreboard.scores, score_entry);
    }

    fun update_scoreboard(scores: &mut vector<ScoreEntry>, new_entry: ScoreEntry) {
        let len = vector::length(scores);

        // If empty or lowest score, just append if there's space
        if (len == 0 || (len < MAX_SCOREBOARD_ENTRIES && new_entry.score <= vector::borrow(scores, len - 1).score)) {
            vector::push_back(scores, new_entry);
            return
        };

        // Find correct position to insert
        let i = 0u64;
        while (i < len) {
            if (new_entry.score > vector::borrow(scores, i).score) {
                break
            };
            i = i + 1;
        };

        // Insert at correct position if within max entries
        if (i < MAX_SCOREBOARD_ENTRIES) {
            vector::push_back(scores, new_entry); // Temporarily add to end
            let j = vector::length(scores) - 1;
            while (j > i) {
                vector::swap(scores, j, j - 1);
                j = j - 1;
            };
            // Remove last element if we exceeded max entries
            if (vector::length(scores) > MAX_SCOREBOARD_ENTRIES) {
                vector::pop_back(scores);
            };
        };
    }

    #[view]
    public fun get_player_score(account_addr: address): (string::String, u64) acquires MessageHolder {
        if (!exists<MessageHolder>(account_addr)) {
            return (string::utf8(b"No score set"), 0)
        };
        let holder = borrow_global<MessageHolder>(account_addr);
        (holder.message, holder.score)
    }

    #[view]
    public fun get_scoreboard_entries(): vector<ScoreEntry> acquires Scoreboard {
        let board = borrow_global<Scoreboard>(@0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198);
        *&board.scores
    }
}
```

2. Deploy the contract to Movement Network's testnet:

```bash
# Navigate to the move directory
cd move

# Copy the example config
cp .movement.example/.config.yaml.example .movement/config.yaml
```

3. Edit `.movement/config.yaml` and add your private key, public key and account address. You can get these from your Movement wallet.

4. Compile and deploy the contract:

```bash
# Compile the contract
movement move compile

# Deploy to testnet
movement move publish
```

5. After successful deployment, you'll receive a contract address. Update the following files with your deployed contract address:

- In `frontend/src/components/WalletContent.tsx`:
```typescript
const MODULE_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

- In `move/Move.toml`:
```toml
[addresses]
hello_world_6 = "YOUR_DEPLOYED_CONTRACT_ADDRESS"
```

The original config file location can be referenced at:
```yaml:.movement.example/.config.yaml.example
startLine: 1
endLine: 9
```

The WalletContent.tsx location where the address needs to be updated can be found at:
```typescript:frontend/src/components/WalletContent.tsx
startLine: 22
endLine: 24
```

And the Move.toml location can be found at:
```move/Move.toml
startLine: 6
endLine: 7
```

## Part 3: Building the Game Components

1. Create the main App component:

```tsx
import { AptosWalletProvider, AptosConnectButton } from "@razorlabs/wallet-kit";
import { useState } from "react";
import { WalletContent } from "./components/WalletContent";
import Scoreboard from "./components/Scoreboard";

export default function App() {
  const [activeTab, setActiveTab] = useState("game");

  return (
    <AptosWalletProvider>
      <div className="app-container">
        <div className="app-content">
          <div className="header">
            <h1>Moving mammoths 🦣</h1>
            <AptosConnectButton />
          </div>
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === "game" ? "active" : ""}`} 
              onClick={() => setActiveTab("game")}
            >
              Game
            </button>
            <button 
              className={`tab-button ${activeTab === "scoreboard" ? "active" : ""}`} 
              onClick={() => setActiveTab("scoreboard")}
            >
              Scoreboard
            </button>
          </div>
          {activeTab === "game" && <WalletContent />}
          {activeTab === "scoreboard" && <Scoreboard />}
        </div>
      </div>
    </AptosWalletProvider>
  );
}
```

2. Create the game component that uses Phaser. The key parts include:

- Setting up the game scene
- Creating the mammoth sprite
- Handling collisions
- Managing score

Reference the full implementation:

```tsx
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
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
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
          height: "420px",
          margin: "0 auto",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden"
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
```

3. Create the scoreboard component to display high scores:

```tsx
import { useState, useEffect } from "react";
import '../styles/scoreboard.css'

interface Score {
  player: string;
  score: number;
  message: string;
}

interface ScoreboardData {
  data: {
    scores: Score[];
  };
}

const Scoreboard = () => {
  const [scores, setScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const MODULE_ADDRESS = "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
  const MODULE_NAME = "hello_world_6";
  const TESTNET_API = "https://aptos.testnet.porto.movementlabs.xyz/v1";

  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getAddressExplorerLink = (address: string): string => {
    return `https://explorer.movementnetwork.xyz/account/${address}?network=testnet`;
  };

  useEffect(() => {
    const fetchScoreboard = async () => {
      try {
        const response = await fetch(
          `${TESTNET_API}/accounts/${MODULE_ADDRESS}/resource/${MODULE_ADDRESS}::${MODULE_NAME}::Scoreboard`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ScoreboardData;
        if (data?.data?.scores) {
          const sortedScores = [...data.data.scores].sort(
            (a, b) => b.score - a.score
          );
          setScores(sortedScores);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error fetching scoreboard:", err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScoreboard();
  }, []);
  if (isLoading) {
    return (
      <div className="scoreboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span className="loading-text">Loading scoreboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scoreboard-container">
        <div className="error-message">Error loading scoreboard: {error}</div>
      </div>
    );
  }

  return (
    <div className="scoreboard-container">
      <div className="scoreboard-header">
        <h2 className="scoreboard-title">🏆 Top Mammoths</h2>
      </div>
      <div className="scoreboard-content">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr key={index} className={`rank-${index + 1}`}>
                <td className="rank-cell">{index + 1}</td>
                <td className="address-cell">
                  <a
                    href={getAddressExplorerLink(score.player)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    {formatAddress(score.player)}
                  </a>
                </td>
                <td className="score-cell">{score.score} 🦣</td>
                <td className="name-cell">{score.message}</td>
              </tr>
            ))}
            {scores.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-message">
                  No scores yet. Be the first to move the mammoth! 🦣
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Scoreboard;
```

## Part 4: Implementing Wallet Integration

1. Create the WalletContent component to handle wallet connections and transactions:

```tsx
import { useAptosWallet, useAptosAccountBalance } from "@razorlabs/wallet-kit";
import { useState, useEffect } from "react";
import { GameComponent } from "./GameComponent";
import glassybellSound from '/glassy-bell.wav'
export function WalletContent() {
  const wallet = useAptosWallet();
  const { balance, loading, error, refetch } = useAptosAccountBalance();
  const [signatureResult, setSignatureResult] = useState<string>("");
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    string | JSX.Element
  >("");
  const [message, setMessage] = useState("");
  const [storedMessage, setStoredMessage] = useState("");
  const [storedScore, setStoredScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [isMessageSigned, setIsMessageSigned] = useState(false);

  const MODULE_ADDRESS =
    "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
  const MODULE_NAME = "hello_world_6";
  const TESTNET_API = "https://aptos.testnet.porto.movementlabs.xyz/v1";

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}....${address.slice(-4)}`;
  };

  // Check localStorage when wallet connects
  useEffect(() => {
    const checkStoredSignature = () => {
      if (wallet.connected && wallet.account?.address) {
        const storedSignature = localStorage.getItem(`signature_state_${wallet.account.address}`);
        if (storedSignature === 'true') {
          setIsMessageSigned(true);
          setSignatureResult("Message signed successfully!");
        }
      }
    };

    checkStoredSignature();
    if (wallet.connected) {
      fetchMessage();
    } else {
      setStoredMessage("");
      setStoredScore(0);
      setIsMessageSigned(false);
      setSignatureResult("");
    }
  }, [wallet.connected, wallet.account?.address]);
  const handleScoreUpdate = (score: number) => {
    setGameScore(score);
  };

  const fetchMessage = async () => {
    if (!wallet.connected || !wallet.account) return;

    try {
      setIsLoadingMessage(true);

      // Fetch user's score
      const resourceUrl = `${TESTNET_API}/accounts/${wallet.account.address}/resource/${MODULE_ADDRESS}::${MODULE_NAME}::MessageHolder`;
      const response = await fetch(resourceUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.data) {
        setStoredMessage(data.data.message);
        setStoredScore(data.data.score);
      } else {
        setStoredMessage("No message found");
        setStoredScore(0);
      }

    } catch (error: any) {
      console.error("Error fetching data:", error.message);
      setStoredMessage("Error fetching message. have you played, anon?");
      setStoredScore(0);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const getExplorerLink = (hash: string) => {
    return `https://explorer.movementnetwork.xyz/txn/${hash}/userTxnOverview?network=testnet`;
  };

  const getAddressExplorerLink = (address: string) => {
    return `https://explorer.movementnetwork.xyz/account/${address}?network=testnet`;
  };
  const handleUpdateMessage = async () => {
    if (!wallet.connected || !message || !isMessageSigned) return;
    if (gameScore < 50) {
      setTransactionStatus(
        "You need to score at least 50 🦣 to submit a score!",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setTransactionStatus("Submitting transaction...");

      const payload = {
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::set_message_and_score`,
          typeArguments: [],
          functionArguments: [message, gameScore.toString()],
        },
      } as any;

      const response = await wallet.signAndSubmitTransaction(payload);

      let txHash;
      if (typeof response === "object" && response.status === "Approved") {
        txHash = response.args?.hash;

        // Play the ding sound on successful submission
        const dingAudio = new Audio(glassybellSound);
        dingAudio.play();
      }

      if (txHash) {
        const explorerLink = getExplorerLink(txHash);
        setTransactionStatus(
          <>
            Transaction submitted. View on explorer:{" "}
            <a
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              {txHash.slice(0, 6)}...{txHash.slice(-4)}
            </a>
          </>,
        );

        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 2000;

        const pollTransaction = async () => {
          try {
            const txResponse = await fetch(
              `${TESTNET_API}/transactions/by_hash/${txHash}`,
            );
            const txData = await txResponse.json();

            if (txData.success) {
              await fetchMessage();
              await refetch();
              return true;
            }
          } catch (error) {
            console.error("Error polling transaction:", error);
          }

          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(pollTransaction, pollInterval);
          }
        };

        setTimeout(pollTransaction, pollInterval);
        setMessage("");
      }
    } catch (error: any) {
      console.error("Transaction error:", error.message);
      setTransactionStatus(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignMessage = async () => {
    if (!wallet.account) return;

    try {
      setIsSigningMessage(true);
      const result = await wallet.signMessage({
        message: `Sign in to play with ${wallet.account.address}! 🦣`,
        nonce: "0",
      });

      if (!result) {
        setSignatureResult("Message signing failed verification");
        setIsMessageSigned(false);
        localStorage.removeItem(`signature_state_${wallet.account.address}`);
      } else {
        setSignatureResult("Message signed successfully!");
        setIsMessageSigned(true);
        localStorage.setItem(`signature_state_${wallet.account.address}`, 'true');
      }
    } catch (e) {
      console.error("signMessage failed", e);
      setSignatureResult("Error signing in, anon");
      if (wallet.account?.address) {
        localStorage.removeItem(`signature_state_${wallet.account.address}`);
      }
    } finally {
      setIsSigningMessage(false);
    }
  };

  // Add cleanup for wallet disconnection
  useEffect(() => {
    return () => {
      if (!wallet.connected && wallet.account?.address) {
        localStorage.removeItem(`signature_state_${wallet.account.address}`);
      }
    };
  }, [wallet.connected, wallet.account?.address]);
  if (!wallet.connected) {
    return (
      <div className="wallet-connect-prompt">
        Please connect your wallet to continue
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <div className="wallet-content">
        <div className="game-container">
          <div className="wallet-section">
            {isMessageSigned && (
              <GameComponent
                onScoreUpdate={handleScoreUpdate}
              />
            )}
            <p className="game-requirement">
              {!isMessageSigned
                ? "Sign the message to unlock the game and score submission!"
                : gameScore < 50
                  ? `Score ${50 - gameScore} more 🦣 to unlock score submission!`
                  : "Score submission unlocked! 🎉"}
            </p>
          </div>
        </div>

        <div className="account-details">
          <div className="wallet-section">
            <h2 className="section-title">Network</h2>
            <p className="section-text">Porto Testnet</p>
          </div>

          <div className="wallet-section">
            <h2 className="section-title">Address</h2>
            <p className="section-text">
              {wallet.account ? (
                <a
                  href={getAddressExplorerLink(wallet.account.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  {formatAddress(wallet.account.address)}
                </a>
              ) : (
                ""
              )}
            </p>
          </div>
          <div className="wallet-section">
            <h2 className="section-title">Balance</h2>
            <div className="balance-container">
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <span className="loading-text">Loading balance...</span>
                </div>
              ) : error ? (
                <div className="error-message">
                  Error loading balance:{" "}
                  {error instanceof Error ? error.message : "Unknown error"}
                </div>
              ) : (
                <p className="balance-text">
                  {balance !== undefined
                    ? `${(Number(balance) / 100000000).toFixed(8)} MOVE`
                    : "0 MOVE"}
                </p>
              )}
            </div>
            {!isMessageSigned && (
              <>
                <h2 className="section-title">🔒 Sign in to play</h2>
                <div className="signing-container">
                  <button
                    onClick={handleSignMessage}
                    disabled={isSigningMessage}
                    className={`sign-button ${isSigningMessage ? "disabled" : ""}`}
                  >
                    {isSigningMessage ? "Signing..." : "Sign Message"}
                  </button>
                  {signatureResult && (
                    <p
                      className={`signature-result ${
                        signatureResult.includes("Error") ? "error" : "success"
                      }`}
                    >
                      {signatureResult}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="wallet-section">
            <div className="interaction-container">
              <h2 className="section-title">Score submission</h2>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your name"
                className="message-input"
                disabled={isSubmitting || !isMessageSigned || gameScore < 50}
                maxLength={20}
              />
              <button
                onClick={handleUpdateMessage}
                disabled={isSubmitting || !message.trim() || gameScore < 50}
                className={`submit-button ${
                  isSubmitting || gameScore < 50 ? "disabled" : ""
                }`}
              >
                {isSubmitting ? "Submitting..." : "Update score"}
              </button>
              {transactionStatus && (
                <p className="transaction-status">{transactionStatus}</p>
              )}
              {storedMessage && (
                <div className="stored-message-container">
                  {isLoadingMessage ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <span className="loading-text">Loading score...</span>
                    </div>
                  ) : (
                    <>
                      <p className="stored-message">Name: {storedMessage}</p>
                      <p className="stored-score">
                        Last score: {storedScore} 🦣
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

2. Add wallet styling:

```css
.wallet-connect-prompt {
    text-align: center;
    padding: 1rem;
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.wallet-container {
    background-color: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.wallet-content {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    justify-content: center;
    max-width: 1200px;
    margin: 0 auto;
}

.wallet-section {
    margin-bottom: 0.75rem;
    flex: 1;
}

.game-container {
    flex: 2;
}

.account-details {
    flex: 1;
}

.section-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 0.25rem;
}

.section-text {
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.loading-container {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid #3b82f6;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.error-message {
    font-size: 0.875rem;
    color: #ef4444;
}

.balance-text {
    font-size: 1.125rem;
    font-weight: 500;
}

.interaction-container {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.5rem;
}

.message-input {
    width: 100%;
    padding: 0.5rem;
    text-align: center;
    background: transparent;
    font-size: 0.875rem;
    color: inherit;
    font-family: "Press Start 2P", sans-serif;
}

.message-input:focus {
    outline: none;
    box-shadow: none;
}

.submit-button {
    background-color: #10b981;
    color: white;
}

.submit-button:hover:not(.disabled) {
    background-color: #059669;
}

.sign-button {
    background-color: #3b82f6;
    color: white;
}

.sign-button:hover:not(.disabled) {
    background-color: #2563eb;
}

.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.explorer-link {
    color: #3b82f6;
    text-decoration: underline;
}

.explorer-link:hover {
    color: #2563eb;
}

.signature-result {
    font-size: 0.875rem;
    margin-top: 0.375rem;
}

.signature-result.success {
    color: #10b981;
}

.signature-result.error {
    color: #ef4444;
}

.stored-message {
    font-size: 0.875rem;
    word-break: break-all;
}

#root {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1rem;
    text-align: center;
}

.app-container {
    min-height: 100vh;
    background-color: #f3f4f6;
    padding: 1rem;
}

.app-content {
    max-width: 64rem;
    margin: 0 auto;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.header h1 {
    font-size: 1.5rem;
    font-weight: bold;
}

:root {
    --wallet-picker-width: 320px;
    --wallet-picker-height: 400px;
}

[data-testid="wallet-modal"] {
    background-color: #ffffff !important;
    border-radius: 8px !important;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
}

[data-testid="wallet-option"] {
    padding: 0.75rem !important;
    border-radius: 6px !important;
    transition: background-color 0.2s !important;
}

[data-testid="wallet-option"]:hover {
    background-color: #f3f4f6 !important;
}

.transaction-status {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.375rem;
}

.balance-container {
    margin-top: 0.375rem;
}

.section-content {
    background-color: #f8fafc;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-top: 0.375rem;
}

.stored-message-container .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 0.375rem;
}

@media (prefers-color-scheme: dark) {
    .wallet-connect-prompt,
    .wallet-container {
        background-color: #1a1a1a;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .section-content {
        background-color: #2a2a2a;
    }

    .message-input {
        background-color: #2a2a2a;
        border-color: #404040;
        color: #ffffff;
    }

    .message-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .section-title,
    .section-text,
    .loading-text,
    .transaction-status,
    .stored-message {
        color: #e5e7eb;
    }

    [data-testid="wallet-modal"] {
        background-color: #1a1a1a !important;
    }

    [data-testid="wallet-option"]:hover {
        background-color: #2a2a2a !important;
    }

    .app-container {
        background-color: #1a1a1a;
    }

    .balance-text {
        color: #e5e7eb;
    }

    .explorer-link {
        color: #60a5fa;
    }

    .explorer-link:hover {
        color: #3b82f6;
    }

    .submit-button {
        background-color: #059669;
    }

    .submit-button:hover:not(.disabled) {
        background-color: #047857;
    }

    .sign-button {
        background-color: #3b82f6;
    }

    .sign-button:hover:not(.disabled) {
        background-color: #2563eb;
    }

    .header h1 {
        color: #e5e7eb;
    }
}

body {
    font-family: "Press Start 2P", cursive;
}

.wallet-container,
.account-details,
.game-container,
.interaction-container,
.stored-message-container {
    border: 2px solid #d1d5db; /* Light mode border color */
}

@media (prefers-color-scheme: dark) {
    .wallet-container,
    .account-details,
    .game-container,
    .interaction-container,
    .stored-message-container {
        border: 2px solid #374151; /* Dark mode border color */
    }
}
```

## Part 5: Adding Game Assets

1. Add the required assets to the public folder:

- Mammoth sprite sheets in `/key_frames`
- Background images in `/background/`
- Sound effects (footsteps, unlock, thud)

2. Configure the game to load these assets in the preload function:

```tsx
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
```

## Part 6: Game Mechanics

1. Implement core game mechanics:

- Space bar controls for the mammoth
- Collision detection with obstacles
- Score tracking
- Background parallax scrolling

2. Add sound effects and animations:

```tsx
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
```

## Part 7: Move Module Integration

1. Handle score submission:

```tsx
  const handleUpdateMessage = async () => {
    if (!wallet.connected || !message || !isMessageSigned) return;
    if (gameScore < 50) {
      setTransactionStatus(
        "You need to score at least 50 🦣 to submit a score!",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setTransactionStatus("Submitting transaction...");

      const payload = {
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::set_message_and_score`,
          typeArguments: [],
          functionArguments: [message, gameScore.toString()],
        },
      } as any;

      const response = await wallet.signAndSubmitTransaction(payload);

      let txHash;
      if (typeof response === "object" && response.status === "Approved") {
        txHash = response.args?.hash;

        // Play the ding sound on successful submission
        const dingAudio = new Audio(glassybellSound);
        dingAudio.play();
      }

      if (txHash) {
        const explorerLink = getExplorerLink(txHash);
        setTransactionStatus(
          <>
            Transaction submitted. View on explorer:{" "}
            <a
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              {txHash.slice(0, 6)}...{txHash.slice(-4)}
            </a>
          </>,
        );

        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 2000;

        const pollTransaction = async () => {
          try {
            const txResponse = await fetch(
              `${TESTNET_API}/transactions/by_hash/${txHash}`,
            );
            const txData = await txResponse.json();

            if (txData.success) {
              await fetchMessage();
              await refetch();
              return true;
            }
          } catch (error) {
            console.error("Error polling transaction:", error);
          }

          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(pollTransaction, pollInterval);
          }
        };

        setTimeout(pollTransaction, pollInterval);
        setMessage("");
      }
    } catch (error: any) {
      console.error("Transaction error:", error.message);
      setTransactionStatus(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
```

2. Add scoreboard fetching:

```tsx
  useEffect(() => {
    const fetchScoreboard = async () => {
      try {
        const response = await fetch(
          `${TESTNET_API}/accounts/${MODULE_ADDRESS}/resource/${MODULE_ADDRESS}::${MODULE_NAME}::Scoreboard`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ScoreboardData;
        if (data?.data?.scores) {
          const sortedScores = [...data.data.scores].sort(
            (a, b) => b.score - a.score
          );
          setScores(sortedScores);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error fetching scoreboard:", err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScoreboard();
  }, []);
```

## Testing and Deployment

1. Test locally:

```bash
npm run dev
```

2. Build for production:

```bash
npm run build
```

3. Deploy to your preferred hosting platform (e.g., Vercel).

## Key Features to Note

- The game requires wallet connection to play
- Scores above 50 can be submitted to the blockchain
- The scoreboard shows top players
- Sound effects and animations enhance gameplay
- Responsive design with dark mode support

## Conclusion

This tutorial covered the basics of building a blockchain game using Movement Network. The complete implementation includes additional features like:

- Adaptive difficulty
- Parallax scrolling backgrounds
- Sound management
- Score persistence
- Leaderboard functionality

For the complete implementation, refer to the provided code blocks and customize as needed for your project.
