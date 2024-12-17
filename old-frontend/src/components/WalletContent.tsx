import { useAptosWallet, useAptosAccountBalance } from "@razorlabs/wallet-kit";
import { useState, useEffect } from "react";

export function WalletContent() {
  const wallet = useAptosWallet();
  const { balance, loading, error, refetch } = useAptosAccountBalance();
  const [transactionStatus, setTransactionStatus] = useState<string | JSX.Element>("");
  const [message, setMessage] = useState("");
  const [storedMessage, setStoredMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [signatureResult, setSignatureResult] = useState<string>("");
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [isMessageSigned, setIsMessageSigned] = useState(false);

  const MODULE_ADDRESS =
    "0xe69c0875d4e04984cfc02b661d2d61fd12a2835347703b0a21efefab40fd2198";
  const MODULE_NAME = "hello_world_2";
  const TESTNET_API = "https://aptos.testnet.bardock.movementlabs.xyz/v1";

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}....${address.slice(-4)}`;
  };

  useEffect(() => {
    if (wallet.connected) {
      fetchMessage();
    } else {
      setStoredMessage("");
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
      setStoredMessage("Error fetching message. Have you posted yet?");
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const getExplorerLink = (hash: string) => {
    return `https://explorer.movementnetwork.xyz/txn/${hash}/userTxnOverview?network=bardock+testnet`;
  };

  const getAddressExplorerLink = (address: string) => {
    return `https://explorer.movementnetwork.xyz/account/${address}?network=bardock+testnet`;
  };

  const handleUpdateMessage = async () => {
    if (!wallet.connected || !message || !isMessageSigned) return;

    try {
      setIsSubmitting(true);
      setTransactionStatus("Submitting transaction...");
  
      const payload = {
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::set_message`,
          typeArguments: [],
          functionArguments: [message],
        },
      } as any;

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
              className="explorer-link"
            >
              {txHash}
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
    if (!wallet.connected || !wallet.account) return;
  
    try {
      setIsSigningMessage(true);
      const result = await wallet.signMessage({
        message: `Sign in to play with ${wallet.account.address}! 🦣`,
        nonce: "0",
      });
  
      if (!result) {
        setSignatureResult("Message signing failed verification");
        setIsMessageSigned(false);
      } else {
        setSignatureResult("Message signed successfully!");
        setIsMessageSigned(true);
      }
    } catch (e) {
      console.error("signMessage failed", e);
      setSignatureResult("Error signing in, anon");
    } finally {
      setIsSigningMessage(false);
    }
  };

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
        <div className="account-details">
          <div className="wallet-section">
            <h2 className="section-title">Network</h2>
            <p className="section-text">Bardock Testnet</p>
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
              ) : ""}
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
                  Error loading balance: {error.message}
                </div>
              ) : (
                <p className="balance-text">
                  {balance !== undefined
                    ? `${(Number(balance) / 100000000).toFixed(8)} MOVE`
                    : "0 MOVE"}
                </p>
              )}
              <h2 className="section-title">Sign in to post</h2>
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
                  className={`signature-result ${signatureResult.includes("Error") ? "error" : "success"}`}
                >
                  {signatureResult}
                </p>
              )}
            </div>
            </div>
          </div>

          <div className="wallet-section">
            <div className="interaction-container">
              <h2 className="section-title">Your Move Message Board</h2>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message"
                className={`message-input ${!isMessageSigned ? "disabled" : ""}`}
                disabled={!isMessageSigned}
              />
              <button
                onClick={handleUpdateMessage}
                disabled={isSubmitting || !message || !isMessageSigned}
                className={`submit-button ${isSubmitting || !isMessageSigned ? "disabled" : ""}`}
              >
                {isSubmitting ? "Submitting..." : "Submit Message"}
              </button>
              {transactionStatus && (
                <p className="transaction-status">{transactionStatus}</p>
              )}
              {storedMessage && (
                <div className="stored-message-container">
                  <h3 className="section-subtitle">Latest Message:</h3>
                  {isLoadingMessage ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <span className="loading-text">Loading message...</span>
                    </div>
                  ) : (
                    <p className="stored-message">{storedMessage}</p>
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