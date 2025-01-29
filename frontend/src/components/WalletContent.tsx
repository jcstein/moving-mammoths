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
  const MODULE_NAME = "moving_mammoths";
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