import { useEffect, useState } from 'react';
import Phaser from 'phaser';

interface GameComponentProps {
  onScoreUpdate: (score: number) => void;
  onMessageUpdate: (message: string) => void; // New prop
}

export function GameComponent({ onScoreUpdate, onMessageUpdate }: GameComponentProps) {
  const [localScore, setLocalScore] = useState(0);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 400,
      height: 300,
      backgroundColor: '#2d2d2d',
      scene: {
        create: function() {
          const text = this.add.text(100, 100, 'Click = +10 🦣!', {
            fontSize: '32px',
            color: '#fff'
          });
          
          text.setInteractive();
          
          text.on('pointerdown', () => {
            const newScore = localScore + 10;
            setLocalScore(newScore);
            onScoreUpdate(newScore);

            if (newScore >= 30) {
              text.setText(`Score: ${newScore} 🦣`);
              onMessageUpdate(`Score: ${newScore} 🦣`);
            } else {
              text.setText(`Score: ${newScore}`);
            }
          });
        }
      }
    };

    try {
      const game = new Phaser.Game(config);
      
      return () => {
        game.destroy(true);
      };
    } catch (error) {
      console.error('Error initializing Phaser:', error);
    }
  }, [onScoreUpdate, onMessageUpdate, localScore]);

  return (
    <div className="game-wrapper">
      <div id="game-container" style={{ border: '2px solid #333', marginBottom: '20px' }}></div>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        Current Score: {localScore} / 30 required
      </div>
      <p className="game-instructions">
        Click the text to add 10 🦣! You need 30 🦣 to submit a message.
      </p>
    </div>
  );
}