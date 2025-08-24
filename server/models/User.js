const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    walletAddress: {
      type: String,
      default: null,
    },
    privateKey: {
      type: String,
      default: null,
    },

    // 2FA fields
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null, // base32 secret used by Google Authenticator
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
