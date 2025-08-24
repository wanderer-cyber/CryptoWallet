const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// Test with auth routes only first
app.use("/auth", authRoutes);
 app.use("/wallet", walletRoutes); 

app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

const PORT = process.env.PORT || 8000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
  });
})
.catch((err) => console.error("DB connection error:", err));