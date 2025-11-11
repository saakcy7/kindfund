const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const CHARITY_ADDRESS = process.env.CHARITY_ADDRESS || "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b";
const PACKAGE_ID = process.env.PACKAGE_ID;
const NETWORK = process.env.NETWORK || "testnet";

// In-memory storage (use database in production)
let donations = [];

// Get configuration for frontend
app.get("/api/config", (req, res) => {
  if (!PACKAGE_ID || PACKAGE_ID === "0xYOUR_PACKAGE_ID_HERE") {
    return res.status(500).json({ 
      error: "Package ID not configured. Please deploy the Move contract and update .env file." 
    });
  }

  res.json({
    charityAddress: CHARITY_ADDRESS,
    packageId: PACKAGE_ID,
    moveFunction: `${PACKAGE_ID}::donation::donate`,
    network: NETWORK,
    explorerUrl: `https://suiscan.xyz/${NETWORK}`
  });
});

// Get all donations
app.get("/api/donations", (req, res) => {
  // Sort by timestamp (newest first)
  const sortedDonations = [...donations].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  res.json({ 
    donations: sortedDonations,
    total: donations.reduce((sum, d) => sum + parseFloat(d.amount), 0),
    count: donations.length
  });
});

// Record a donation
app.post("/api/donations", (req, res) => {
  const { name, amount, message, donor, txDigest } = req.body;

  if (!name || !amount || !donor || !txDigest) {
    return res.status(400).json({ 
      error: "Missing required fields: name, amount, donor, txDigest" 
    });
  }

  const donation = {
    id: Date.now().toString(),
    name,
    amount: parseFloat(amount),
    message: message || "",
    donor,
    txDigest,
    timestamp: new Date().toISOString(),
    explorerLink: `https://suiscan.xyz/${NETWORK}/tx/${txDigest}`
  };

  donations.push(donation);
  
  console.log(`✅ New donation: ${name} donated ${amount} SUI`);
  console.log(`   TX: ${txDigest}`);
  console.log(`   Explorer: ${donation.explorerLink}`);

  res.json({ success: true, donation });
});

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "Donation App Backend Running",
    network: NETWORK,
    charityAddress: CHARITY_ADDRESS,
    packageId: PACKAGE_ID || "Not configured",
    totalDonations: donations.length,
    totalAmount: donations.reduce((sum, d) => sum + d.amount, 0)
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Donation Backend Running`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n💼 Charity Address: ${CHARITY_ADDRESS}`);
  console.log(`📦 Package ID: ${PACKAGE_ID || "⚠️  NOT CONFIGURED"}`);
  console.log(`🌐 Network: ${NETWORK}\n`);
  
  if (!PACKAGE_ID || PACKAGE_ID === "0xYOUR_PACKAGE_ID_HERE") {
    console.log("⚠️  WARNING: Update PACKAGE_ID in .env file after deploying contract!\n");
  }
});