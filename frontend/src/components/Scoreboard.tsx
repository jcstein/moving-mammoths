import { useState, useEffect } from "react";

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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MODULE_ADDRESS =
    "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
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
        if (scores.length === 0) {
          setIsInitialLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const response = await fetch(
          `${TESTNET_API}/accounts/${MODULE_ADDRESS}/resource/${MODULE_ADDRESS}::${MODULE_NAME}::Scoreboard`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ScoreboardData;
        if (data?.data?.scores) {
          const sortedScores = [...data.data.scores].sort(
            (a, b) => b.score - a.score,
          );
          setScores(sortedScores);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error("Error fetching scoreboard:", err);
        setError(errorMessage);
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isInitialLoading) {
    return (
      <div className="w-full bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <span>Loading scoreboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-lg shadow p-6">
        <div className="text-red-500">Error loading scoreboard: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">🏆 Top Mammoth Tamers</h2>
          {isRefreshing && (
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-400"></div>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Rank</th>
                <th className="p-2 text-left">Player</th>
                <th className="p-2 text-right">Score</th>
                <th className="p-2 text-left">Name</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2 font-mono">
                    <a
                      href={getAddressExplorerLink(score.player)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {formatAddress(score.player)}
                    </a>
                  </td>
                  <td className="p-2 text-right font-mono">{score.score} 🦣</td>
                  <td className="p-2">{score.message}</td>
                </tr>
              ))}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    No scores yet. Be the first to tame the mammoth! 🦣
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;