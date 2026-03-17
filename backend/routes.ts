import { createSession, updateSession } from "./session-store";
import { Router } from "express";

export const router = Router();

router.post("/session/start", (req, res) => {
    const session = createSession(req.body.playerName);
    res.json({ sessionId: session.sessionId });
});

router.post("/session/winner", (req, res) => {
    updateSession(req.body.sessionId, { status: "won" });
    res.json({ message: "Hai vinto!" });
});

router.use((req, res) => {
    res.json({ message: "404 not found" });
});
