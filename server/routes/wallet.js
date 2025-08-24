const express = require("express");
const jwt = require("jsonwebtoken");
const Web3 = require("web3").default;
const axios = require("axios");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const web3 = new Web3("https://sepolia.infura.io/v3/64827a8e713f4919bf723a084a1ec1d9");
const router = express.Router();

// Middleware auth
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Create wallet
router.post("/create", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.walletAddress) {
      return res.json({
        message: "Wallet already exists",
        address: user.walletAddress,
        privateKey: user.privateKey,
      });
    }

    const account = web3.eth.accounts.create();
    user.walletAddress = account.address;
    user.privateKey = account.privateKey;
    await user.save();

    res.json({
      message: "Wallet created successfully",
      address: account.address,
      privateKey: account.privateKey,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get balance
router.get("/balance", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.walletAddress) return res.status(400).json({ error: "No wallet" });

    const balance = await web3.eth.getBalance(user.walletAddress);
    res.json({ balance: web3.utils.fromWei(balance, "ether") });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch balance", details: err.message });
  }
});

// Get ETH price
router.get("/price", async (req, res) => {
  try {
    const { coins, currency = "usd" } = req.query;
    if (!coins) return res.status(400).json({ error: "Please provide coins" });

    const coinList = coins.split(",").map(c => c.trim().toLowerCase());
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinList.join(",")}&vs_currencies=${currency}`
    );

    const foundCoins = Object.keys(data);
    const missingCoins = coinList.filter(c => !foundCoins.includes(c));

    res.json({
      prices: data,
      missing: missingCoins.length ? missingCoins : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch coin prices", details: err.message });
  }
});

// Send transaction
router.post("/send", auth, async (req, res) => {
  const { toAddress, amount, privateKey } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user.walletAddress) return res.status(400).json({ error: "Wallet not created" });

    const sender = web3.eth.accounts.privateKeyToAccount(privateKey);
    if (sender.address.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: "Invalid private key" });
    }

    const nonce = await web3.eth.getTransactionCount(user.walletAddress, "latest");
    const tx = {
      to: toAddress,
      value: web3.utils.toWei(amount, "ether"),
      gas: 21000,
      nonce,
      chainId: 11155111,
    };

    const signed = await sender.signTransaction(tx);
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

    await Transaction.create({
      userId: user._id,
      from: user.walletAddress,
      to: toAddress,
      amount,
      txHash: receipt.transactionHash,
    });

    res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    res.status(500).json({ error: "Transaction failed", details: err.message });
  }
});

// Transaction history
router.get("/history", auth, async (req, res) => {
  try {
    const history = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history", details: err.message });
  }
});

module.exports = router;