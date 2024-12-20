import { useState, useEffect } from "react";
import '../styles/Scoreboard.css'

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
                  No scores yet. Be the first to tame the mammoth! 🦣
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