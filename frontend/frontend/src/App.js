import React, { useState, useEffect } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
  const [config, setConfig] = useState(null);
  const [donations, setDonations] = useState([]);
  const [form, setForm] = useState({ name: "", amount: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Load config and donations
  useEffect(() => {
    loadConfig();
    loadDonations();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/config`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setConfig(data);
      }
    } catch (err) {
      setError("Failed to load configuration. Is the backend running?");
    }
  };

  const loadDonations = async () => {
    try {
      const res = await fetch(`${API_URL}/donations`);
      const data = await res.json();
      setDonations(data.donations || []);
    } catch (err) {
      console.error("Failed to load donations:", err);
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    setError("");

    if (!account) {
      setError("Please connect your wallet first!");
      return;
    }

    if (!config) {
      setError("Configuration not loaded. Please refresh the page.");
      return;
    }

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      // Get sender's coins
      const coins = await client.getCoins({
        owner: account.address,
        coinType: "0x2::sui::SUI",
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error("No SUI coins found in wallet");
      }

      // Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
      const amountInMist = Math.floor(amount * 1_000_000_000);

      // Create transaction
      const tx = new Transaction();

      // Split coin for exact amount
      const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

      // Call donation function
      tx.moveCall({
        target: config.moveFunction,
        arguments: [
          coin,
          tx.pure.u64(amountInMist),
          tx.pure.vector("u8", Array.from(new TextEncoder().encode(form.message || ""))),
          tx.pure.address(config.charityAddress),
        ],
      });

      // Execute transaction
      const result = await signAndExecuteTransaction({
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log("✅ Transaction successful:", result);

      // Record donation in backend
      await fetch(`${API_URL}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          amount: form.amount,
          message: form.message,
          donor: account.address,
          txDigest: result.digest,
        }),
      });

      // Show success and open explorer
      alert(`✅ Donation successful!\n\nAmount: ${amount} SUI\nTX: ${result.digest}`);
      window.open(`${config.explorerUrl}/tx/${result.digest}`, "_blank");

      // Reset form and reload donations
      setForm({ name: "", amount: "", message: "" });
      loadDonations();

    } catch (err) {
      console.error("Donation failed:", err);
      setError(err.message || "Transaction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header>
          <h1>KindFund</h1>
          <p>Support our cause with SUI currency</p>
          <ConnectButton />
        </header>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {config && (
          <div className="info-box">
            <p><strong>Network:</strong> {config.network}</p>
            <p><strong>Charity Address:</strong> {config.charityAddress.slice(0, 20)}...</p>
          </div>
        )}

        <div className="donation-form">
          <h2>Make a Donation</h2>
          <form onSubmit={handleDonate}>
            <input
              type="text"
              placeholder="Your Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={loading}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount (SUI)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              disabled={loading}
            />
            <textarea
              placeholder="Message (optional)"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              disabled={loading}
              rows="3"
            />
            <button type="submit" disabled={loading || !account || !config}>
              {loading ? "Processing..." : account ? "Donate Now" : "Connect Wallet First"}
            </button>
          </form>
        </div>

        <div className="donations-list">
          <h2>Recent Donations ({donations.length})</h2>
          {donations.length === 0 ? (
            <p className="no-donations">No donations yet. Be the first! 🎉</p>
          ) : (
            <div className="donations">
              {donations.map((donation) => (
                <div key={donation.id} className="donation-card">
                  <div className="donation-header">
                    <strong>{donation.name}</strong>
                    <span className="amount">{donation.amount} SUI</span>
                  </div>
                  {donation.message && (
                    <p className="message">"{donation.message}"</p>
                  )}
                  <div className="donation-footer">
                    <span className="donor">
                      {donation.donor.slice(0, 6)}...{donation.donor.slice(-4)}
                    </span>
                    <a 
                      href={donation.explorerLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      View TX →
                    </a>
                  </div>
                  <span className="timestamp">
                    {new Date(donation.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;