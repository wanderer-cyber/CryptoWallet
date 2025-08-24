const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");

const router = express.Router();

// 🔹 Register user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed });
    await user.save();

    res.json({ message: "User created" });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// 🔹 Enable 2FA (generate secret + QR)
// Test 2FA setup without frontend
router.get("/test-2fa/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const secret = speakeasy.generateSecret({ name: "CryptoEase-Test" });

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      message: "2FA setup successful!",
      qrCodeUrl,
      secret: secret.base32
    });
  } catch (err) {
    console.error("Test 2FA Error:", err);
    res.status(500).json({ error: "Failed to setup 2FA" });
  }
});

// 🔹 Enable 2FA
router.get("/enable-2fa/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA is already enabled" });
    }

    const secret = speakeasy.generateSecret({ name: "MyApp (Demo)" });

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    console.error("Enable 2FA Error:", err);
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});

// 🔹 Disable 2FA
// Disable 2FA
router.post("/disable-2fa", async (req, res) => {
  const { userId, token } = req.body;
  const user = await User.findById(userId);

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ error: "2FA not enabled" });
  }

  // Verify the token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified) {
    return res.status(400).json({ error: "Invalid 2FA code" });
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();

  res.json({ message: "2FA disabled successfully" });
});


// GET /auth/check-2fa/:userId
router.get("/check-2fa/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ twoFactorEnabled: user.twoFactorEnabled || false });
  } catch (err) {
    console.error("Check 2FA Error:", err);
    res.status(500).json({ error: "Failed to check 2FA" });
  }
});

// 🔹 Login (Step 1 - email + password)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // If 2FA is enabled → ask for OTP
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      return res.json({
        require2FA: true,
        userId: user._id,
        message: "Enter your 2FA code",
      });
    }

    // No 2FA → login success
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ 
      token, 
      user: { 
        email: user.email,
        _id: user._id  // ✅ include _id here
      } 
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// 🔹 Verify 2FA (Step 2)
router.post("/verify-2fa", async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA not enabled" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1, // allow 30s drift
    });

    if (!verified) {
      return res.status(400).json({ error: "Invalid 2FA code" });
    }

    // Success → issue JWT
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token: jwtToken, user: { email: user.email } });
  } catch (err) {
    console.error("2FA Verification Error:", err);
    res.status(500).json({ error: "Failed to verify 2FA" });
  }
});

module.exports = router;
