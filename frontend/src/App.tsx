import { AptosWalletProvider, AptosConnectButton } from "@razorlabs/wallet-kit";
import { WalletContent } from "./components/WalletContent";

export default function App() {
  return (
    <AptosWalletProvider>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Aptos Wallet Demo</h1>
            <AptosConnectButton />
          </div>
          <WalletContent />
        </div>
      </div>
    </AptosWalletProvider>
  );
}
