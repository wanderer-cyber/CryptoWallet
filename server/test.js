const express = require("express");
const app = express();

app.use(express.json());

// Test with simple routes first
app.get("/", (req, res) => {
  res.json({ message: "Server working!" });
});

app.get("/test", (req, res) => {
  res.json({ message: "Test route working!" });
});

// Simple auth routes without external dependencies
const authRouter = express.Router();

authRouter.post("/register", (req, res) => {
  res.json({ message: "Register endpoint working" });
});

authRouter.post("/login", (req, res) => {
  res.json({ message: "Login endpoint working" });
});

app.use("/auth", authRouter);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Minimal server started on port ${PORT}`);
});

// Test if basic server works
console.log("If this runs without path-to-regexp error, the issue is in your route files");