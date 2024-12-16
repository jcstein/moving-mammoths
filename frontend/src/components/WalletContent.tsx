import { useAptosWallet, useAptosAccountBalance } from "@razorlabs/wallet-kit";
import { useState, useEffect } from "react";

export function WalletContent() {
  const wallet = useAptosWallet();
  const { balance, loading, error } = useAptosAccountBalance();
  const [signatureResult, setSignatureResult] = useState<string>("");
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    string | JSX.Element
  >("");
  const [message, setMessage] = useState("");
  const [storedMessage, setStoredMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  const MODULE_ADDRESS =
    "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
  const MODULE_NAME = "hello_world_2";
  const TESTNET_API = "https://aptos.testnet.porto.movementlabs.xyz/v1";

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}....${address.slice(-4)}`;
  };

  useEffect(() => {
    if (wallet.connected) {
      fetchMessage();
    } else {
      setStoredMessage(""); // Clear message when wallet disconnects
    }
  }, [wallet.connected]);

  const fetchMessage = async () => {
    if (!wallet.connected || !wallet.account) return;

    try {
      setIsLoadingMessage(true);
      const resourceUrl = `${TESTNET_API}/accounts/${wallet.account.address}/resource/${MODULE_ADDRESS}::${MODULE_NAME}::MessageHolder`;
      const response = await fetch(resourceUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.data && data.data.message) {
        setStoredMessage(data.data.message);
      } else {
        setStoredMessage("No message found");
      }
    } catch (error: any) {
      console.error("Error fetching data:", error.message);
      setStoredMessage("Error fetching message");
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const getExplorerLink = (hash: string) => {
    return `https://explorer.movementnetwork.xyz/txn/${hash}/userTxnOverview?network=testnet`;
  };

  const handleUpdateMessage = async () => {
    if (!wallet.connected || !message) return;

    try {
      setIsSubmitting(true);
      setTransactionStatus("Submitting transaction...");

      const payload = {
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::set_message`,
          typeArguments: [],
          functionArguments: [message],
        },
      };

      const response = await wallet.signAndSubmitTransaction(payload);

      let txHash;
      if (typeof response === "object" && response.status === "Approved") {
        txHash = response.args?.hash;
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
              className="text-blue-500 hover:text-blue-600 underline"
            >
              {txHash}
            </a>
          </>,
        );

        // Poll for transaction completion
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 2000; // 2 seconds

        const pollTransaction = async () => {
          try {
            const txResponse = await fetch(
              `${TESTNET_API}/transactions/by_hash/${txHash}`,
            );
            const txData = await txResponse.json();

            if (txData.success) {
              await fetchMessage(); // Fetch updated message
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
        message: "Hello Movement!",
        nonce: "0",
      });

      if (!result) {
        setSignatureResult("Message signing failed verification");
      } else {
        setSignatureResult("Message signed successfully!");
      }
    } catch (e) {
      console.error("signMessage failed", e);
      setSignatureResult("Error signing message");
    } finally {
      setIsSigningMessage(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        Please connect your wallet to continue
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-500">Network</h2>
          <p className="mt-1 text-sm">Movement Porto Testnet</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Address</h2>
          <p className="mt-1 text-sm">
            {wallet.account ? formatAddress(wallet.account.address) : ""}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Balance</h2>
          <div className="mt-1">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                <span className="text-sm text-gray-500">
                  Loading balance...
                </span>
              </div>
            ) : error ? (
              <div className="text-sm text-red-500">
                Error loading balance: {error.message}
              </div>
            ) : (
              <p className="text-lg font-medium">
                {balance !== undefined ? `${balance} MOVE` : "0 MOVE"}
              </p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">
            Contract Interaction
          </h2>
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a message"
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleUpdateMessage}
              disabled={isSubmitting || !message}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Update Message"}
            </button>
            {transactionStatus && (
              <p className="text-sm text-gray-600">{transactionStatus}</p>
            )}
            {storedMessage && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Stored Message:
                </h3>
                {isLoadingMessage ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-gray-500">
                      Loading message...
                    </span>
                  </div>
                ) : (
                  <p className="text-sm">{storedMessage}</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Message Signing</h2>
          <div className="mt-2 space-y-2">
            <button
              onClick={handleSignMessage}
              disabled={isSigningMessage}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isSigningMessage ? "Signing..." : "Sign Message"}
            </button>
            {signatureResult && (
              <p
                className={`text-sm ${signatureResult.includes("Error") ? "text-red-500" : "text-green-500"}`}
              >
                {signatureResult}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
