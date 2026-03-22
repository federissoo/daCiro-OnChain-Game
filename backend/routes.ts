import { Router } from "express";
import { type Address, type Hex, getAddress, isAddress, isHash } from "viem";
import { createSession, getSession, updateSession } from "./session-store";
import { signVictory } from "./services/signer";
import { verifyTransaction } from "./services/blockchain";

export const router = Router();

router.post("/session/start", async (req, res) => {
  const lang = req.body.lang === "en" ? "en" : "it";
  const walletAddress = req.body.playerName as string | undefined;
  const txHash = req.body.txHash as string | undefined;

  if (!walletAddress || !isAddress(walletAddress)) {
    return res.status(400).json({ message: "Invalid wallet address" });
  }

  if (!txHash || !isHash(txHash)) {
    return res.status(400).json({ message: "Invalid transaction hash" });
  }

  try {
    const verification = await verifyTransaction(txHash as Hex, walletAddress as Address);
    if (!verification.ok) {
      return res.status(400).json({ message: verification.reason ?? "Transaction verification failed" });
    }

    const session = createSession(getAddress(walletAddress), lang);
    return res.json({ sessionId: session.sessionId });
  } catch (error) {
    console.error("Error during /session/start verification:", error);
    return res.status(500).json({ message: "Unable to verify onchain transaction" });
  }
});

router.post("/session/claim", async (req, res) => {
  const sessionId = req.body.sessionId as string | undefined;
  const walletAddress = req.body.walletAddress as string | undefined;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }

  if (!walletAddress || !isAddress(walletAddress)) {
    return res.status(400).json({ message: "Invalid wallet address" });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (session.status !== "won") {
    return res.status(400).json({ message: "Session is not eligible for claim" });
  }

  const normalizedWallet = getAddress(walletAddress);
  if (getAddress(session.playerName as Address) !== normalizedWallet) {
    return res.status(403).json({ message: "Wallet does not match session owner" });
  }

  try {
    const signedPayload = await signVictory(sessionId, normalizedWallet);
    return res.json(signedPayload);
  } catch (error) {
    console.error("Error during /session/claim signing:", error);
    return res.status(500).json({ message: "Unable to sign claim" });
  }
});

router.post("/session/winner", (req, res) => {
  const session = getSession(req.body.sessionId);
  updateSession(req.body.sessionId, { status: "won" });
  const message = session?.lang === "en" ? "You won!" : "Hai vinto!";
  res.json({ message });
});

router.use((req, res) => {
  res.json({ message: "404 not found" });
});
