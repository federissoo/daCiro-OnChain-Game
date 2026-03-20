import { createSession, updateSession, getSession } from "./session-store";
import { Router } from "express";

export const router = Router();

router.post("/session/start", (req, res) => {
    const lang = req.body.lang === 'en' ? 'en' : 'it'; // Default a 'it' se non fornito o non valido
    const session = createSession(req.body.playerName, lang);
    res.json({ sessionId: session.sessionId });
});

router.post("/session/winner", (req, res) => {
    const session = getSession(req.body.sessionId);
    updateSession(req.body.sessionId, { status: "won" });
    const message = session?.lang === 'en' ? "You won!" : "Hai vinto!";
    res.json({ message });
});

router.use((req, res) => {
    res.json({ message: "404 not found" });
});
