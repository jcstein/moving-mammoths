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