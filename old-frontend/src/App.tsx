import { AptosWalletProvider, AptosConnectButton } from "@razorlabs/wallet-kit";
import { WalletContent } from "./components/WalletContent";

export default function App() {
  return (
    <AptosWalletProvider>
      <div className="app-container">
        <div className="app-content">
          <div className="header">
            <h1>Movement read+write demo 🦣</h1>
            <AptosConnectButton />
          </div>
          <WalletContent />
        </div>
      </div>
    </AptosWalletProvider>
  );
}
