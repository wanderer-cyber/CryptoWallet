const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  txHash: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "completed"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);