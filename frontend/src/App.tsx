import { AptosWalletProvider, AptosConnectButton } from "@razorlabs/wallet-kit";
import { WalletContent } from "./components/WalletContent";
import Scoreboard from "./components/Scoreboard";

export default function App() {
  return (
    <AptosWalletProvider>
      <div className="app-container">
        <div className="app-content">
          <div className="header">
            <h1>Movement game demo 🦣</h1>
            <AptosConnectButton />
          </div>
          <WalletContent />
          <Scoreboard />
        </div>
      </div>
    </AptosWalletProvider>
  );
}
