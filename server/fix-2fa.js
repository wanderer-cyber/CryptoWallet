// fix-2fa.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User"); // adjust path if needed

const MONGO_URI = process.env.MONGO_URI || "YOUR_MONGO_URI_HERE";

async function reset2FA(email) {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return;
    }

    // Reset 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = "";
    await user.save();

    console.log(`2FA reset for ${email}`);
    process.exit(0);
  } catch (err) {
    console.error("Error resetting 2FA:", err);
    process.exit(1);
  }
}

// replace with your email
reset2FA("aiusage252005@gmail.com");
