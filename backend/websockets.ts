import { WebSocketServer, WebSocket } from "ws";
import { getSession, updateSession, isExpired, isSurrendered, computeSurrenderScore, MAX_MESSAGES_PER_SESSION, MAX_MESSAGE_LENGTH } from "./session-store";
import { streamCiroResponse, judgeSurrender } from "./services/ai";
import { logSession } from "./services/logger";

export const sessionWss = new WebSocketServer({ noServer: true });

sessionWss.on("connection", (ws, req) => {
  const sessionId = req.url?.split("/")[2];
  if (!sessionId) {
    ws.close();
    return;
  }

  const timer = setInterval(() => {
    const session = getSession(sessionId);
    if (!session) {
      clearInterval(timer);
      return;
    }

    if (isExpired(session)) {
      ws.send(JSON.stringify({ type: "EXPIRED" }));
      ws.close();
      clearInterval(timer);
    }
  }, 1000);

  ws.on("message", async (raw) => {
    console.log("---");
    console.log("1. WebSocket received message:", raw.toString());
    const parsed = JSON.parse(raw.toString());

    const session = getSession(sessionId);
    if (!session) {
      console.log("1a. ERROR: No session found for sessionId:", sessionId);
      return;
    }
    console.log("2. Session found:", session.sessionId);

    if (isExpired(session) || isSurrendered(session)) {
      console.log("2a. Session expired or already surrendered");
      return;
    }

    // Anti-abuse: check message length
    if (!parsed.text || typeof parsed.text !== "string" || parsed.text.trim().length === 0) {
      ws.send(JSON.stringify({ type: "ERROR", message: "Empty message" }));
      return;
    }
    if (parsed.text.length > MAX_MESSAGE_LENGTH) {
      const errMsg = session.lang === 'en'
        ? `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
        : `Messaggio troppo lungo. Massimo ${MAX_MESSAGE_LENGTH} caratteri consentiti.`;
      ws.send(JSON.stringify({ type: "ERROR", message: errMsg }));
      return;
    }

    // Anti-abuse: count only player messages already in session
    const playerMessageCount = session.messages.filter(m => m.role === "player").length;
    if (playerMessageCount >= MAX_MESSAGES_PER_SESSION) {
      const errMsg = session.lang === 'en'
        ? `Maximum number of messages reached (${MAX_MESSAGES_PER_SESSION}). Session closed.`
        : `Numero massimo di messaggi raggiunto (${MAX_MESSAGES_PER_SESSION}). Sessione terminata.`;
      ws.send(JSON.stringify({ type: "EXPIRED", message: errMsg }));
      ws.close();
      return;
    }

    const messages = [...session.messages, { role: "player" as const, text: parsed.text }];
    updateSession(sessionId, { messages });
    console.log("3. Session updated with player message, total messages:", messages.length);

    try {
      console.log("4. Calling streamCiroResponse...");
      const ciroResult = await streamCiroResponse(messages, session.lang, (token) => {
        ws.send(JSON.stringify({ type: "TOKEN", text: token }));
      });
      const responseText = ciroResult.text;
      console.log("5. streamCiroResponse finished, text length:", responseText.length);

      const updatedMessages = [...messages, { role: "bot" as const, text: responseText }];
      updateSession(sessionId, { messages: updatedMessages });
      console.log("6. Session updated with bot message, calling judgeSurrender...");

      const judgment = await judgeSurrender(updatedMessages, session.lang);
      console.log("Judgment:", judgment);
      console.log("Surrender score:", judgment.surrender);

      // accumula token per questo turno e logga
      const totalIn = ciroResult.inputTokens + judgment.inputTokens;
      const totalOut = ciroResult.outputTokens + judgment.outputTokens;
      logSession(sessionId, totalIn, totalOut);

      const freshSession = getSession(sessionId);
      if (!freshSession) return;

      const newSurrenderHistory = [...freshSession.surrenderHistory, judgment.surrender];
      const newScore = computeSurrenderScore(newSurrenderHistory);

      updateSession(sessionId, {
        surrenderScore: newScore,
        surrenderHistory: newSurrenderHistory
      });

      ws.send(JSON.stringify({
        type: "SURRENDER",
        score: newScore,
        reason: judgment.reason
      }));

      if (newScore >= 100) {
        updateSession(sessionId, { status: "won" });
        ws.send(JSON.stringify({ type: "WIN" }));
        ws.close();
      }

    } catch (error) {
      console.error("Error during message processing:", error);
      const errorMessage = session?.lang === 'en' ? "Error during processing" : "Errore durante l'elaborazione";
      ws.send(JSON.stringify({ type: "ERROR", message: errorMessage }));
    }
  });

  ws.on("close", () => {
    clearInterval(timer);
  });
});